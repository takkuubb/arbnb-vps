const { getDb } = require('/var/www/arbnb/src/db');
const db = getDb();

const fixes = [
  ['Ming Fung Wong', 'Hong Kong（推測）'],
  ['Si Weng Lai', 'Macau（推測）'],
  ['Patinya Petcharit', 'Thailand（推測）'],
];
for (const [name, nat] of fixes) {
  const r = db.prepare('UPDATE payouts SET nationality=? WHERE guest_name=? AND (nationality IS NULL OR nationality = \u0027\u0027 OR nationality = \u0027(undefined)\u0027)').run(nat, name);
  console.log(r.changes > 0 ? 'Fixed: ' + name + ' → ' + nat : 'Not found: ' + name);
}

const remaining = db.prepare('SELECT COUNT(*) as c FROM payouts WHERE nationality IS NULL OR nationality = \u0027\u0027 OR nationality = \u0027(undefined)\u0027').get();
console.log('Remaining unknown:', remaining.c);

const total = db.prepare('SELECT COUNT(*) as c FROM payouts').get();
console.log('Total records:', total.c);
console.log('All with nationality: OK');

process.exit(0);