const {getDb}=require('/var/www/arbnb/src/db');
const db=getDb();

const april = db.prepare('SELECT guest_name, amount_value, nights, stay_start, nationality, guests_total FROM payouts WHERE stay_start >= ? AND stay_start <= ? ORDER BY stay_start ASC LIMIT 5').all('2026-04-01','2026-04-29');
console.log('April sample:', JSON.stringify(april, null, 2));

const c=db.prepare('SELECT COUNT(*) as c FROM payouts WHERE stay_start >= ? AND stay_start <= ?').get('2026-04-01','2026-04-29');
console.log('April total:', c.c);

const bess=db.prepare('SELECT * FROM payouts WHERE guest_name LIKE ?').get('%Bess%');
console.log('Bess Chen:', JSON.stringify(bess));

const top=db.prepare('SELECT guest_name, amount_value, guests_total FROM payouts ORDER BY CAST(amount_value AS REAL) DESC LIMIT 3').all();
console.log('Top by amount:', JSON.stringify(top));

const guestTop=db.prepare('SELECT guest_name, amount_value, guests_total FROM payouts ORDER BY CAST(guests_total AS INTEGER) DESC LIMIT 3').all();
console.log('Top by guests:', JSON.stringify(guestTop));

const inv=db.prepare('SELECT COUNT(*) as c FROM payouts WHERE payout_date IS NULL OR payout_date = \"\"').get();
console.log('Invalid payout_date:', inv.c);