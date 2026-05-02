const Database = require('better-sqlite3');
const db = new Database('arbnb.db');
const withNat = db.prepare('SELECT COUNT(*) as c FROM payouts WHERE nationality IS NOT NULL AND nationality != \u0027\u0027').get();
const noNat = db.prepare('SELECT COUNT(*) as c FROM payouts WHERE nationality IS NULL OR nationality = \u0027\u0027').get();
const total = db.prepare('SELECT COUNT(*) as c FROM payouts').get();
console.log('Total:', total.c, '| With nationality:', withNat.c, '| Without:', noNat.c);

// Show all nationalities with counts
const byNat = db.prepare('SELECT nationality, COUNT(*) as c FROM payouts WHERE nationality IS NOT NULL AND nationality != \u0027\u0027 GROUP BY nationality ORDER BY c DESC').all();
console.log('\n=== Nationality breakdown ===');
byNat.forEach(r => console.log(r.nationality + ' (' + r.c + ')'));
db.close();