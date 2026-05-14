const router = require('express').Router();
const pool = require('../models/db');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const emailService = require('../services/emailService');
const axios = require('axios');

router.use(auth);

const OPENROUTER_MODEL = 'anthropic/claude-3-5-sonnet-20241022';
const SYSTEM_PROMPT = 'You are an expert software engineering interviewer. Evaluate code for correctness, efficiency, quality, and problem-solving approach. Provide constructive, specific feedback.';

// Allowed languages for validation
const ALLOWED_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'c++',
  'csharp', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala',
  'bash', 'sql', 'r', 'dart', 'lua', 'perl', 'haskell', 'elixir'
];

async function callAI(prompt, systemPrompt) {
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt || SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ]
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ai-coding-interview-agent',
        'X-Title': 'AI Coding Interview Agent'
      }
    }
  );
  const content = response.data.choices[0].message.content;
  // Strip markdown code fences if present
  const cleaned = content.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
  try {
    return { success: true, content: JSON.parse(cleaned) };
  } catch {
    return { success: true, content: { raw: content } };
  }
}

// ── GET / — list interviews with pagination ──────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { status, difficulty, candidate_id } = req.query;

    const conditions = [];
    const params = [];

    if (status) { conditions.push(`i.status = $${params.length + 1}`); params.push(status); }
    if (difficulty) { conditions.push(`i.difficulty = $${params.length + 1}`); params.push(difficulty); }
    if (candidate_id) { conditions.push(`i.candidate_id = $${params.length + 1}`); params.push(parseInt(candidate_id)); }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM interviews i ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT i.*, c.name AS candidate_name, c.email AS candidate_email, c.experience_level
       FROM interviews i
       LEFT JOIN candidates c ON i.candidate_id = c.id
       ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: page < Math.ceil(total / limit),
        has_prev: page > 1
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST / — create interview ────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { candidate_id, difficulty } = req.body;

    if (!candidate_id) {
      return res.status(400).json({ error: 'candidate_id is required' });
    }

    const validDifficulties = ['easy', 'medium', 'hard', 'expert'];
    const diff = difficulty || 'medium';
    if (!validDifficulties.includes(diff)) {
      return res.status(400).json({ error: `difficulty must be one of: ${validDifficulties.join(', ')}` });
    }

    // Verify candidate exists
    const candidateResult = await pool.query('SELECT * FROM candidates WHERE id = $1', [candidate_id]);
    if (!candidateResult.rows.length) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const r = await pool.query(
      'INSERT INTO interviews (candidate_id, difficulty, status) VALUES ($1, $2, $3) RETURNING *',
      [candidate_id, diff, 'pending']
    );

    const interview = r.rows[0];
    const candidate = candidateResult.rows[0];

    // Send scheduled notification (non-blocking)
    if (candidate.email) {
      emailService.sendInterviewScheduled({
        candidateEmail: candidate.email,
        candidateName: candidate.name,
        interviewId: interview.id,
        difficulty: diff
      }).catch(err => console.warn('[EmailService] Failed to send scheduled email:', err.message));
    }

    res.status(201).json(interview);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /:id/start — start interview, return first question ─────────────────
