const router = require('express').Router(); const pool = require('../models/db'); const auth = require('../middleware/auth'); router.use(auth);
router.get('/', async (req, res) => { const r = await pool.query('SELECT i.*, c.name as candidate_name, c.experience_level FROM interviews i LEFT JOIN candidates c ON i.candidate_id=c.id ORDER BY i.created_at DESC'); res.json(r.rows); });
router.post('/', async (req, res) => { const { candidate_id, difficulty } = req.body; const r = await pool.query('INSERT INTO interviews (candidate_id,difficulty,started_at) VALUES ($1,$2,NOW()) RETURNING *', [candidate_id, difficulty||'medium']); res.json(r.rows[0]); });
router.put('/:id', async (req, res) => { const { status, score, feedback } = req.body; const r = await pool.query('UPDATE interviews SET status=$1,score=$2,feedback=$3,completed_at=CASE WHEN $1=\'completed\' THEN NOW() ELSE completed_at END WHERE id=$4 RETURNING *', [status, score, feedback, req.params.id]); res.json(r.rows[0]); });
router.delete('/:id', async (req, res) => { await pool.query('DELETE FROM interviews WHERE id=$1', [req.params.id]); res.json({ success: true }); });
module.exports = router;
