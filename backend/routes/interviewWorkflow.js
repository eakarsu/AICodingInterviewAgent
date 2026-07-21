'use strict';
const express = require('express');
const crypto = require('crypto');
const pool = require('../models/db');
const auth = require('../middleware/auth');
const { transitionSession, gradeRunnerResult, publicFeedback } = require('../domain/interviewWorkflow');
const router = express.Router();

function scope(req, res) {
  const tenantId = req.user.tenant_id;
  if (!tenantId) { res.status(403).json({ error: 'Tenant-scoped identity required' }); return null; }
  return tenantId;
}

router.post('/sessions', auth, async (req, res) => {
  const tenantId = scope(req, res); if (!tenantId) return;
  const { candidateId, problemId, durationSeconds, aiDisclosureAccepted } = req.body;
  if (!candidateId || !problemId || !Number.isInteger(durationSeconds) || durationSeconds < 60 || durationSeconds > 14400 || aiDisclosureAccepted !== true) return res.status(400).json({ error: 'candidateId, problemId, durationSeconds (60-14400), and AI disclosure consent are required' });
  if (String(candidateId) !== String(req.user.id) && !['instructor','admin'].includes(req.user.role)) return res.status(403).json({ error: 'Only instructors can create another candidate session' });
  try {
    const problem = await pool.query('SELECT id, rubric FROM coding_problems WHERE id=$1 AND tenant_id=$2 AND approved_at IS NOT NULL', [problemId, tenantId]);
    if (!problem.rowCount) return res.status(404).json({ error: 'Approved problem not found in tenant' });
    const id = crypto.randomUUID();
    const result = await pool.query(`INSERT INTO interview_sessions (id,tenant_id,candidate_id,problem_id,status,duration_seconds,ai_disclosure_accepted_at,rubric_snapshot,due_at)
      VALUES ($1,$2,$3,$4,'ready',$5,now(),$6,now()+($5 * interval '1 second')) RETURNING *`, [id, tenantId, candidateId, problemId, durationSeconds, problem.rows[0].rubric]);
    await pool.query(`INSERT INTO interview_audit_events(tenant_id,aggregate_id,actor_id,event_type,event_data) VALUES($1,$2,$3,'session.created',$4)`, [tenantId, id, req.user.id, JSON.stringify({ problemId, aiDisclosureAccepted: true })]);
    res.status(201).json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Unable to create interview session' }); }
});

router.post('/sessions/:id/submissions', auth, async (req, res) => {
  const tenantId = scope(req, res); if (!tenantId) return;
  const key = req.get('Idempotency-Key'); const { sourceObjectKey, sourceSha256, language } = req.body;
  if (!key || !sourceObjectKey || !/^[a-f0-9]{64}$/i.test(sourceSha256 || '') || !language) return res.status(400).json({ error: 'Idempotency-Key, sourceObjectKey, SHA-256, and language required' });
  try {
    const session = await pool.query('SELECT * FROM interview_sessions WHERE id=$1 AND tenant_id=$2 AND candidate_id=$3', [req.params.id, tenantId, req.user.id]);
    if (!session.rowCount) return res.status(404).json({ error: 'Candidate session not found' });
    transitionSession(session.rows[0].status, 'submitted', 'candidate');
    const id = crypto.randomUUID();
    const result = await pool.query(`INSERT INTO code_submissions(id,tenant_id,session_id,idempotency_key,source_object_key,source_sha256,language,status)
      VALUES($1,$2,$3,$4,$5,$6,$7,'queued') ON CONFLICT(tenant_id,idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING *`, [id, tenantId, req.params.id, key, sourceObjectKey, sourceSha256.toLowerCase(), language]);
    await pool.query(`UPDATE interview_sessions SET status='submitted',version=version+1 WHERE id=$1 AND tenant_id=$2`, [req.params.id, tenantId]);
    res.status(202).json(result.rows[0]);
  } catch (error) { res.status(409).json({ error: error.message }); }
});

router.post('/runner-results', async (req, res) => {
  const secret = process.env.SANDBOX_CALLBACK_SECRET; const signature = req.get('X-Runner-Signature') || '';
  if (!secret || secret.length < 32) return res.status(503).json({ error: 'Sandbox callback not configured' });
  const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return res.status(401).json({ error: 'Invalid runner signature' });
  const { submissionId, tenantId, tests, rubricScores, evidence } = req.body;
  try {
    const found = await pool.query(`SELECT s.*,p.external_key,p.version AS problem_version,p.prompt,p.rubric,p.hidden_test_manifest
      FROM code_submissions s JOIN interview_sessions i ON i.id=s.session_id JOIN coding_problems p ON p.id=i.problem_id
      WHERE s.id=$1 AND s.tenant_id=$2`, [submissionId, tenantId]);
    if (!found.rowCount) return res.status(404).json({ error: 'Submission not found' });
    const row = found.rows[0];
    const grade = gradeRunnerResult({ id: row.external_key, version: row.problem_version, prompt: row.prompt, rubric: row.rubric, hiddenTests: row.hidden_test_manifest }, { tests, rubricScores });
    const feedback = publicFeedback(grade, evidence);
    await pool.query(`UPDATE code_submissions SET status='succeeded',score=$1,feedback=$2 WHERE id=$3 AND tenant_id=$4 AND status IN ('queued','running')`, [grade.score, JSON.stringify(feedback), submissionId, tenantId]);
    await pool.query(`UPDATE interview_sessions SET status='evaluated',version=version+1 WHERE id=$1 AND tenant_id=$2`, [row.session_id, tenantId]);
    res.json({ accepted: true, score: grade.score });
  } catch (error) { res.status(422).json({ error: error.message }); }
});

router.get('/progress/:candidateId', auth, async (req, res) => {
  const tenantId = scope(req, res); if (!tenantId) return;
  if (req.params.candidateId !== String(req.user.id) && !['instructor','reviewer','admin'].includes(req.user.role)) return res.status(403).json({ error: 'Candidate privacy boundary' });
  const result = await pool.query(`SELECT i.id,i.status,i.started_at,i.created_at,s.score,s.feedback FROM interview_sessions i LEFT JOIN code_submissions s ON s.session_id=i.id WHERE i.tenant_id=$1 AND i.candidate_id=$2 ORDER BY i.created_at DESC`, [tenantId, req.params.candidateId]);
  res.json(result.rows);
});
module.exports = router;
