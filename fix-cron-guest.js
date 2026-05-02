const fs = require('fs');
const content = fs.readFileSync('/var/www/arbnb/src/routes/cron.js', 'utf8');

const oldUpdate = `const stmt = db.getDb().prepare('UPDATE payouts SET guests_total = ?, guests_adult = ?, guests_child = ?, guests_infant = ? WHERE reservation_code = ?');
    let updated = 0;
    for (const r of reminders) {
      if (!r.reservationCode) continue;
      const existing = db.getPayoutByResCode(r.reservationCode);
      if (existing) { stmt.run((r.adults||1)+(r.children||0)+(r.infants||0), r.adults||1, r.children||0, r.infants||0, r.reservationCode); updated++; }
    }`;

const newUpdate = `const stmt = db.getDb().prepare('UPDATE payouts SET guests_total = ?, guests_adult = ?, guests_child = ?, guests_infant = ? WHERE reservation_code = ?');
    let updated = 0;
    for (const r of reminders) {
      if (!r.reservationCode) continue;
      const existing = db.getPayoutByResCode(r.reservationCode);
      if (existing) {
        const total = r.total || ((r.adults||1) + (r.children||0) + (r.infants||0));
        stmt.run(total, r.adults||1, r.children||0, r.infants||0, r.reservationCode);
        updated++;
      }
    }`;

if (!content.includes(oldUpdate)) {
  console.error('Could not find UPDATE block in cron.js');
  process.exit(1);
}

const fixed = content.replace(oldUpdate, newUpdate);
fs.writeFileSync('/var/www/arbnb/src/routes/cron.js', fixed);
console.log('cron.js updated');
console.log(fixed.substring(fixed.indexOf('const total'), fixed.indexOf('const total') + 200));