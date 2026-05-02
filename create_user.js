const { getDb } = require('/var/www/arbnb/src/db');
const bcrypt = require('bcrypt');

const db = getDb();
const username = 'admin';
const password = 'admin1234';
const hash = bcrypt.hashSync(password, 10);

try {
  db.prepare('INSERT INTO users (username, password_hash, totp_enabled) VALUES (?, ?, 0)').run(username, hash);
  console.log('User created: admin / admin1234');
} catch (e) {
  if (e.message.includes('UNIQUE')) {
    console.log('User admin already exists - updating password');
    db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hash, username);
    console.log('Password updated');
  } else {
    console.error('Error:', e.message);
  }
}

const user = db.prepare('SELECT id, username FROM users').all();
console.log('All users:', user.map(u => u.username).join(', '));
db.close();