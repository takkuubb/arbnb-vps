const Database = require('better-sqlite3');
const db = new Database('/var/www/arbnb/arbnb.db');
const user = db.prepare('SELECT username, password_hash FROM users').get();
console.log('username:', user.username);
console.log('hash:', user.password_hash);
db.close();