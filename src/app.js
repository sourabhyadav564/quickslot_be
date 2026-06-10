const express = require('express');
const cors = require('cors');
const authMiddleware = require('./middleware/auth');
const venuesRouter = require('./routes/venues');
const bookingsRouter = require('./routes/bookings');

const app = express();

app.use(cors());
app.use(express.json());

// Health check (no auth)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Protected routes — all require X-User-Id header
app.use(authMiddleware);
app.use('/venues', venuesRouter);
app.use('/bookings', bookingsRouter);

// /users/:id/bookings delegates to bookings router
app.use('/users', bookingsRouter);

// 404 fallback
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
