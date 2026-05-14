// NEW: Skill Gap Analysis - aggregates per-skill performance and uses AI to surface gaps.

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
      max_tokens: 2048,
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    const content = r.data.choices?.[0]?.message?.content || '';
    const parsed = parseAIJson(content);
    return { success: true, content, parsed: parsed.data, parseStrategy: parsed.strategy };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// List skill assessments (paginated)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { candidate_id, skill } = req.query;

    const conditions = [];
    const params = [];
    if (candidate_id) { conditions.push(`candidate_id = $${params.length + 1}`); params.push(parseInt(candidate_id)); }
    if (skill) { conditions.push(`skill = $${params.length + 1}`); params.push(skill); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [data, count] = await Promise.all([
      pool.query(`SELECT sa.*, c.name AS candidate_name FROM skill_assessments sa LEFT JOIN candidates c ON sa.candidate_id = c.id ${where} ORDER BY sa.updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]),
      pool.query(`SELECT COUNT(*)::int AS total FROM skill_assessments ${where}`, params),
    ]);

    res.json({
      data: data.rows,
      pagination: { page, limit, total: count.rows[0].total, totalPages: Math.ceil(count.rows[0].total / limit) },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Per-candidate skill heatmap aggregated from submissions + interview categories
router.get('/heatmap/:candidate_id', async (req, res) => {
  try {
    const candidateId = parseInt(req.params.candidate_id);
    const candidate = await pool.query('SELECT * FROM candidates WHERE id = $1', [candidateId]);
    if (!candidate.rows.length) return res.status(404).json({ error: 'Candidate not found' });

    // Aggregate scores by question category
    const heatmap = await pool.query(`
      SELECT q.category AS skill,
        ROUND(AVG(cs.score)::numeric, 2) AS avg_score,
        COUNT(cs.id)::int AS attempts,
        ROUND(MIN(cs.score)::numeric, 2) AS min_score,
        ROUND(MAX(cs.score)::numeric, 2) AS max_score
      FROM code_submissions cs
      JOIN interviews i ON cs.interview_id = i.id
      JOIN questions q ON cs.question_id = q.id
      WHERE i.candidate_id = $1
      GROUP BY q.category
      ORDER BY avg_score ASC
    `, [candidateId]).catch(() => ({ rows: [] }));

    res.json({
      candidate: candidate.rows[0],
      heatmap: heatmap.rows,
      strongest: heatmap.rows[heatmap.rows.length - 1] || null,
      weakest: heatmap.rows[0] || null,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// AI-powered skill gap analysis
router.post('/analyze/:candidate_id', aiRateLimiter, async (req, res) => {
  try {
    const candidateId = parseInt(req.params.candidate_id);
    const candidate = await pool.query('SELECT * FROM candidates WHERE id = $1', [candidateId]);
    if (!candidate.rows.length) return res.status(404).json({ error: 'Candidate not found' });

    const heatmap = await pool.query(`
      SELECT q.category AS skill,
        ROUND(AVG(cs.score)::numeric, 2) AS avg_score,
        COUNT(cs.id)::int AS attempts
      FROM code_submissions cs
      JOIN interviews i ON cs.interview_id = i.id
      JOIN questions q ON cs.question_id = q.id
      WHERE i.candidate_id = $1
      GROUP BY q.category
    `, [candidateId]).catch(() => ({ rows: [] }));

    const systemPrompt = 'You are a senior tech recruiter and engineering coach. Always respond with valid JSON only.';
    const prompt = `Analyze the skill profile for this candidate and return ONLY valid JSON.

Candidate: ${candidate.rows[0].name}
Experience Level: ${candidate.rows[0].experience_level}
Stated Skills: ${candidate.rows[0].skills}
Per-Category Performance:
${JSON.stringify(heatmap.rows, null, 2)}

Respond ONLY with valid JSON:
{
  "overall_proficiency": "junior|mid|senior|staff",
  "strongest_skills": ["skill 1"],
  "weakest_skills": ["skill 1"],
  "skill_gaps": [
    {"skill": "name", "current_level": "low|mid|high", "target_level": "mid|high|expert", "study_resources": ["resource 1"], "estimated_hours_to_close": 40}
  ],
  "recommended_study_plan": ["item 1"],
  "suitable_roles": ["role 1"],
  "confidence_pct": 80
}`;

    const aiRes = await callAI(prompt, systemPrompt);
    if (!aiRes.success) return res.status(502).json({ error: aiRes.error });

    // Persist per-skill rows
    if (aiRes.parsed?.skill_gaps?.length) {
      for (const gap of aiRes.parsed.skill_gaps) {
        await pool.query(`
          INSERT INTO skill_assessments (candidate_id, skill, proficiency_score, ai_results, updated_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT DO NOTHING
        `, [candidateId, gap.skill, null, JSON.stringify(gap)]).catch(() => {});
      }
    }

    res.json({ analysis: aiRes.parsed, raw: aiRes.content, parseStrategy: aiRes.parseStrategy });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
