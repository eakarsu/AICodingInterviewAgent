// NEW: Candidate Ranking Engine - percentile ranking + role recommendations.

const router = require('express').Router();
const pool = require('../models/db');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { parseAIJson } = require('../utils/parseAIJson');
const axios = require('axios');

router.use(auth);

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

async function callAI(prompt, systemPrompt) {
  if (!process.env.OPENROUTER_API_KEY) {
    return { success: false, error: 'OpenRouter API key not configured' };
  }
  try {
    const r = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    }, { headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}` } });
    const content = r.data.choices?.[0]?.message?.content || '';
    const parsed = parseAIJson(content);
    return { success: true, content, parsed: parsed.data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Compute composite score and percentile for all candidates
router.post('/compute', async (req, res) => {
  try {
    // Aggregate scores per candidate
    const scored = await pool.query(`
      SELECT
        c.id,
        c.experience_level,
        ROUND(AVG(i.score)::numeric, 2) AS avg_interview_score,
        COUNT(i.id)::int AS total_interviews,
        MAX(i.score) AS best_score
      FROM candidates c
      LEFT JOIN interviews i ON c.id = i.candidate_id AND i.score IS NOT NULL
      GROUP BY c.id, c.experience_level
    `);

    // Compute composite score = avg_interview_score (or 0) weighted by interview count
    const enriched = scored.rows.map(r => ({
      ...r,
      composite_score: r.avg_interview_score
        ? parseFloat(r.avg_interview_score) * Math.min(1, r.total_interviews / 5) * 10
        : 0,
    }));

    // Group by level and rank within level
    const groupsByLevel = {};
    enriched.forEach(r => {
      const lvl = r.experience_level || 'mid';
      if (!groupsByLevel[lvl]) groupsByLevel[lvl] = [];
      groupsByLevel[lvl].push(r);
    });

    let updated = 0;
    for (const lvl of Object.keys(groupsByLevel)) {
      const sorted = groupsByLevel[lvl].sort((a, b) => b.composite_score - a.composite_score);
      const total = sorted.length;
      for (let i = 0; i < sorted.length; i++) {
        const r = sorted[i];
        const rank = i + 1;
        const percentile = total > 1 ? Math.round((1 - (i / (total - 1))) * 100) : 100;
        await pool.query(`
          INSERT INTO candidate_rankings (candidate_id, experience_level, rank_in_level, percentile, composite_score, computed_at)
          VALUES ($1,$2,$3,$4,$5,NOW())
          ON CONFLICT (candidate_id) DO UPDATE
            SET experience_level = EXCLUDED.experience_level,
                rank_in_level = EXCLUDED.rank_in_level,
                percentile = EXCLUDED.percentile,
                composite_score = EXCLUDED.composite_score,
                computed_at = NOW()
        `, [r.id, lvl, rank, percentile, r.composite_score]);
        updated++;
      }
    }

    res.json({ candidates_ranked: updated, levels: Object.keys(groupsByLevel), generated_at: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get the leaderboard, paginated
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { experience_level } = req.query;

    const conditions = [];
    const params = [];
    if (experience_level) { conditions.push(`cr.experience_level = $${params.length + 1}`); params.push(experience_level); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [data, count] = await Promise.all([
      pool.query(`
        SELECT cr.*, c.name AS candidate_name, c.email AS candidate_email, c.skills
        FROM candidate_rankings cr
        JOIN candidates c ON cr.candidate_id = c.id
        ${where}
        ORDER BY cr.composite_score DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, limit, offset]),
      pool.query(`SELECT COUNT(*)::int AS total FROM candidate_rankings cr ${where}`, params),
    ]);

    res.json({
      data: data.rows,
      pagination: { page, limit, total: count.rows[0].total, totalPages: Math.ceil(count.rows[0].total / limit) },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Per-candidate ranking detail with role recommendations (AI)
router.get('/candidate/:id', async (req, res) => {
  try {
    const candidateId = parseInt(req.params.id);
    const result = await pool.query(`
      SELECT cr.*, c.name AS candidate_name, c.email AS candidate_email, c.skills, c.experience_level AS stated_level
      FROM candidate_rankings cr
      JOIN candidates c ON cr.candidate_id = c.id
      WHERE cr.candidate_id = $1
    `, [candidateId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Ranking not computed for this candidate yet' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/candidate/:id/recommend', aiRateLimiter, async (req, res) => {
  try {
    const candidateId = parseInt(req.params.id);
    const result = await pool.query(`
      SELECT cr.*, c.name AS candidate_name, c.skills, c.experience_level
      FROM candidate_rankings cr
      JOIN candidates c ON cr.candidate_id = c.id
      WHERE cr.candidate_id = $1
    `, [candidateId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Ranking not computed yet — POST /api/ranking/compute first' });
    const row = result.rows[0];

    const systemPrompt = 'You are a senior tech recruiter. Always respond with valid JSON only.';
    const prompt = `Recommend roles for this candidate.

Name: ${row.candidate_name}
Stated Skills: ${row.skills}
Experience Level: ${row.experience_level}
Composite Score: ${row.composite_score}
Rank in Level: ${row.rank_in_level}
Percentile: ${row.percentile}

Respond ONLY with valid JSON:
{
  "recommended_roles": [
    {"title": "Senior Backend Engineer", "fit_score_pct": 85, "rationale": "brief", "salary_band_usd": "$140k-$180k"}
  ],
  "fit_summary": "brief",
  "stretch_roles": ["role 1"],
  "next_actions": ["action 1"]
}`;

    const aiRes = await callAI(prompt, systemPrompt);
    if (!aiRes.success) return res.status(502).json({ error: aiRes.error });

    await pool.query(
      'UPDATE candidate_rankings SET ai_recommendations = $1 WHERE candidate_id = $2',
      [aiRes.parsed ? JSON.stringify(aiRes.parsed) : null, candidateId]
    );

    res.json({ recommendations: aiRes.parsed, raw: aiRes.content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
