const Database = require('/var/www/arbnb/node_modules/better-sqlite3');
const db = new Database('/var/www/arbnb/arbnb.db');

// Guests with null/zero guest counts
const nullGuests = db.prepare('SELECT reservation_code, guest_name, guests_total, guests_adult, guests_child, guests_infant FROM payouts WHERE guests_total IS NULL OR guests_total = 0 LIMIT 10').all();
console.log('Null/zero guest counts:', JSON.stringify(nullGuests, null, 2));

// All guests with child/infant null  
const allNullChildren = db.prepare('SELECT COUNT(*) as cnt FROM payouts WHERE guests_child IS NULL').get();
const totalRecs = db.prepare('SELECT COUNT(*) as cnt FROM payouts').get();
console.log('Total records:', totalRecs.cnt, '| null children:', allNullChildren.cnt);

// Check parse-reminder.js - does it correctly extract children/infants?
console.log('\n--- Checking parse-reminder.js ---');
const code = require('fs').readFileSync('/var/www/arbnb/src/parse-reminder.js', 'utf8');
const childrenMatch = code.match(/children[\r\n\t ]*[:=][\r\n\t ]*([^\n,]+)/i);
const infantsMatch = code.match(/infants?[\r\n\t ]*[:=][\r\n\t ]*([^\n,]+)/i);
console.log('children extraction:', childrenMatch ? childrenMatch[0] : 'NOT FOUND');
console.log('infants extraction:', infantsMatch ? infantsMatch[0] : 'NOT FOUND');

// Test reminder parsing - look for a reservation code and check if its guest count gets updated
const r = db.prepare('SELECT reservation_code FROM payouts ORDER BY ROWID DESC LIMIT 5').all();
console.log('\nRecent reservation codes:', r.map(x => x.reservation_code).join(', '));
db.close();