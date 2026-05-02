const fs = require('fs');
const content = fs.readFileSync('/var/www/arbnb/src/db.js', 'utf8');

const old = `const numericCols = ['amount_value','nights','amount_per_night','guests_total','guests_adult','guests_child','guests_infant','payout_date'];
  const orderExpr = numericCols.includes(s)
    ? 'CAST(' + s + ' AS REAL) ' + o
    : s + ' ' + o;`;

const fresh = `const numericCols = ['amount_value','nights','amount_per_night','guests_total','guests_adult','guests_child','guests_infant'];
  // payout_date is 'YYYY-MM-DD' — use julianday() for correct date sort
  const isDateCol = (s === 'payout_date');
  const orderExpr = isDateCol
    ? 'julianday(' + s + ') ' + o
    : numericCols.includes(s)
    ? 'CAST(' + s + ' AS REAL) ' + o
    : s + ' ' + o;`;

if (!content.includes(old)) {
  console.error('Pattern not found! Current code:');
  const idx = content.indexOf('numericCols');
  console.error(content.substring(idx, idx + 300));
  process.exit(1);
}

const fixed = content.replace(old, fresh);
fs.writeFileSync('/var/www/arbnb/src/db.js', fixed);

// Verify
const start = fixed.indexOf('const numericCols');
console.log('Fixed block:');
console.log(fixed.substring(start, start + 400));