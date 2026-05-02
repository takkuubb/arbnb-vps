const { getDb } = require('/var/www/arbnb/src/db');
const db = getDb();

// Direct SQL test - compare CAST vs no CAST
console.log('=== Direct SQL Test ===');

const asc = db.prepare('SELECT guest_name, amount_value FROM payouts ORDER BY CAST(amount_value AS REAL) ASC LIMIT 5').all();
console.log('CAST ASC:', asc.map(r => r.guest_name + ' ¥' + r.amount_value));

const desc = db.prepare('SELECT guest_name, amount_value FROM payouts ORDER BY CAST(amount_value AS REAL) DESC LIMIT 5').all();
console.log('CAST DESC:', desc.map(r => r.guest_name + ' ¥' + r.amount_value));

const textAsc = db.prepare('SELECT guest_name, amount_value FROM payouts ORDER BY amount_value ASC LIMIT 5').all();
console.log('TEXT ASC:', textAsc.map(r => r.guest_name + ' ¥' + r.amount_value));

const textDesc = db.prepare('SELECT guest_name, amount_value FROM payouts ORDER BY amount_value DESC LIMIT 5').all();
console.log('TEXT DESC:', textDesc.map(r => r.guest_name + ' ¥' + r.amount_value));

// Now test what getPayouts actually returns
console.log('\n=== getPayouts() function test ===');
const r1 = db.getPayouts({ sort: 'amount_value', order: 'asc', limit: 3 });
console.log('getPayouts ASC:', r1.map(p => p.guest_name + ' ¥' + p.amount_value));

const r2 = db.getPayouts({ sort: 'amount_value', order: 'desc', limit: 3 });
console.log('getPayouts DESC:', r2.map(p => p.guest_name + ' ¥' + p.amount_value));

process.exit(0);