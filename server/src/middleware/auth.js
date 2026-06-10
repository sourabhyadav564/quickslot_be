const db = require('../db');

function authMiddleware(req, res, next) {
  // Accept Bearer token (new login flow) or legacy X-User-Id header
  let userId = null;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    userId = authHeader.slice(7).trim();
  } else {
    userId = req.headers['x-user-id'];
  }

  if (!userId) {
    return res.status(401).json({
      error: 'Unauthorized: missing credentials',
    });
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(401).json({
      error: `Unauthorized: unknown user`,
    });
  }

  req.userId = userId;
  next();
}

module.exports = authMiddleware;
