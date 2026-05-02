const crypto = require('crypto');

const tokens = {};
const TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function createToken(user) {
  const token = crypto.randomBytes(32).toString('hex');
  tokens[token] = { userId: user.id, username: user.username, createdAt: Date.now() };
  setTimeout(() => delete tokens[token], TOKEN_TTL);
  return token;
}

function verifyToken(token) {
  if (!token || !tokens[token]) return null;
  if (Date.now() - tokens[token].createdAt > TOKEN_TTL) { delete tokens[token]; return null; }
  return tokens[token];
}

module.exports = { createToken, verifyToken };
