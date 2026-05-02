const bcrypt = require('bcrypt');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const { getDb } = require('./db');

const SALT_ROUNDS = 12;

function createUserSession(username, password) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return { error: 'User not found' };

  const match = bcrypt.compareSync(password, user.password_hash);
  if (!match) return { error: 'Invalid password' };

  if (user.totp_enabled) {
    return { requires2fa: true, userId: user.id, username: user.username };
  }

  return { success: true, user };
}

function verifyTOTP(userId, token) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user || !user.totp_secret) return false;
  return authenticator.verify({ token, secret: user.totp_secret });
}

async function setupTOTP(userId) {
  const db = getDb();
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(`arbnb:${userId}`, 'arbnb', secret);
  const qrDataUrl = await QRCode.toDataURL(otpauth);

  db.prepare('UPDATE users SET totp_secret = ? WHERE id = ?').run(secret, userId);
  return { secret, qrDataUrl };
}

function enableTOTP(userId) {
  const db = getDb();
  db.prepare('UPDATE users SET totp_enabled = 1 WHERE id = ?').run(userId);
}

async function registerUser(username, password) {
  const db = getDb();
  const hash = bcrypt.hashSync(password, SALT_ROUNDS);
  try {
    const result = db.prepare(
      'INSERT INTO users (username, password_hash, totp_enabled) VALUES (?, ?, 0)'
    ).run(username, hash);
    const userId = result.lastInsertRowid;

    const { secret, qrDataUrl } = await setupTOTP(userId);
    enableTOTP(userId);
    return { success: true, userId, secret, qrDataUrl };
  } catch (e) {
    if (e.message.includes('UNIQUE')) return { error: 'Username already exists' };
    throw e;
  }
}

function getUser(userId) {
  const db = getDb();
  return db.prepare('SELECT id, username, totp_enabled, created_at FROM users WHERE id = ?').get(userId);
}

module.exports = {
  createUserSession,
  verifyTOTP,
  setupTOTP,
  enableTOTP,
  registerUser,
  getUser
};