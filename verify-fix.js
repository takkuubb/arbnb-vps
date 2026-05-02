const Database = require('better-sqlite3');
const db = new Database('/var/www/arbnb/arbnb.db');
// Get the actual API response format - check a few records
const rows = db.prepare('SELECT guest_name, nationality, guests_total, guests_adult, amount_value FROM payouts ORDER BY payout_date DESC LIMIT 3').all();
rows.forEach(p => {
  console.log(JSON.stringify(p));
});
db.close();