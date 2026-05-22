/**
 * Reporting & export (audit gap: missing reporting).
 *   GET /api/reports/summary             - resource counts
 *   GET /api/reports/candidates.csv      - CSV of candidates
 *   GET /api/reports/interviews.csv      - CSV of interviews
 *   GET /api/reports/questions.csv       - CSV of questions
 */

const express = require('express');
const router = express.Router();
const pool = require('../models/db');
const auth = require('../middleware/auth');

router.use(auth);

async function safeCount(table) {
  try {
    const r = await pool.query(`SELECT COUNT(*)::int AS c FROM ${table}`);
    return r.rows[0].c;
  } catch (_) { return 0; }
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

async function tableToCsv(res, table, filename) {
  let rows = [];
  try {
    const r = await pool.query(`SELECT * FROM ${table} ORDER BY 1 DESC LIMIT 5000`);
    rows = r.rows;
  } catch (_) { rows = []; }
  const headers = rows.length ? Object.keys(rows[0]) : ['id'];
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map(h => csvCell(row[h])).join(','));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(lines.join('\n'));
}

router.get('/summary', async (req, res) => {
  try {
    const [candidates, interviews, questions, agents, peer_reviews] = await Promise.all([
      safeCount('candidates'), safeCount('interviews'), safeCount('questions'),
      safeCount('agents'), safeCount('peer_reviews')
    ]);
    res.json({ candidates, interviews, questions, agents, peer_reviews });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/candidates.csv', (req, res) => tableToCsv(res, 'candidates', 'candidates.csv'));
router.get('/interviews.csv', (req, res) => tableToCsv(res, 'interviews', 'interviews.csv'));
router.get('/questions.csv', (req, res) => tableToCsv(res, 'questions', 'questions.csv'));

module.exports = router;
