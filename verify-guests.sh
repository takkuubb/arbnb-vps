cd /var/www/arbnb && node -e '
const Database = require(\"./node_modules/better-sqlite3\");
const db = new Database(\"./arbnb.db\");
const rows = db.prepare(\"SELECT reservation_code, guest_name, guests_total, guests_adult, guests_child, guests_infant FROM payouts WHERE guests_total IS NOT NULL AND guests_total > 0 LIMIT 10\").all();
console.log(JSON.stringify(rows, null, 2));
const nullCount = db.prepare(\"SELECT COUNT(*) as c FROM payouts WHERE guests_total IS NULL OR guests_total = 0\").get();
const total = db.prepare(\"SELECT COUNT(*) as c FROM payouts\").get();
console.log(\"null/zero guest counts:\", nullCount.c, \"/ total:\", total.c);
db.close();
'