router.post('/:id/start', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const interviewResult = await pool.query(
      'SELECT i.*, c.name AS candidate_name, c.experience_level, c.skills FROM interviews i LEFT JOIN candidates c ON i.candidate_id = c.id WHERE i.id = $1',
      [id]
    );

    if (!interviewResult.rows.length) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const interview = interviewResult.rows[0];

    if (interview.status === 'completed') {
      return res.status(400).json({ error: 'Interview already completed' });
    }

    if (interview.status === 'in_progress') {
      return res.status(400).json({ error: 'Interview already started' });
    }

    // Pick first question based on difficulty from questions table
    const questionResult = await pool.query(
      'SELECT * FROM questions WHERE difficulty = $1 ORDER BY RANDOM() LIMIT 1',
      [interview.difficulty]
    );

    let firstQuestion;
    if (questionResult.rows.length) {
      firstQuestion = questionResult.rows[0];
    } else {
      // Fallback: pick any question
      const anyQ = await pool.query('SELECT * FROM questions ORDER BY RANDOM() LIMIT 1');
      firstQuestion = anyQ.rows[0] || null;
    }

    // Mark interview as in_progress
    await pool.query(
      'UPDATE interviews SET status = $1, started_at = NOW(), current_question_id = $2 WHERE id = $3',
      ['in_progress', firstQuestion ? firstQuestion.id : null, id]
    );

    // Track which questions have been asked
    if (firstQuestion) {
      await pool.query(
        'INSERT INTO interview_questions (interview_id, question_id, question_order, asked_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING',
        [id, firstQuestion.id, 1]
      ).catch(() => {
        // Table may not exist yet — best effort
      });
    }

    res.json({
      interview_id: id,
      status: 'in_progress',
      question: firstQuestion,
      instructions: `You have ${firstQuestion ? firstQuestion.time_limit_min || 30 : 30} minutes for this question. Submit your solution when ready.`
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /:id/submit — submit code, get AI evaluation ───────────────────────
router.post('/:id/submit', aiRateLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { code_submission, language, question_id } = req.body;

    if (!code_submission || typeof code_submission !== 'string') {
      return res.status(400).json({ error: 'code_submission is required and must be a string' });
    }
    if (!language) {
      return res.status(400).json({ error: 'language is required' });
    }
    const normalizedLang = language.toLowerCase().trim();
    if (!ALLOWED_LANGUAGES.includes(normalizedLang)) {
      return res.status(400).json({
        error: `language '${language}' is not supported. Allowed: ${ALLOWED_LANGUAGES.join(', ')}`
      });
    }
    if (Buffer.byteLength(code_submission, 'utf8') > 100 * 1024) {
      return res.status(400).json({ error: 'code_submission exceeds 100KB limit' });
    }

    const interviewResult = await pool.query(
      'SELECT i.*, c.name AS candidate_name, c.email AS candidate_email FROM interviews i LEFT JOIN candidates c ON i.candidate_id = c.id WHERE i.id = $1',
      [id]
    );
    if (!interviewResult.rows.length) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const interview = interviewResult.rows[0];

    // Get the question details if provided
    let question = null;
    if (question_id) {
      const qResult = await pool.query('SELECT * FROM questions WHERE id = $1', [question_id]);
      question = qResult.rows[0] || null;
    } else if (interview.current_question_id) {
      const qResult = await pool.query('SELECT * FROM questions WHERE id = $1', [interview.current_question_id]);
      question = qResult.rows[0] || null;
    }

    const questionContext = question
      ? `Problem: ${question.title}\nDescription: ${question.description}\nExample Input: ${question.example_input || 'N/A'}\nExample Output: ${question.example_output || 'N/A'}`
      : 'General coding problem';

    const prompt = `Evaluate the following code submission for a coding interview.

${questionContext}

Language: ${language}
Code Submission:
\`\`\`${language}
${code_submission}
\`\`\`

Evaluate and respond with ONLY valid JSON:
{
  "score": 7.5,
  "correctness_score": 8,
  "efficiency_score": 7,
  "code_quality_score": 7,
  "time_complexity": "O(n)",
  "space_complexity": "O(1)",
  "passes_examples": true,
  "edge_cases_handled": ["empty array", "single element"],
  "edge_cases_missed": ["null input", "negative numbers"],
  "strengths": ["Clear variable naming", "Correct algorithm approach"],
  "improvements": ["Add input validation", "Could use more efficient data structure"],
  "bugs_found": ["Potential null pointer on line 5"],
  "overall_feedback": "Good solution with minor issues...",
  "hire_signal": "positive|neutral|negative"
}`;

    const aiResult = await callAI(prompt);
    if (!aiResult.success) {
      return res.status(500).json({ error: 'AI evaluation failed' });
    }

    const evaluation = aiResult.content;
    const score = evaluation.score || null;

    // Store submission
    await pool.query(
      `INSERT INTO code_submissions (interview_id, question_id, language, code, score, evaluation, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT DO NOTHING`,
      [id, question_id || interview.current_question_id, normalizedLang, code_submission, score, JSON.stringify(evaluation)]
    ).catch(() => {
      // Table may not exist — best effort
    });

    // Update interview score (running average)
    await pool.query(
      'UPDATE interviews SET score = $1, updated_at = NOW() WHERE id = $2',
      [score, id]
    ).catch(() => {});

    res.json({
      interview_id: id,
      question_id: question_id || interview.current_question_id,
      language,
      evaluation
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /:id/next-question — generate next question based on performance ────
router.post('/:id/next-question', aiRateLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const interviewResult = await pool.query(
      'SELECT i.*, c.name AS candidate_name, c.experience_level, c.skills FROM interviews i LEFT JOIN candidates c ON i.candidate_id = c.id WHERE i.id = $1',
      [id]
    );
    if (!interviewResult.rows.length) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const interview = interviewResult.rows[0];

    if (interview.status === 'completed') {
      return res.status(400).json({ error: 'Interview is already completed' });
    }

    // Get questions already asked in this interview
    const askedResult = await pool.query(
      'SELECT question_id FROM interview_questions WHERE interview_id = $1',
      [id]
    ).catch(() => ({ rows: [] }));

    const askedIds = askedResult.rows.map(r => r.question_id).filter(Boolean);
    const currentScore = interview.score;

    // Adjust difficulty based on performance
    let targetDifficulty = interview.difficulty;
    if (currentScore !== null) {
      if (currentScore >= 8.5) {
        // Performing well — increase difficulty
        const levels = ['easy', 'medium', 'hard', 'expert'];
        const currentIdx = levels.indexOf(interview.difficulty);
        targetDifficulty = levels[Math.min(currentIdx + 1, levels.length - 1)];
      } else if (currentScore < 5) {
        // Struggling — decrease difficulty
        const levels = ['easy', 'medium', 'hard', 'expert'];
        const currentIdx = levels.indexOf(interview.difficulty);
        targetDifficulty = levels[Math.max(currentIdx - 1, 0)];
      }
    }

    // Find an unasked question
    let questionResult;
    if (askedIds.length > 0) {
      questionResult = await pool.query(
        `SELECT * FROM questions WHERE difficulty = $1 AND id NOT IN (${askedIds.map((_, i) => `$${i + 2}`).join(',')}) ORDER BY RANDOM() LIMIT 1`,
        [targetDifficulty, ...askedIds]
      );
    } else {
      questionResult = await pool.query(
        'SELECT * FROM questions WHERE difficulty = $1 ORDER BY RANDOM() LIMIT 1',
        [targetDifficulty]
      );
    }

    let nextQuestion;
    if (questionResult.rows.length) {
      nextQuestion = questionResult.rows[0];
    } else {
      // No question in DB — AI generates one
      const genPrompt = `Generate a ${targetDifficulty} difficulty coding interview question for a ${interview.experience_level || 'mid'} level engineer with skills in: ${interview.skills || 'general programming'}.

Respond with ONLY valid JSON:
{
  "title": "Question Title",
  "description": "Full problem description",
  "example_input": "example input",
  "example_output": "expected output",
  "constraints": ["constraint 1", "constraint 2"],
  "difficulty": "${targetDifficulty}",
  "category": "algorithms",
  "time_limit_min": 30,
  "solution_hint": "hint without giving away solution"
}`;
      const aiResult = await callAI(genPrompt);
      nextQuestion = aiResult.success ? aiResult.content : { title: 'Custom Question', description: 'Write a function that solves the given problem efficiently.' };
    }

    // Update current question in interview
    if (nextQuestion.id) {
      await pool.query(
        'UPDATE interviews SET current_question_id = $1 WHERE id = $2',
        [nextQuestion.id, id]
      );

      const questionOrder = askedIds.length + 1;
      await pool.query(
        'INSERT INTO interview_questions (interview_id, question_id, question_order, asked_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT DO NOTHING',
        [id, nextQuestion.id, questionOrder]
      ).catch(() => {});
    }

    res.json({
      interview_id: id,
      question: nextQuestion,
      adjusted_difficulty: targetDifficulty,
      questions_asked_so_far: askedIds.length + 1
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /:id/summary — final interview summary with all scores ───────────────
router.get('/:id/summary', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const interviewResult = await pool.query(
      `SELECT i.*, c.name AS candidate_name, c.email AS candidate_email,
              c.experience_level, c.skills
       FROM interviews i
       LEFT JOIN candidates c ON i.candidate_id = c.id
       WHERE i.id = $1`,
      [id]
    );
    if (!interviewResult.rows.length) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const interview = interviewResult.rows[0];

    // Get all submissions
    const submissionsResult = await pool.query(
      `SELECT cs.*, q.title AS question_title, q.difficulty AS question_difficulty, q.category
       FROM code_submissions cs
       LEFT JOIN questions q ON cs.question_id = q.id
       WHERE cs.interview_id = $1
       ORDER BY cs.submitted_at ASC`,
      [id]
    ).catch(() => ({ rows: [] }));

    const submissions = submissionsResult.rows;

    // Calculate aggregate scores
    const scores = submissions
      .map(s => {
        try {
          const eval_ = typeof s.evaluation === 'string' ? JSON.parse(s.evaluation) : s.evaluation;
          return eval_?.score || s.score;
        } catch {
          return s.score;
        }
      })
      .filter(s => s !== null && s !== undefined);

    const avgScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : interview.score;

    // Collect all feedback
    const allStrengths = [];
    const allImprovements = [];
    submissions.forEach(s => {
      try {
        const eval_ = typeof s.evaluation === 'string' ? JSON.parse(s.evaluation) : s.evaluation;
        if (eval_?.strengths) allStrengths.push(...eval_.strengths);
        if (eval_?.improvements) allImprovements.push(...eval_.improvements);
      } catch {}
    });

    // Determine overall recommendation
    let recommendation = 'neutral';
    if (avgScore !== null) {
      if (avgScore >= 8) recommendation = 'strong_hire';
      else if (avgScore >= 6.5) recommendation = 'hire';
      else if (avgScore >= 5) recommendation = 'maybe';
      else recommendation = 'no_hire';
    }

    const duration = interview.started_at && interview.completed_at
      ? Math.round((new Date(interview.completed_at) - new Date(interview.started_at)) / 60000)
      : interview.duration_min || null;

    res.json({
      interview_id: id,
      candidate: {
        name: interview.candidate_name,
        email: interview.candidate_email,
        experience_level: interview.experience_level,
        skills: interview.skills
      },
      interview: {
        status: interview.status,
        difficulty: interview.difficulty,
        started_at: interview.started_at,
        completed_at: interview.completed_at,
        duration_min: duration
      },
      scores: {
        overall: avgScore !== null ? parseFloat(avgScore.toFixed(2)) : null,
        individual: scores,
        total_questions: submissions.length
      },
      submissions: submissions.map(s => {
        let eval_ = null;
        try { eval_ = typeof s.evaluation === 'string' ? JSON.parse(s.evaluation) : s.evaluation; } catch {}
        return {
          question_title: s.question_title,
          question_difficulty: s.question_difficulty,
          category: s.category,
          language: s.language,
          score: s.score,
          time_complexity: eval_?.time_complexity,
          space_complexity: eval_?.space_complexity,
          hire_signal: eval_?.hire_signal,
          submitted_at: s.submitted_at
        };
      }),
      summary: {
        recommendation,
        average_score: avgScore !== null ? parseFloat(avgScore.toFixed(2)) : null,
        top_strengths: [...new Set(allStrengths)].slice(0, 5),
        key_improvements: [...new Set(allImprovements)].slice(0, 5),
        feedback: interview.feedback
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /:id/live-stream — SSE stream with timing events ────────────────────
router.get('/:id/live-stream', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const interviewResult = await pool.query(
      'SELECT i.*, c.name AS candidate_name FROM interviews i LEFT JOIN candidates c ON i.candidate_id = c.id WHERE i.id = $1',
      [id]
    );
    if (!interviewResult.rows.length) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const interview = interviewResult.rows[0];

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      if (res.flush) res.flush();
    };

    // Send initial state
    sendEvent('connected', {
      interview_id: id,
      status: interview.status,
      candidate_name: interview.candidate_name,
      difficulty: interview.difficulty,
      timestamp: new Date().toISOString()
    });

    // Poll for changes every 5 seconds
    let lastStatus = interview.status;
    let lastScore = interview.score;

    const pollInterval = setInterval(async () => {
      try {
        const pollResult = await pool.query(
          'SELECT i.*, q.title AS current_question_title, q.time_limit_min FROM interviews i LEFT JOIN questions q ON i.current_question_id = q.id WHERE i.id = $1',
          [id]
        );

        if (!pollResult.rows.length) {
          clearInterval(pollInterval);
          sendEvent('error', { message: 'Interview not found' });
          res.end();
          return;
        }

        const current = pollResult.rows[0];

        // Emit status change
        if (current.status !== lastStatus) {
          sendEvent('status_change', {
            interview_id: id,
            previous_status: lastStatus,
            new_status: current.status,
            timestamp: new Date().toISOString()
          });
          lastStatus = current.status;
        }

        // Emit score update
        if (current.score !== lastScore && current.score !== null) {
          sendEvent('score_update', {
            interview_id: id,
            score: current.score,
            timestamp: new Date().toISOString()
          });
          lastScore = current.score;
        }

        // Emit current question prompt
        if (current.current_question_title) {
          sendEvent('current_question', {
            interview_id: id,
            question_title: current.current_question_title,
            time_limit_min: current.time_limit_min,
            timestamp: new Date().toISOString()
          });
        }

        // Emit heartbeat
        sendEvent('heartbeat', { timestamp: new Date().toISOString() });

        // Stop if interview completed
        if (current.status === 'completed') {
          sendEvent('completed', {
            interview_id: id,
            final_score: current.score,
            timestamp: new Date().toISOString()
          });
          clearInterval(pollInterval);
          res.end();
        }
      } catch (pollErr) {
        sendEvent('error', { message: pollErr.message });
      }
    }, 5000);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(pollInterval);
      res.end();
    });

  } catch (e) {
    if (!res.headersSent) {
      res.status(500).json({ error: e.message });
    }
  }
});

// ── PUT /:id — update interview ──────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, score, feedback } = req.body;

    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    }

    const r = await pool.query(
      `UPDATE interviews
       SET status = COALESCE($1, status),
           score = COALESCE($2, score),
           feedback = COALESCE($3, feedback),
           completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END,
           updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [status, score, feedback, id]
    );

    if (!r.rows.length) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // If completing, send results email
    if (status === 'completed') {
      const interviewResult = await pool.query(
        'SELECT i.*, c.name AS candidate_name, c.email AS candidate_email FROM interviews i LEFT JOIN candidates c ON i.candidate_id = c.id WHERE i.id = $1',
        [id]
      );
      const iw = interviewResult.rows[0];
      if (iw && iw.candidate_email) {
        emailService.sendInterviewResults({
          candidateEmail: iw.candidate_email,
          candidateName: iw.candidate_name,
          interviewId: id,
          score: r.rows[0].score,
          feedback: r.rows[0].feedback,
          recommendation: r.rows[0].score >= 8 ? 'Strong Hire' : r.rows[0].score >= 6.5 ? 'Hire' : r.rows[0].score >= 5 ? 'Maybe' : 'No Hire'
        }).catch(err => console.warn('[EmailService]', err.message));
      }
    }

    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /:id ──────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM interviews WHERE id = $1 RETURNING id', [parseInt(req.params.id)]);
    if (!r.rows.length) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    res.json({ success: true, id: r.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
