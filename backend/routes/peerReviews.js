// NEW: Peer Code Review - allow human evaluators to comment on submissions

const router = require('express').Router();
const pool = require('../models/db');
const auth = require('../middleware/auth');

router.use(auth);

// List peer reviews for a submission (paginated)
router.get('/submission/:submission_id', async (req, res) => {
  try {
    const submissionId = parseInt(req.params.submission_id);
    const result = await pool.query(
      `SELECT pr.*, u.name AS reviewer_user_name FROM peer_reviews pr LEFT JOIN users u ON pr.reviewer_user_id = u.id WHERE pr.submission_id = $1 ORDER BY pr.created_at DESC`,
      [submissionId]
    );
    res.json({ data: result.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [data, count] = await Promise.all([
      pool.query(
        `SELECT pr.*, u.name AS reviewer_user_name FROM peer_reviews pr LEFT JOIN users u ON pr.reviewer_user_id = u.id ORDER BY pr.created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query(`SELECT COUNT(*)::int AS total FROM peer_reviews`),
    ]);

    res.json({
      data: data.rows,
      pagination: { page, limit, total: count.rows[0].total, totalPages: Math.ceil(count.rows[0].total / limit) },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { submission_id, comments, score, recommendation, line_annotations } = req.body;
    if (!submission_id) return res.status(400).json({ error: 'submission_id is required' });

    const result = await pool.query(
      `INSERT INTO peer_reviews (submission_id, reviewer_user_id, reviewer_name, comments, score, recommendation, line_annotations)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        parseInt(submission_id),
        req.user.id,
        req.user.name || req.user.email || 'Reviewer',
        comments || '',
        score != null ? Number(score) : null,
        recommendation || null,
        JSON.stringify(line_annotations || []),
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { comments, score, recommendation, line_annotations } = req.body;
    const result = await pool.query(
      `UPDATE peer_reviews SET comments = COALESCE($1, comments), score = COALESCE($2, score), recommendation = COALESCE($3, recommendation), line_annotations = COALESCE($4, line_annotations), updated_at = NOW()
       WHERE id = $5 AND reviewer_user_id = $6 RETURNING *`,
      [
        comments,
        score,
        recommendation,
        line_annotations ? JSON.stringify(line_annotations) : null,
        parseInt(req.params.id),
        req.user.id,
      ]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Peer review not found or not yours' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM peer_reviews WHERE id = $1 AND reviewer_user_id = $2 RETURNING id`,
      [parseInt(req.params.id), req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Peer review not found or not yours' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Aggregate peer review summary for a submission (consensus scoring)
router.get('/submission/:submission_id/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS reviewer_count,
        ROUND(AVG(score)::numeric, 2) AS avg_score,
        ROUND(MIN(score)::numeric, 2) AS min_score,
        ROUND(MAX(score)::numeric, 2) AS max_score,
        ROUND(STDDEV(score)::numeric, 2) AS score_variance,
        COUNT(*) FILTER (WHERE recommendation = 'hire')::int AS hire_count,
        COUNT(*) FILTER (WHERE recommendation = 'no_hire')::int AS no_hire_count,
        COUNT(*) FILTER (WHERE recommendation = 'maybe')::int AS maybe_count
      FROM peer_reviews
      WHERE submission_id = $1
    `, [parseInt(req.params.submission_id)]);
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
