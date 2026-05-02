const { getDb } = require('/var/www/arbnb/src/db');
const db = getDb();

// Check Bess Chen and Justine Marcoux directly
const bess = db.prepare('SELECT * FROM payouts WHERE guest_name LIKE ? LIMIT 5').all('%Bess Chen%');
console.log('Bess Chen records:', bess.map(p => ({name: p.guest_name, code: p.reservation_code, guests: p.guests_total, nat: p.nationality})));

const justine = db.prepare('SELECT * FROM payouts WHERE guest_name LIKE ? LIMIT 5').all('%Justine Marcoux%');
console.log('Justine Marcoux records:', justine.map(p => ({name: p.guest_name, code: p.reservation_code, guests: p.guests_total, nat: p.nationality})));

const briony = db.prepare('SELECT * FROM payouts WHERE guest_name LIKE ? LIMIT 3').all('%Briony%');
console.log('Briony records:', briony.map(p => ({name: p.guest_name, code: p.reservation_code, guests: p.guests_total, nat: p.nationality})));

// Show top guests_total records
const topGuests = db.prepare('SELECT guest_name, reservation_code, guests_total, guests_adult, nationality FROM payouts WHERE guests_total IS NOT NULL ORDER BY CAST(guests_total AS INTEGER) DESC LIMIT 10').all();
console.log('\nTop guests_total records:', topGuests);

// Check total with guests_total > 0 vs NULL
const withG = db.prepare('SELECT COUNT(*) as c FROM payouts WHERE guests_total IS NOT NULL').get();
const withG1 = db.prepare('SELECT COUNT(*) as c FROM payouts WHERE guests_total = 1').get();
const withGgt1 = db.prepare('SELECT COUNT(*) as c FROM payouts WHERE guests_total > 1').get();
console.log('\nTotal with guests_total:', withG.c);
console.log('Total with guests_total=1:', withG1.c);
console.log('Total with guests_total > 1:', withGgt1.c);

process.exit(0);