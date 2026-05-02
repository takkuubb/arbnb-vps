const { getDb } = require('/var/www/arbnb/src/db');

const db = getDb();

// Find 翔太 五十嵐's record
const record = db.prepare('SELECT * FROM payouts WHERE guest_name LIKE ? OR guest_name LIKE ?').get('%翔太%', '%五十嵐%');
console.log('Record:', JSON.stringify(record, null, 2));

// Show all records with guests_total > 1
console.log('\n=== All records with guests_total > 1 ===');
const rows = db.prepare('SELECT guest_name, reservation_code, guests_total, guests_adult, guests_child, guests_infant FROM payouts WHERE guests_total > 1 ORDER BY guests_total DESC').all();
rows.forEach(r => console.log(r.guest_name, '| code:', r.reservation_code, '| total:', r.guests_total, '| adult:', r.guests_adult));

console.log('\n=== Total with guests_total > 1:', rows.length, '===');

// Show total with guests_total = 1 or null
const nullRows = db.prepare('SELECT COUNT(*) as cnt FROM payouts WHERE guests_total IS NULL OR guests_total = 0 OR guests_total = 1').get();
console.log('Total with guests_total <= 1:', nullRows.cnt);