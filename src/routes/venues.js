const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /venues — list all venues
router.get('/', (req, res) => {
  try {
    const venues = db.prepare('SELECT * FROM venues').all();
    res.json(venues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch venues' });
  }
});

// GET /venues/:id — single venue detail
router.get('/:id', (req, res) => {
  try {
    const venue = db.prepare('SELECT * FROM venues WHERE id = ?').get(req.params.id);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    res.json(venue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch venue' });
  }
});

// GET /venues/:id/slots?date=YYYY-MM-DD
router.get('/:id/slots', (req, res) => {
  const { date } = req.query;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      error: 'Query param `date` is required in YYYY-MM-DD format',
    });
  }

  try {
    const venue = db.prepare('SELECT id FROM venues WHERE id = ?').get(req.params.id);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });

    // Fetch slots and join with active booking status
    const slots = db
      .prepare(
        `SELECT
           s.id,
           s.venue_id,
           s.date,
           s.start_time,
           s.end_time,
           CASE WHEN b.id IS NOT NULL THEN 'booked' ELSE 'available' END AS status,
           b.user_id AS booked_by
         FROM slots s
         LEFT JOIN bookings b
           ON b.slot_id = s.id AND b.status = 'active'
         WHERE s.venue_id = ? AND s.date = ?
         ORDER BY s.start_time`
      )
      .all(req.params.id, date);

    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
});

module.exports = router;
