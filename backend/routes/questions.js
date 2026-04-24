const router = require('express').Router(); const pool = require('../models/db'); const auth = require('../middleware/auth'); router.use(auth);
router.get('/', async (req, res) => { const { difficulty, category } = req.query; let q = 'SELECT * FROM questions'; const params = []; const conds = [];
  if (difficulty) { conds.push(`difficulty=$${params.length+1}`); params.push(difficulty); }
  if (category) { conds.push(`category=$${params.length+1}`); params.push(category); }
  if (conds.length) q += ' WHERE ' + conds.join(' AND '); q += ' ORDER BY difficulty, title';
  const r = await pool.query(q, params); res.json(r.rows); });
router.post('/', async (req, res) => { const { title, difficulty, category, description, example_input, example_output, solution_hint, time_limit_min } = req.body; const r = await pool.query('INSERT INTO questions (title,difficulty,category,description,example_input,example_output,solution_hint,time_limit_min) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [title, difficulty, category, description, example_input, example_output, solution_hint, time_limit_min||30]); res.json(r.rows[0]); });
router.put('/:id', async (req, res) => { const { title, difficulty, category, description, example_input, example_output, solution_hint, time_limit_min } = req.body; const r = await pool.query('UPDATE questions SET title=$1,difficulty=$2,category=$3,description=$4,example_input=$5,example_output=$6,solution_hint=$7,time_limit_min=$8 WHERE id=$9 RETURNING *', [title, difficulty, category, description, example_input, example_output, solution_hint, time_limit_min, req.params.id]); res.json(r.rows[0]); });
router.delete('/:id', async (req, res) => { await pool.query('DELETE FROM questions WHERE id=$1', [req.params.id]); res.json({ success: true }); });
module.exports = router;
