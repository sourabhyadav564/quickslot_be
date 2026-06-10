const express = require('express');
const db = require('../db');

const router = express.Router();

// POST /auth/login — authenticate with username + password
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  try {
    const user = db
      .prepare('SELECT id, name FROM users WHERE username = ? AND password = ?')
      .get(username.trim(), password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Return userId as a simple token (same format the rest of the app uses)
    res.json({ userId: user.id, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

module.exports = router;
