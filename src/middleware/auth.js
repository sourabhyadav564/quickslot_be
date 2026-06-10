const db = require('../db');

const VALID_USERS = new Set(['user_1', 'user_2', 'user_3']);

function authMiddleware(req, res, next) {
  const userId = req.headers['x-user-id'];

  if (!userId) {
    return res.status(401).json({
      error: 'Missing X-User-Id header',
    });
  }

  if (!VALID_USERS.has(userId)) {
    return res.status(401).json({
      error: `Unknown user: ${userId}. Valid users: user_1, user_2, user_3`,
    });
  }

  req.userId = userId;
  next();
}

module.exports = authMiddleware;
