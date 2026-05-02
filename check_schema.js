const { getDb } = require('/var/www/arbnb/src/db');
const db = getDb();

// Check actual table schema
const tableInfo = db.prepare('PRAGMA table_info(payouts)').all();
console.log('Table columns:', tableInfo.map(c => c.name + ' (' + c.type + ')').join(', '));
console.log('Total columns:', tableInfo.length);

// Check sample record
const sample = db.prepare('SELECT * FROM payouts LIMIT 1').get();
if (sample) {
  console.log('\nSample record keys:', Object.keys(sample).join(', '));
  console.log('Sample:', JSON.stringify(sample));
}

// Check how many have guests_total in actual DB data
const withGuests = db.prepare('SELECT COUNT(*) as c FROM payouts WHERE guests_total IS NOT NULL').get();
console.log('\nRecords with guests_total:', withGuests.c);
process.exit(0);