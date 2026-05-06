process.chdir('/var/www/arbnb');
const { getDb } = require('./src/db.js');

const db = getDb();
// Null/empty nationality records
const rows = db.prepare('SELECT id, guest_name, nationality FROM payouts WHERE nationality IS NULL OR nationality = ? OR nationality = ?').all('', '');
console.log('Null/empty nationality records:', rows.length);
if (rows.length > 0) rows.slice(0,10).forEach(r => console.log(' ', r.id, r.guest_name, '->', JSON.stringify(r.nationality)));

// Fix null -> Japan for kanji names (they're almost certainly Japanese)
let fixed = 0;
for (const row of rows) {
  if (!row.nationality || row.nationality === '' || row.nationality === 'null') {
    // Check if name has kanji - assume Japan
    if (/[\u4e00-\u9fff]/.test(row.guest_name)) {
      db.prepare('UPDATE payouts SET nationality = ? WHERE id = ?').run('Japan', row.id);
      fixed++;
    }
  }
}
console.log('Fixed null/empty to Japan:', fixed);