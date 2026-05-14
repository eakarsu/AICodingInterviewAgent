const router = require('express').Router();
const pool = require('../models/db');
const auth = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const axios = require('axios');

router.use(auth);

const OPENROUTER_MODEL = 'anthropic/claude-3-5-sonnet-20241022';
const SYSTEM_PROMPT = 'You are an expert software engineering interviewer. Evaluate code for correctness, efficiency, quality, and problem-solving approach. Provide constructive, specific feedback.';

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];
const VALID_CATEGORIES = [
  'arrays', 'strings', 'linked_list', 'trees', 'graphs', 'dynamic_programming',
  'binary_search', 'stacks', 'queues', 'heaps', 'sorting', 'design',
  'system_design', 'algorithms', 'math', 'recursion', 'bit_manipulation', 'general'
];

async function callAI(prompt) {
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
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
  const cleaned = content.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
  try {
    return { success: true, content: JSON.parse(cleaned) };
  } catch {
    return { success: true, content: { raw: content } };
  }
}

// ── GET / — list questions with filters and pagination ───────────────────────
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { language, difficulty, category, search } = req.query;

    const conditions = [];
    const params = [];

    if (difficulty) {
      if (!VALID_DIFFICULTIES.includes(difficulty)) {
        return res.status(400).json({ error: `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}` });
      }
      conditions.push(`difficulty = $${params.length + 1}`);
      params.push(difficulty);
    }

    if (category) {
      conditions.push(`category = $${params.length + 1}`);
      params.push(category);
    }

    if (language) {
      conditions.push(`(tags ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`);
      params.push(`%${language}%`);
    }

    if (search) {
      conditions.push(`(title ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM questions ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT * FROM questions ${whereClause}
       ORDER BY CASE difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 WHEN 'hard' THEN 3 WHEN 'expert' THEN 4 ELSE 5 END, title
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

// ── POST /generate — AI generates a new question ─────────────────────────────
router.post('/generate', aiRateLimiter, async (req, res) => {
  try {
    const { language, topic, difficulty, category, skills } = req.body;

    if (!difficulty) {
      return res.status(400).json({ error: 'difficulty is required' });
    }
    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({ error: `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}` });
    }

    const prompt = `Generate a unique coding interview question.

Parameters:
- Language: ${language || 'language-agnostic'}
- Topic/Area: ${topic || 'general algorithms'}
- Difficulty: ${difficulty}
- Category: ${category || 'algorithms'}
- Skills to Test: ${skills || 'problem solving, data structures'}

Generate a question that is original, well-defined, and appropriate for the difficulty level.

Respond with ONLY valid JSON:
{
  "title": "Short descriptive title",
  "description": "Complete, unambiguous problem description with all constraints and requirements",
  "example_input": "Concrete example input",
  "example_output": "Expected output for the example",
  "constraints": ["1 <= n <= 10^5", "All values are positive integers"],
  "hints": ["Hint 1 (vague)", "Hint 2 (more specific)", "Hint 3 (near solution)"],
  "solution_hint": "High-level approach without giving away the full solution",
  "expected_time_minutes": 25,
  "difficulty": "${difficulty}",
  "category": "${category || 'algorithms'}",
  "evaluation_criteria": ["Correctness", "Time complexity", "Edge case handling"],
  "follow_up_questions": ["What if the input is sorted?", "Can you optimize space complexity?"],
  "time_complexity_target": "O(n log n)",
  "space_complexity_target": "O(n)"
}`;

    const aiResult = await callAI(prompt);
    if (!aiResult.success) {
      return res.status(500).json({ error: 'AI question generation failed' });
    }

    const generated = aiResult.content;

    // Optionally persist the generated question
    let saved = null;
    try {
      const saveResult = await pool.query(
        `INSERT INTO questions (title, difficulty, category, description, example_input, example_output, solution_hint, time_limit_min)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          generated.title || 'AI Generated Question',
          generated.difficulty || difficulty,
          generated.category || category || 'algorithms',
          generated.description || '',
          generated.example_input || '',
          generated.example_output || '',
          generated.solution_hint || '',
          generated.expected_time_minutes || 30
        ]
      );
      saved = saveResult.rows[0];
    } catch (saveErr) {
      console.warn('[Questions] Could not save generated question:', saveErr.message);
    }

    res.status(201).json({
      generated: true,
      saved_to_db: !!saved,
      question: saved || generated
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST / — create question with validation ──────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { title, difficulty, category, description, example_input, example_output, solution_hint, time_limit_min } = req.body;

    // Validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!difficulty) {
      return res.status(400).json({ error: 'difficulty is required' });
    }
    if (!VALID_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({ error: `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}` });
    }
    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }
    if (time_limit_min !== undefined && (isNaN(parseInt(time_limit_min)) || parseInt(time_limit_min) < 1)) {
      return res.status(400).json({ error: 'time_limit_min must be a positive integer' });
    }

    const r = await pool.query(
      `INSERT INTO questions (title, difficulty, category, description, example_input, example_output, solution_hint, time_limit_min)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        title.trim(),
        difficulty,
        category || 'general',
        description || '',
        example_input || '',
        example_output || '',
        solution_hint || '',
        parseInt(time_limit_min) || 30
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /:id — update question ───────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { title, difficulty, category, description, example_input, example_output, solution_hint, time_limit_min } = req.body;

    if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({ error: `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}` });
    }

    const r = await pool.query(
      `UPDATE questions
       SET title = COALESCE($1, title),
           difficulty = COALESCE($2, difficulty),
           category = COALESCE($3, category),
           description = COALESCE($4, description),
           example_input = COALESCE($5, example_input),
           example_output = COALESCE($6, example_output),
           solution_hint = COALESCE($7, solution_hint),
           time_limit_min = COALESCE($8, time_limit_min)
       WHERE id = $9 RETURNING *`,
      [title, difficulty, category, description, example_input, example_output, solution_hint, time_limit_min ? parseInt(time_limit_min) : null, parseInt(req.params.id)]
    );

    if (!r.rows.length) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /:id ──────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM questions WHERE id = $1 RETURNING id', [parseInt(req.params.id)]);
    if (!r.rows.length) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.json({ success: true, id: r.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
