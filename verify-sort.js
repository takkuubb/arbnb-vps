const Database = require('/var/www/arbnb/node_modules/better-sqlite3');
const db = new Database('/var/www/arbnb/arbnb.db');
// Test the new julianday-based sort
const r = db.prepare('SELECT payout_date FROM payouts ORDER BY julianday(payout_date) DESC LIMIT 5').all();
console.log('julianday sort (new):', JSON.stringify(r));
// Compare with old CAST method
const r2 = db.prepare('SELECT payout_date FROM payouts ORDER BY CAST(payout_date AS REAL) DESC LIMIT 5').all();
console.log('CAST sort (old):', JSON.stringify(r2));
db.close();