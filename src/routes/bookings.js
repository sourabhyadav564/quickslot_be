const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

// POST /bookings — concurrency-safe slot booking
// Uses BEGIN IMMEDIATE so SQLite's writer-lock ensures only one
// concurrent request can commit; the loser gets SQLITE_BUSY → 409.
router.post('/', (req, res) => {
  const { slot_id } = req.body;
  const userId = req.userId; // injected by auth middleware

  if (!slot_id) {
    return res.status(400).json({ error: '`slot_id` is required' });
  }

  // Wrap everything in an IMMEDIATE transaction
  const book = db.transaction(() => {
    // 1. Verify slot exists
    const slot = db.prepare('SELECT * FROM slots WHERE id = ?').get(slot_id);
    if (!slot) {
      return { status: 404, body: { error: 'Slot not found' } };
    }

    // 2. Check for an existing active booking (inside the lock)
    const existing = db
      .prepare("SELECT id FROM bookings WHERE slot_id = ? AND status = 'active'")
      .get(slot_id);

    if (existing) {
      return { status: 409, body: { error: 'Slot already booked. Please choose another slot.' } };
    }

    // 3. Insert the booking
    const bookingId = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO bookings (id, slot_id, user_id, created_at, status) VALUES (?, ?, ?, ?, ?)'
    ).run(bookingId, slot_id, userId, now, 'active');

    // 4. Return the created booking with slot info
    const booking = db
      .prepare(
        `SELECT b.*, s.venue_id, s.date, s.start_time, s.end_time
         FROM bookings b JOIN slots s ON s.id = b.slot_id
         WHERE b.id = ?`
      )
      .get(bookingId);

    return { status: 201, body: booking };
  });

  try {
    const result = book();
    return res.status(result.status).json(result.body);
  } catch (err) {
    // SQLite busy (race condition) or other DB error
    if (err.code === 'SQLITE_BUSY' || err.code === 'SQLITE_LOCKED') {
      return res.status(409).json({ error: 'Slot already booked. Please choose another slot.' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Booking failed. Please try again.' });
  }
});

// GET /users/:userId/bookings — list user's bookings
router.get('/users/:userId/bookings', (req, res) => {
  // Users can only see their own bookings (unless same user)
  if (req.userId !== req.params.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const bookings = db
      .prepare(
        `SELECT
           b.id, b.status, b.created_at,
           s.venue_id, s.date, s.start_time, s.end_time,
           v.name AS venue_name, v.sport, v.location, v.image_url
         FROM bookings b
         JOIN slots   s ON s.id = b.slot_id
         JOIN venues  v ON v.id = s.venue_id
         WHERE b.user_id = ?
         ORDER BY s.date DESC, s.start_time DESC`
      )
      .all(req.params.userId);

    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// DELETE /bookings/:id — cancel a booking
router.delete('/:id', (req, res) => {
  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.user_id !== req.userId) {
      return res.status(403).json({ error: 'Forbidden: not your booking' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(req.params.id);
    res.json({ message: 'Booking cancelled successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

module.exports = router;
