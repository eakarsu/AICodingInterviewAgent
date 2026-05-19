// Custom Views - 4 endpoints (2 VIZ + 2 NON-VIZ) for AI coding interview agent
// VIZ 1:    GET  /api/custom-views/difficulty-distribution  -> question difficulty distribution chart
// VIZ 2:    GET  /api/custom-views/topic-mastery-heatmap    -> topic x candidate mastery heatmap
// NON-VIZ 1:POST /api/custom-views/interview-score-report   -> interview score report (PDF-ready markdown)
// NON-VIZ 2:ALL  /api/custom-views/question-bank            -> question bank CRUD editor (problem/difficulty/topic)

const router = require('express').Router();
const pool = require('../models/db');
const auth = require('../middleware/auth');
const axios = require('axios');

router.use(auth);

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

async function synthesizeWithAI(systemPrompt, userPrompt) {
  if (!process.env.OPENROUTER_API_KEY) {
    return { success: false, error: 'OpenRouter API key not configured' };
  }
  try {
    const r = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1500,
    }, {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 45000,
    });
    return { success: true, content: r.data.choices?.[0]?.message?.content || '' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// VIZ 1: Question Difficulty Distribution Chart
// Returns counts of questions per (difficulty x category), plus totals per
// difficulty bucket — drives a stacked bar / histogram on the frontend.
// ---------------------------------------------------------------------------
router.get('/difficulty-distribution', async (req, res) => {
  try {
    const byDiff = await pool.query(`
      SELECT COALESCE(difficulty, 'unknown') AS difficulty, COUNT(*)::int AS count
      FROM questions
      GROUP BY difficulty
      ORDER BY CASE difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 WHEN 'hard' THEN 3 ELSE 4 END
    `);

    const byDiffCat = await pool.query(`
      SELECT COALESCE(difficulty, 'unknown') AS difficulty,
             COALESCE(category, 'uncategorized') AS category,
             COUNT(*)::int AS count
      FROM questions
      GROUP BY difficulty, category
      ORDER BY difficulty, category
    `);

    const usage = await pool.query(`
      SELECT COALESCE(q.difficulty, 'unknown') AS difficulty,
             COUNT(s.id)::int AS submissions,
             ROUND(AVG(s.score)::numeric, 2) AS avg_score
      FROM questions q
      LEFT JOIN submissions s ON s.question_id = q.id
      GROUP BY q.difficulty
    `).catch(() => ({ rows: [] }));

    const total = byDiff.rows.reduce((a, r) => a + r.count, 0);
    res.json({
      total_questions: total,
      buckets: byDiff.rows.map(r => ({
        difficulty: r.difficulty,
        count: r.count,
        pct: total ? Math.round((r.count / total) * 1000) / 10 : 0,
      })),
      by_difficulty_category: byDiffCat.rows,
      usage: usage.rows.map(r => ({
        difficulty: r.difficulty,
        submissions: r.submissions,
        avg_score: r.avg_score == null ? null : parseFloat(r.avg_score),
      })),
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// VIZ 2: Topic Mastery Heatmap (topic x candidate)
// Returns a matrix of average submission scores per (candidate, topic).
// ---------------------------------------------------------------------------
router.get('/topic-mastery-heatmap', async (req, res) => {
  try {
    const candidateLimit = Math.min(40, Math.max(3, parseInt(req.query.candidates) || 12));

    // Pick candidates with most submissions (or fall back to recent candidates)
    const candRows = (await pool.query(`
      SELECT c.id, c.name, c.experience_level, COUNT(s.id)::int AS submission_count
      FROM candidates c
      LEFT JOIN interviews i ON i.candidate_id = c.id
      LEFT JOIN submissions s ON s.interview_id = i.id
      GROUP BY c.id, c.name, c.experience_level
      ORDER BY submission_count DESC, c.id DESC
      LIMIT $1
    `, [candidateLimit])).rows;

    const topicRows = (await pool.query(`
      SELECT COALESCE(category, 'uncategorized') AS topic, COUNT(*)::int AS question_count
      FROM questions
      GROUP BY category
      ORDER BY question_count DESC
      LIMIT 12
    `)).rows;

    const matrixRows = (await pool.query(`
      SELECT c.id AS candidate_id,
             COALESCE(q.category, 'uncategorized') AS topic,
             ROUND(AVG(s.score)::numeric, 2) AS avg_score,
             COUNT(s.id)::int AS attempts
      FROM candidates c
      JOIN interviews i ON i.candidate_id = c.id
      JOIN submissions s ON s.interview_id = i.id
      JOIN questions q ON s.question_id = q.id
      WHERE s.score IS NOT NULL
      GROUP BY c.id, q.category
    `).catch(() => ({ rows: [] })));

    const key = (cid, topic) => `${cid}::${topic}`;
    const cell = {};
    (matrixRows.rows || []).forEach(r => {
      cell[key(r.candidate_id, r.topic)] = {
        avg_score: r.avg_score == null ? null : parseFloat(r.avg_score),
        attempts: r.attempts,
      };
    });

    // If we have no real submissions at all (fresh DB), synthesize a deterministic
    // mock layer so the heatmap renders visibly — purely for UI demo.
    const hasReal = (matrixRows.rows || []).length > 0;

    const topics = topicRows.map(t => t.topic);
    const matrix = candRows.map(c => ({
      candidate_id: c.id,
      candidate_name: c.name,
      experience_level: c.experience_level,
      cells: topics.map(t => {
        const real = cell[key(c.id, t)];
        if (real) return { topic: t, ...real, synthetic: false };
        if (hasReal) return { topic: t, avg_score: null, attempts: 0, synthetic: false };
        // deterministic synthetic value (so demo screenshot has color)
        const seed = (c.id * 31 + t.charCodeAt(0)) % 10;
        return { topic: t, avg_score: 4 + seed * 0.6, attempts: 1, synthetic: true };
      }),
    }));

    res.json({
      candidates: candRows.length,
      topics,
      matrix,
      synthetic: !hasReal,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// NON-VIZ 1: Interview Score Report (PDF-ready markdown via AI synthesis)
// Body: { interview_id?: int, candidate_id?: int }
// ---------------------------------------------------------------------------
router.post('/interview-score-report', async (req, res) => {
  try {
    const { interview_id, candidate_id } = req.body || {};
    let candidate = null;
    let interview = null;
    let subs = [];

    if (interview_id) {
      const r = await pool.query(`
        SELECT i.*, c.name AS candidate_name, c.email AS candidate_email, c.experience_level
        FROM interviews i LEFT JOIN candidates c ON i.candidate_id = c.id
        WHERE i.id = $1
      `, [interview_id]);
      if (!r.rows.length) return res.status(404).json({ error: 'Interview not found' });
      interview = r.rows[0];
      candidate = {
        id: interview.candidate_id,
        name: interview.candidate_name,
        email: interview.candidate_email,
        experience_level: interview.experience_level,
      };
      subs = (await pool.query(`
        SELECT s.*, q.title AS question_title, q.category, q.difficulty
        FROM submissions s LEFT JOIN questions q ON s.question_id = q.id
        WHERE s.interview_id = $1
        ORDER BY s.created_at
      `, [interview_id])).rows;
    } else if (candidate_id) {
      const r = await pool.query('SELECT * FROM candidates WHERE id = $1', [candidate_id]);
      if (!r.rows.length) return res.status(404).json({ error: 'Candidate not found' });
      candidate = r.rows[0];
      subs = (await pool.query(`
        SELECT s.*, q.title AS question_title, q.category, q.difficulty, i.id AS interview_id
        FROM submissions s
        JOIN interviews i ON s.interview_id = i.id
        LEFT JOIN questions q ON s.question_id = q.id
        WHERE i.candidate_id = $1
        ORDER BY s.created_at DESC LIMIT 25
      `, [candidate_id])).rows;
    } else {
      return res.status(400).json({ error: 'interview_id or candidate_id required' });
    }

    // Compute deterministic per-topic & difficulty score breakdowns
    const byTopic = {};
    const byDiff = {};
    let scored = 0;
    let scoreSum = 0;
    subs.forEach(s => {
      const sc = s.score == null ? null : parseFloat(s.score);
      if (sc != null) { scored++; scoreSum += sc; }
      if (s.category) {
        const b = (byTopic[s.category] = byTopic[s.category] || { n: 0, total: 0 });
        if (sc != null) { b.n++; b.total += sc; }
      }
      if (s.difficulty) {
        const b = (byDiff[s.difficulty] = byDiff[s.difficulty] || { n: 0, total: 0 });
        if (sc != null) { b.n++; b.total += sc; }
      }
    });
    const breakdown = {
      avg_score: scored ? Math.round((scoreSum / scored) * 100) / 100 : null,
      by_topic: Object.entries(byTopic).map(([k, v]) => ({ topic: k, attempts: v.n, avg: v.n ? Math.round((v.total / v.n) * 100) / 100 : null })),
      by_difficulty: Object.entries(byDiff).map(([k, v]) => ({ difficulty: k, attempts: v.n, avg: v.n ? Math.round((v.total / v.n) * 100) / 100 : null })),
    };

    const systemPrompt = 'You are a principal engineering hiring manager. Write a structured PDF-ready interview SCORE report in markdown. Sections: # Header, ## Overall Score, ## Breakdown by Topic, ## Breakdown by Difficulty, ## Question-by-Question, ## Strengths, ## Gaps, ## Recommendation.';
    const userPrompt = `Generate an interview SCORE report.

CANDIDATE
${JSON.stringify(candidate, null, 2)}

INTERVIEW
${interview ? JSON.stringify({ id: interview.id, status: interview.status, score: interview.score, duration_min: interview.duration_min }, null, 2) : 'Multi-interview rollup'}

SCORE BREAKDOWN
${JSON.stringify(breakdown, null, 2)}

SUBMISSIONS (${subs.length})
${JSON.stringify(subs.map(s => ({ q: s.question_title, cat: s.category, diff: s.difficulty, score: s.score, lang: s.language, time: s.time_taken_min })), null, 2)}

Return clean markdown only.`;

    const ai = await synthesizeWithAI(systemPrompt, userPrompt);

    const fallback = [
      `# Interview Score Report — ${candidate.name || 'Candidate'}`,
      ``,
      `**Email:** ${candidate.email || 'n/a'}  `,
      `**Experience Level:** ${candidate.experience_level || 'n/a'}  `,
      `**Submissions reviewed:** ${subs.length}`,
      ``,
      `## Overall Score`,
      `${breakdown.avg_score == null ? 'No scored submissions.' : `Average across ${scored} scored submissions: **${breakdown.avg_score.toFixed(2)} / 10**.`}`,
      ``,
      `## Breakdown by Topic`,
      ...(breakdown.by_topic.length
        ? breakdown.by_topic.map(t => `- **${t.topic}** — ${t.avg == null ? 'n/a' : t.avg.toFixed(2)} avg (${t.attempts} attempts)`)
        : ['_No topic data._']),
      ``,
      `## Breakdown by Difficulty`,
      ...(breakdown.by_difficulty.length
        ? breakdown.by_difficulty.map(d => `- **${d.difficulty}** — ${d.avg == null ? 'n/a' : d.avg.toFixed(2)} avg (${d.attempts} attempts)`)
        : ['_No difficulty data._']),
      ``,
      `## Question-by-Question`,
      ...(subs.length
        ? subs.map(s => `- **${s.question_title || 'Question'}** [${s.difficulty || '?'} / ${s.category || '?'}] — score: ${s.score ?? 'n/a'}, lang: ${s.language || 'n/a'}`)
        : ['_No submissions on file._']),
      ``,
      `## Recommendation`,
      `Generated locally (AI synthesis unavailable). Review manually.`,
    ].join('\n');

    res.json({
      candidate,
      interview: interview || null,
      submission_count: subs.length,
      breakdown,
      report_markdown: ai.success ? ai.content : fallback,
      ai_synthesized: ai.success,
      ai_error: ai.success ? null : ai.error,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------------------------------------------------------------------
// NON-VIZ 2: Question Bank CRUD (problem / difficulty / topic)
//   GET    /question-bank          -> list (with filters)
//   POST   /question-bank          -> create
//   PUT    /question-bank/:id      -> update
//   DELETE /question-bank/:id      -> delete
// ---------------------------------------------------------------------------
router.get('/question-bank', async (req, res) => {
  try {
    const { difficulty, topic, q } = req.query;
    const conds = [];
    const params = [];
    if (difficulty) { params.push(difficulty); conds.push(`difficulty = $${params.length}`); }
    if (topic) { params.push(topic); conds.push(`category = $${params.length}`); }
    if (q) { params.push(`%${q}%`); conds.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const rows = await pool.query(`
      SELECT id, title, difficulty, category AS topic, time_limit_min, solution_hint,
             LEFT(COALESCE(description, ''), 240) AS description_excerpt,
             created_at
      FROM questions ${where}
      ORDER BY id DESC
      LIMIT 200
    `, params);

    const facets = await pool.query(`
      SELECT COALESCE(category, 'uncategorized') AS topic,
             COALESCE(difficulty, 'unknown') AS difficulty,
             COUNT(*)::int AS count
      FROM questions
      GROUP BY category, difficulty
      ORDER BY topic, difficulty
    `).catch(() => ({ rows: [] }));

    res.json({ questions: rows.rows, facets: facets.rows, total: rows.rows.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/question-bank', async (req, res) => {
  try {
    const { title, difficulty, topic, description, solution_hint, time_limit_min } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title is required' });
    const r = await pool.query(`
      INSERT INTO questions (title, difficulty, category, description, solution_hint, time_limit_min)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, title, difficulty, category AS topic, description, solution_hint, time_limit_min, created_at
    `, [
      title,
      difficulty || 'medium',
      topic || 'uncategorized',
      description || '',
      solution_hint || '',
      parseInt(time_limit_min) || 30,
    ]);
    res.status(201).json({ created: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/question-bank/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, difficulty, topic, description, solution_hint, time_limit_min } = req.body || {};
    const sets = [];
    const params = [];
    if (title !== undefined) { params.push(title); sets.push(`title = $${params.length}`); }
    if (difficulty !== undefined) { params.push(difficulty); sets.push(`difficulty = $${params.length}`); }
    if (topic !== undefined) { params.push(topic); sets.push(`category = $${params.length}`); }
    if (description !== undefined) { params.push(description); sets.push(`description = $${params.length}`); }
    if (solution_hint !== undefined) { params.push(solution_hint); sets.push(`solution_hint = $${params.length}`); }
    if (time_limit_min !== undefined) { params.push(parseInt(time_limit_min) || 30); sets.push(`time_limit_min = $${params.length}`); }
    if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
    params.push(id);
    const r = await pool.query(
      `UPDATE questions SET ${sets.join(', ')} WHERE id = $${params.length}
       RETURNING id, title, difficulty, category AS topic, description, solution_hint, time_limit_min, created_at`,
      params
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Question not found' });
    res.json({ updated: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/question-bank/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query('DELETE FROM questions WHERE id = $1 RETURNING id', [id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Question not found' });
    res.json({ deleted: true, id: r.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
