#!/usr/bin/env node
require('/var/www/arbnb/node_modules/dotenv').config({ path: '/var/www/arbnb/.env' });
process.chdir('/var/www/arbnb');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Token store file - survives restarts!
const TOKEN_FILE = '/var/www/arbnb/tokens.json';
const TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadTokens() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
      // Clean expired tokens
      const now = Date.now();
      for (const [k, v] of Object.entries(data)) {
        if (now - v.createdAt > TOKEN_TTL) delete data[k];
      }
      return data;
    }
  } catch (e) { }
  return {};
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens));
}

function createToken(user) {
  const tokens = loadTokens();
  const token = crypto.randomBytes(32).toString('hex');
  tokens[token] = { userId: user.id, username: user.username, createdAt: Date.now() };
  saveTokens(tokens);
  // Also schedule cleanup
  setTimeout(() => {
    const t = loadTokens();
    if (t[token] && Date.now() - t[token].createdAt > TOKEN_TTL) {
      delete t[token];
      saveTokens(t);
    }
  }, TOKEN_TTL + 1000);
  return token;
}

function verifyToken(token) {
  if (!token) return null;
  const tokens = loadTokens();
  const entry = tokens[token];
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TOKEN_TTL) {
    delete tokens[token];
    saveTokens(tokens);
    return null;
  }
  return entry;
}

module.exports = { createToken, verifyToken };

// Test
if (require.main === module) {
  const testUser = { id: 1, username: 'test' };
  const tok = createToken(testUser);
  console.log('Created:', tok.slice(0, 20) + '...');
  const verified = verifyToken(tok);
  console.log('Verified:', verified ? verified.username : 'FAILED');
}