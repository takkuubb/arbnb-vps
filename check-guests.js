const Database = require('/var/www/arbnb/node_modules/better-sqlite3');
const db = new Database('/var/www/arbnb/arbnb.db');

// Check current guest counts in DB
const rows = db.prepare('SELECT reservation_code, guest_name, guests_total, guests_adult, guests_child, guests_infant FROM payouts LIMIT 10').all();
console.log('Current DB guest counts:');
console.log(JSON.stringify(rows, null, 2));

// Check email_id presence
const withEmail = db.prepare('SELECT COUNT(*) as cnt FROM payouts WHERE email_id IS NOT NULL AND email_id != \"\"').get();
const withoutEmail = db.prepare('SELECT COUNT(*) as cnt FROM payouts WHERE email_id IS NULL OR email_id == \"\"').get();
console.log('With email_id:', withEmail.cnt, 'Without:', withoutEmail.cnt);
db.close();