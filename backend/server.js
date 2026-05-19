const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS - env-driven allowlist (CORS_ORIGINS=comma-separated, defaults to FRONTEND_URL or localhost)
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return cb(null, true);
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

const pool = require('./models/db');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/candidates', require('./routes/candidates'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/interviews', require('./routes/interviews'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/analytics', require('./routes/analytics'));

// NEW: custom non-CRUD feature routes
app.use('/api/skills', require('./routes/skills'));
app.use('/api/peer-reviews', require('./routes/peerReviews'));
app.use('/api/question-versions', require('./routes/questionVersions'));
app.use('/api/ranking', require('./routes/ranking'));
app.use('/api/replays', require('./routes/replays'));
// Audit-recommended additions
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reports', require('./routes/reports'));
// Apply pass 5 — Integration API gap (webhook registry + manual test delivery)
app.use('/api/webhooks', require('./routes/webhooks'));

// Stats overview (kept for backward compat)
app.get('/api/stats', async (req, res) => {
  try {
    const [c, q, i, a] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM candidates'),
      pool.query('SELECT COUNT(*) FROM questions'),
      pool.query('SELECT COUNT(*) FROM interviews'),
      pool.query('SELECT COUNT(*) FROM candidates WHERE avg_score >= 8')
    ]);
    res.json({
      candidates: +c.rows[0].count,
      questions: +q.rows[0].count,
      interviews: +i.rows[0].count,
      top_performers: +a.rows[0].count
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3020;

app.use('/api/adaptive-interviewer', require('./routes/adaptiveInterviewer')); // apply pass 6 — audit custom suggestion

app.use('/api/question-bank-rag', require('./routes/questionBankRag')); // apply pass 6 — audit custom suggestion

app.use('/api/bias-auditor', require('./routes/biasAuditor')); // apply pass 6 — audit custom suggestion

app.use('/api/staffing-white-label', require('./routes/staffingWhiteLabel')); // apply pass 6 — audit custom suggestion

// Custom Views (4 endpoints: 2 viz + 2 non-viz)
app.use('/api/custom-views', require('./routes/customViews'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;


// === Batch 01 Gaps & Frontend Mounts ===
app.use('/api/gap-0-mounted-chat-style-ai-endpoints-despite-the-prod', require('./routes/gap_0_mounted_chat_style_ai_endpoints_despite_the_prod'));
app.use('/api/gap-no-ai-coding-problem-grader-with-rubric-scoring', require('./routes/gap_no_ai_coding_problem_grader_with_rubric_scoring'));
app.use('/api/gap-no-ai-behavioral-signal-analyzer-from-transcripts-', require('./routes/gap_no_ai_behavioral_signal_analyzer_from_transcripts_'));
app.use('/api/gap-no-ai-follow-up-question-generator-during-intervie', require('./routes/gap_no_ai_follow_up_question_generator_during_intervie'));
app.use('/api/gap-no-ai-bias-audit-on-rankings', require('./routes/gap_no_ai_bias_audit_on_rankings'));
app.use('/api/gap-no-live-code-editor-sandbox-for-candidates', require('./routes/gap_no_live_code_editor_sandbox_for_candidates'));
app.use('/api/gap-no-video-audio-capture-pipeline-only-replay-storag', require('./routes/gap_no_video_audio_capture_pipeline_only_replay_storag'));
app.use('/api/gap-notification-routes-exist-but-no-email-calendar-in', require('./routes/gap_notification_routes_exist_but_no_email_calendar_in'));
app.use('/api/gap-no-direct-ats-api-client-greenhouse-lever-workday', require('./routes/gap_no_direct_ats_api_client_greenhouse_lever_workday'));
app.use('/api/gap-no-anti-cheat-proctoring-layer', require('./routes/gap_no_anti_cheat_proctoring_layer'));
