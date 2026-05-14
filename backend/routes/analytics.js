const router = require('express').Router();
const pool = require('../models/db');
const auth = require('../middleware/auth');

router.use(auth);

// ── GET /top-performers — top 10 candidates by avg score ─────────────────────
router.get('/top-performers', async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

    const result = await pool.query(
      `SELECT
         c.id,
         c.name,
         c.email,
         c.experience_level,
         c.skills,
         COUNT(i.id) AS total_interviews,
         ROUND(AVG(i.score)::numeric, 2) AS avg_score,
         MAX(i.score) AS best_score,
         COUNT(CASE WHEN i.score >= 8 THEN 1 END) AS high_score_count
       FROM candidates c
       INNER JOIN interviews i ON i.candidate_id = c.id
       WHERE i.status = 'completed' AND i.score IS NOT NULL
       GROUP BY c.id, c.name, c.email, c.experience_level, c.skills
       HAVING COUNT(i.id) >= 1
       ORDER BY avg_score DESC, best_score DESC
       LIMIT $1`,
      [limit]
    );

    res.json({
      top_performers: result.rows,
      total: result.rows.length,
      generated_at: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /difficulty-stats — pass rate by difficulty ──────────────────────────
router.get('/difficulty-stats', async (req, res) => {
  try {
    const passThreshold = parseFloat(req.query.pass_threshold) || 6.5;

    const result = await pool.query(
      `SELECT
         difficulty,
         COUNT(*) AS total_interviews,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed,
         COUNT(CASE WHEN score IS NOT NULL THEN 1 END) AS scored,
         ROUND(AVG(score)::numeric, 2) AS avg_score,
         ROUND(MIN(score)::numeric, 2) AS min_score,
         ROUND(MAX(score)::numeric, 2) AS max_score,
         COUNT(CASE WHEN score >= $1 THEN 1 END) AS passed,
         CASE
           WHEN COUNT(CASE WHEN score IS NOT NULL THEN 1 END) = 0 THEN 0
           ELSE ROUND(
             (COUNT(CASE WHEN score >= $1 THEN 1 END)::numeric /
              COUNT(CASE WHEN score IS NOT NULL THEN 1 END)::numeric) * 100,
             1
           )
         END AS pass_rate_pct
       FROM interviews
       WHERE status = 'completed'
       GROUP BY difficulty
       ORDER BY CASE difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 WHEN 'hard' THEN 3 WHEN 'expert' THEN 4 ELSE 5 END`,
      [passThreshold]
    );

    res.json({
      pass_threshold: passThreshold,
      difficulty_stats: result.rows,
      generated_at: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /language-popularity — most used languages ───────────────────────────
router.get('/language-popularity', async (req, res) => {
  try {
    // Try code_submissions table first; fall back to a simple count
    let result;
    try {
      result = await pool.query(
        `SELECT
           language,
           COUNT(*) AS submission_count,
           ROUND(AVG(score)::numeric, 2) AS avg_score,
           COUNT(DISTINCT interview_id) AS interviews_using,
           ROUND(
             COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100,
             1
           ) AS usage_pct
         FROM code_submissions
         WHERE language IS NOT NULL
         GROUP BY language
         ORDER BY submission_count DESC
         LIMIT 20`
      );
    } catch {
      // code_submissions table may not exist — return empty
      result = { rows: [] };
    }

    // Also get from interviews table if available
    let interviewLangResult = { rows: [] };
    try {
      interviewLangResult = await pool.query(
        `SELECT
           'interview_data' AS source,
           COUNT(*) AS total_interviews
         FROM interviews`
      );
    } catch {}

    res.json({
      language_popularity: result.rows,
      total_submissions: result.rows.reduce((sum, r) => sum + parseInt(r.submission_count), 0),
      generated_at: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /overview — general stats overview ────────────────────────────────────
router.get('/overview', async (req, res) => {
  try {
    const [candidates, questions, interviews, completedInterviews, avgScore] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM candidates'),
      pool.query('SELECT COUNT(*) FROM questions'),
      pool.query('SELECT COUNT(*) FROM interviews'),
      pool.query("SELECT COUNT(*) FROM interviews WHERE status = 'completed'"),
      pool.query("SELECT ROUND(AVG(score)::numeric, 2) AS avg FROM interviews WHERE status = 'completed' AND score IS NOT NULL")
    ]);

    res.json({
      candidates: parseInt(candidates.rows[0].count),
      questions: parseInt(questions.rows[0].count),
      total_interviews: parseInt(interviews.rows[0].count),
      completed_interviews: parseInt(completedInterviews.rows[0].count),
      avg_score: avgScore.rows[0].avg ? parseFloat(avgScore.rows[0].avg) : null,
      generated_at: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /candidate/:id — per-candidate analytics ─────────────────────────────
router.get('/candidate/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const candidateResult = await pool.query('SELECT * FROM candidates WHERE id = $1', [id]);
    if (!candidateResult.rows.length) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const interviewsResult = await pool.query(
      `SELECT * FROM interviews WHERE candidate_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    const interviews = interviewsResult.rows;
    const completedInterviews = interviews.filter(i => i.status === 'completed' && i.score !== null);
    const avgScore = completedInterviews.length > 0
      ? completedInterviews.reduce((sum, i) => sum + parseFloat(i.score), 0) / completedInterviews.length
      : null;

    const scoresByDifficulty = {};
    completedInterviews.forEach(i => {
      if (!scoresByDifficulty[i.difficulty]) {
        scoresByDifficulty[i.difficulty] = [];
      }
      scoresByDifficulty[i.difficulty].push(parseFloat(i.score));
    });

    const difficultyBreakdown = Object.entries(scoresByDifficulty).map(([diff, scores]) => ({
      difficulty: diff,
      count: scores.length,
      avg_score: parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)),
      best_score: Math.max(...scores)
    }));

    res.json({
      candidate: candidateResult.rows[0],
      stats: {
        total_interviews: interviews.length,
        completed_interviews: completedInterviews.length,
        avg_score: avgScore !== null ? parseFloat(avgScore.toFixed(2)) : null,
        best_score: completedInterviews.length > 0 ? Math.max(...completedInterviews.map(i => parseFloat(i.score))) : null,
        trend: completedInterviews.slice(-5).map(i => ({ score: i.score, date: i.completed_at }))
      },
      difficulty_breakdown: difficultyBreakdown,
      recent_interviews: interviews.slice(0, 5)
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
