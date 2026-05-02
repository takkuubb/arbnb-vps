const Database = require('better-sqlite3');
const db = new Database('/var/www/arbnb/arbnb.db');
console.log('Users:', JSON.stringify(db.prepare('SELECT COUNT(*) as c FROM users').get()));
console.log('Payouts:', JSON.stringify(db.prepare('SELECT COUNT(*) as c FROM payouts').get()));
console.log('User list:', JSON.stringify(db.prepare('SELECT id, username, totp_enabled FROM users').all()));
console.log('Sample payouts:', JSON.stringify(db.prepare('SELECT reservation_code, guest_name, amount_original FROM payouts LIMIT 5').all()));
db.close();