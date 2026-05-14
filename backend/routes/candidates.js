const router = require('express').Router();
const pool = require('../models/db');
const auth = require('../middleware/auth');

router.use(auth);

const VALID_EXPERIENCE_LEVELS = ['junior', 'mid', 'senior', 'staff', 'principal'];
const VALID_STATUSES = ['active', 'inactive', 'hired', 'rejected', 'pending'];

// ── GET / — list candidates with pagination ──────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { experience_level, status, search } = req.query;

    const conditions = [];
    const params = [];

    if (experience_level) {
      conditions.push(`experience_level = $${params.length + 1}`);
      params.push(experience_level);
    }
    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    if (search) {
      conditions.push(`(name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1} OR skills ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM candidates ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT * FROM candidates ${whereClause}
       ORDER BY created_at DESC
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

// ── GET /:id — get single candidate ─────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM candidates WHERE id = $1', [parseInt(req.params.id)]);
    if (!r.rows.length) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST / — create candidate with validation ─────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, email, experience_level, skills, status } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'email is required' });
    }
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'email must be a valid email address' });
    }
    if (experience_level && !VALID_EXPERIENCE_LEVELS.includes(experience_level)) {
      return res.status(400).json({ error: `experience_level must be one of: ${VALID_EXPERIENCE_LEVELS.join(', ')}` });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const r = await pool.query(
      `INSERT INTO candidates (name, email, experience_level, skills, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name.trim(), email.toLowerCase().trim(), experience_level || 'mid', skills || '', status || 'active']
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'A candidate with this email already exists' });
    }
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /:id — update candidate ───────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { name, email, experience_level, skills, status } = req.body;

    if (experience_level && !VALID_EXPERIENCE_LEVELS.includes(experience_level)) {
      return res.status(400).json({ error: `experience_level must be one of: ${VALID_EXPERIENCE_LEVELS.join(', ')}` });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'email must be a valid email address' });
    }

    const r = await pool.query(
      `UPDATE candidates
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           experience_level = COALESCE($3, experience_level),
           skills = COALESCE($4, skills),
           status = COALESCE($5, status)
       WHERE id = $6 RETURNING *`,
      [name, email, experience_level, skills, status, parseInt(req.params.id)]
    );
    if (!r.rows.length) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    res.json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'A candidate with this email already exists' });
    }
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM candidates WHERE id = $1 RETURNING id', [parseInt(req.params.id)]);
    if (!r.rows.length) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    res.json({ success: true, id: r.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
