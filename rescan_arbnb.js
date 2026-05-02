require('dotenv').config();
const { fetchPayoutEmails, savePayouts } = require('./src/gmail');
const { getDb } = require('./src/db');
const db = getDb();
console.log('Token:', process.env.GOOGLE_REFRESH_TOKEN ? 'OK' : 'MISSING');
db.prepare('DELETE FROM payouts').run();
console.log('Cleared');
fetchPayoutEmails(90).then(function(emails) {
  console.log('Fetched', emails.length);
  return savePayouts(emails);
}).then(function(saved) {
  console.log('Saved', saved);
  const count = db.prepare('SELECT COUNT(*) as c FROM payouts').get();
  console.log('Total:', count.c);
  const top = db.prepare('SELECT guest_name, amount_value, nights, stay_start FROM payouts ORDER BY CAST(amount_value AS REAL) DESC LIMIT 3').all();
  top.forEach(function(r) { console.log('  TOP:', r.guest_name, r.amount_value, r.nights+'泊', r.stay_start); });
  const early = db.prepare('SELECT guest_name, amount_value, nights, stay_start, nationality FROM payouts ORDER BY stay_start ASC LIMIT 3').all();
  early.forEach(function(r) { console.log('  EARLY:', r.guest_name, r.amount_value, r.nights+'泊', r.stay_start, r.nationality); });
  process.exit(0);
}).catch(function(e) { console.error(e.message); process.exit(1); });