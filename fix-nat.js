const Database = require('better-sqlite3');
const db = new Database('/var/www/arbnb/arbnb.db');

// Step 1: Restore estimated nationality for all records using parser.js logic
function detectNationality(name) {
  if (!name) return null;
  const firstName = name.trim().split(/\u3000| /)[0];
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(name)) return 'Japan';
  if (/[\u4e00-\u9fff]/.test(name)) return 'China';
  if (/Kasparavicius/i.test(name)) return 'Lithuania';
  if (/Ngati/i.test(name)) return 'Philippines';
  if (/[가-힯]/.test(name)) return 'Korea';
  if (/[฀-๿]/.test(name)) return 'Thailand';
  if (/[֐-׿]/.test(name)) return 'Israel';
  if (/[-ۿ]/.test(name)) return 'Palestine';
  return null;
}

const all = db.prepare('SELECT id, guest_name FROM payouts').all();
const restoreStmt = db.prepare('UPDATE payouts SET nationality = ? WHERE id = ?');
let restored = 0;
all.forEach(r => {
  const nat = detectNationality(r.guest_name);
  if (nat) {
    restoreStmt.run(nat, r.id);
    restored++;
  }
});
console.log('Restored estimated nationality:', restored, 'records');

// Step 2: Clear current nationality (email-based) to re-extract properly
db.prepare('UPDATE payouts SET nationality = NULL').run();
console.log('Cleared nationality column');

// Verify
const after = db.prepare('SELECT COUNT(*) as c FROM payouts WHERE nationality IS NOT NULL').get();
console.log('Remaining with nationality:', after.c);
db.close();