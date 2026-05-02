const Database = require('better-sqlite3');
const db = new Database('arbnb.db');
// How many have guests_total but no nationality?
const noNatWithGuests = db.prepare('SELECT COUNT(*) as c FROM payouts WHERE (nationality IS NULL OR nationality = \u0027\u0027) AND guests_total IS NOT NULL AND guests_total > 0').get();
console.log('No nationality but have guests_total:', noNatWithGuests.c);
// Total with guests_total
const totalGuests = db.prepare('SELECT COUNT(*) as c FROM payouts WHERE guests_total IS NOT NULL AND guests_total > 0').get();
console.log('Total with guests_total:', totalGuests.c);
// Total with guests_adult
const totalAdults = db.prepare('SELECT COUNT(*) as c FROM payouts WHERE guests_adult IS NOT NULL').get();
console.log('Total with guests_adult:', totalAdults.c);
// sum of guests_total
const sum = db.prepare('SELECT SUM(guests_total) as s FROM payouts WHERE guests_total IS NOT NULL').get();
console.log('Sum guests_total:', sum.s);
// Show some no-nationality records with guest data
const samples = db.prepare('SELECT guest_name, nationality, guests_total, guests_adult FROM payouts WHERE nationality IS NULL OR nationality = \u0027\u0027 LIMIT 10').all();
console.log('\n=== No nationality samples ===');
samples.forEach(p => console.log(p.guest_name + ' | guests_total:' + p.guests_total + ' | adults:' + p.guests_adult));
db.close();