const fs = require('fs');
const path = '/var/www/arbnb/src/db.js';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: Add guests_* to allowedSorts
content = content.replace(
  /const allowedSorts = \/\uff08(.+?)\uff08\//,
  (m, old) => {
    const existing = old.split(',').map(s => s.trim().replace(/'/g,''));
    const add = ['guests_total','guests_adult','guests_child','guests_infant'];
    const merged = [...existing, ...add.filter(a => !existing.includes(a))];
    return 'const allowedSorts = /* */' + JSON.stringify(merged) + '//';
  }
);

// Fix 2: Replace ORDER BY with CAST for numeric columns
content = content.replace(
  /query \/\/ ORDER BY \/\n  query \/= ' ORDER BY ' \/\\+ s \/\\+ ' '\/\\+ o \/\\+ ' LIMIT '/,
  `query += ' ORDER BY ' + s + ' ' + o + ' LIMIT '`
);

// Actually, let me do a cleaner replacement
const oldQuery = `query += ' ORDER BY ' + s + ' ' + o + ' LIMIT ' + l;`;
const newQuery = `// Numeric columns need CAST for correct ordering
  const numericCols = ['amount_value','nights','amount_per_night','guests_total','guests_adult','guests_child','guests_infant','payout_date'];
  const orderExpr = numericCols.includes(s)
    ? 'CAST(' + s + ' AS REAL) ' + o
    : s + ' ' + o;
  query += ' ORDER BY ' + orderExpr + ' LIMIT ' + l;`;

if (content.includes(oldQuery)) {
  content = content.replace(oldQuery, newQuery);
  fs.writeFileSync(path, content);
  console.log('SUCCESS: db.js updated');
  console.log('New content around ORDER BY:');
  const idx = content.indexOf('ORDER BY');
  console.log(content.substring(idx, idx + 200));
} else {
  console.log('Could not find target line. Current content:');
  const idx = content.indexOf('ORDER BY');
  console.log(content.substring(idx - 50, idx + 200));
}