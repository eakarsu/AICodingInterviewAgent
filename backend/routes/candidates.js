const router = require('express').Router(); const pool = require('../models/db'); const auth = require('../middleware/auth'); router.use(auth);
router.get('/', async (req, res) => { const r = await pool.query('SELECT * FROM candidates ORDER BY created_at DESC'); res.json(r.rows); });
router.post('/', async (req, res) => { const { name, email, experience_level, skills } = req.body; const r = await pool.query('INSERT INTO candidates (name,email,experience_level,skills) VALUES ($1,$2,$3,$4) RETURNING *', [name, email, experience_level, skills]); res.json(r.rows[0]); });
router.put('/:id', async (req, res) => { const { name, email, experience_level, skills, status } = req.body; const r = await pool.query('UPDATE candidates SET name=$1,email=$2,experience_level=$3,skills=$4,status=$5 WHERE id=$6 RETURNING *', [name, email, experience_level, skills, status, req.params.id]); res.json(r.rows[0]); });
router.delete('/:id', async (req, res) => { await pool.query('DELETE FROM candidates WHERE id=$1', [req.params.id]); res.json({ success: true }); });
module.exports = router;
