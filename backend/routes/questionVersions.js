// NEW: Question Bank Versioning - immutable history of question changes,
// success rate / avg time tracking.

const router = require('express').Router();
const pool = require('../models/db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/question/:question_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT qv.*, u.name AS changed_by_name FROM question_versions qv LEFT JOIN users u ON qv.changed_by = u.id WHERE qv.question_id = $1 ORDER BY version DESC`,
      [parseInt(req.params.question_id)]
    );
    res.json({ data: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/question/:question_id/version/:version', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM question_versions WHERE question_id = $1 AND version = $2`,
      [parseInt(req.params.question_id), parseInt(req.params.version)]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Version not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Snapshot the current question into a new version (call before updating it)
router.post('/question/:question_id/snapshot', async (req, res) => {
  try {
    const questionId = parseInt(req.params.question_id);
    const q = await pool.query('SELECT * FROM questions WHERE id = $1', [questionId]);
    if (!q.rows.length) return res.status(404).json({ error: 'Question not found' });

    const last = await pool.query('SELECT MAX(version) AS max_v FROM question_versions WHERE question_id = $1', [questionId]);
    const nextVersion = (last.rows[0].max_v || q.rows[0].version || 0) + 1;

    const result = await pool.query(
      `INSERT INTO question_versions (question_id, version, title, description, difficulty, category, changed_by, change_notes, snapshot)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        questionId,
        nextVersion,
        q.rows[0].title,
        q.rows[0].description,
        q.rows[0].difficulty,
        q.rows[0].category,
        req.user.id,
        req.body.change_notes || '',
        JSON.stringify(q.rows[0]),
      ]
    );

    // Bump the live question's version pointer
    await pool.query('UPDATE questions SET version = $1 WHERE id = $2', [nextVersion, questionId]);

    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Calibration: success rate + avg time across all submissions for a question
router.get('/question/:question_id/calibration', async (req, res) => {
  try {
    const questionId = parseInt(req.params.question_id);
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total_submissions,
        ROUND(AVG(score)::numeric, 2) AS avg_score,
        ROUND(MIN(score)::numeric, 2) AS min_score,
        ROUND(MAX(score)::numeric, 2) AS max_score,
        COUNT(*) FILTER (WHERE score >= 7)::int AS pass_count,
        ROUND((COUNT(*) FILTER (WHERE score >= 7)::numeric / NULLIF(COUNT(*), 0) * 100), 1) AS success_rate_pct
      FROM code_submissions
      WHERE question_id = $1
    `, [questionId]);

    const stats = result.rows[0];

    // Also persist back to questions.success_rate
    if (stats.total_submissions > 0) {
      await pool.query(
        'UPDATE questions SET success_rate = $1 WHERE id = $2',
        [stats.success_rate_pct, questionId]
      );
    }

    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List all questions with calibration stats (paginated)
router.get('/calibration', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [data, count] = await Promise.all([
      pool.query(`
        SELECT q.id, q.title, q.difficulty, q.category, q.version, q.success_rate, q.avg_time_taken,
          (SELECT COUNT(*)::int FROM code_submissions cs WHERE cs.question_id = q.id) AS total_submissions
        FROM questions q
        ORDER BY q.id
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      pool.query(`SELECT COUNT(*)::int AS total FROM questions`),
    ]);

    res.json({
      data: data.rows,
      pagination: { page, limit, total: count.rows[0].total, totalPages: Math.ceil(count.rows[0].total / limit) },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
