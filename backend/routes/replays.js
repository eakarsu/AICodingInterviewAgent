// NEW: Interview Replay System - record interview events and replay them.

const router = require('express').Router();
const pool = require('../models/db');
const auth = require('../middleware/auth');

router.use(auth);

// List events for an interview (paginated)
router.get('/interview/:interview_id', async (req, res) => {
  try {
    const interviewId = parseInt(req.params.interview_id);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
    const offset = (page - 1) * limit;

    const [data, count] = await Promise.all([
      pool.query(
        'SELECT * FROM interview_replays WHERE interview_id = $1 ORDER BY occurred_at ASC LIMIT $2 OFFSET $3',
        [interviewId, limit, offset]
      ),
      pool.query('SELECT COUNT(*)::int AS total FROM interview_replays WHERE interview_id = $1', [interviewId]),
    ]);

    res.json({
      data: data.rows,
      pagination: { page, limit, total: count.rows[0].total, totalPages: Math.ceil(count.rows[0].total / limit) },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Record an event
router.post('/', async (req, res) => {
  try {
    const { interview_id, event_type, event_payload } = req.body;
    if (!interview_id || !event_type) {
      return res.status(400).json({ error: 'interview_id and event_type are required' });
    }

    const allowedTypes = ['code_change', 'cursor_move', 'paste_detected', 'tab_switch', 'submission', 'hint_revealed', 'time_warning', 'note_added'];
    if (!allowedTypes.includes(event_type)) {
      return res.status(400).json({ error: `event_type must be one of: ${allowedTypes.join(', ')}` });
    }

    const result = await pool.query(
      'INSERT INTO interview_replays (interview_id, event_type, event_payload) VALUES ($1,$2,$3) RETURNING *',
      [parseInt(interview_id), event_type, JSON.stringify(event_payload || {})]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Bulk insert events
router.post('/bulk', async (req, res) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events array required' });
    }
    if (events.length > 1000) return res.status(400).json({ error: 'maximum 1000 events per bulk' });

    const client = await pool.connect();
    let inserted = 0;
    try {
      await client.query('BEGIN');
      for (const ev of events) {
        if (!ev.interview_id || !ev.event_type) continue;
        await client.query(
          'INSERT INTO interview_replays (interview_id, event_type, event_payload, occurred_at) VALUES ($1,$2,$3,$4)',
          [parseInt(ev.interview_id), ev.event_type, JSON.stringify(ev.event_payload || {}), ev.occurred_at || new Date()]
        );
        inserted++;
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.status(201).json({ inserted });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get a summary of an interview replay (events grouped by type)
router.get('/interview/:interview_id/summary', async (req, res) => {
  try {
    const interviewId = parseInt(req.params.interview_id);
    const result = await pool.query(`
      SELECT event_type, COUNT(*)::int AS count, MIN(occurred_at) AS first_at, MAX(occurred_at) AS last_at
      FROM interview_replays
      WHERE interview_id = $1
      GROUP BY event_type
      ORDER BY count DESC
    `, [interviewId]);

    res.json({
      interview_id: interviewId,
      event_types: result.rows,
      total_events: result.rows.reduce((sum, r) => sum + r.count, 0),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
