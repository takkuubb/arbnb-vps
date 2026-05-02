const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

const db = new Database('/var/www/arbnb/arbnb.db');

// Create admin with known password
const pass = 'AdminPass2024!';
const hash = bcrypt.hashSync(pass, 12);

try {
  // Try to insert, ignore if exists
  db.prepare('INSERT OR IGNORE INTO users (username, password_hash, totp_enabled) VALUES (?, ?, 0)').run('admin', hash);
  
  // Update password anyway
  db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hash, 'admin');
  
  console.log('OK - admin password set to:', pass);
  console.log('Hash:', hash);
} catch(e) {
  console.error('Error:', e.message);
}

db.close();