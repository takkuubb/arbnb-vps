const fs = require('fs');
// Just show relevant lines from parse-reminder
const pr = fs.readFileSync('/var/www/arbnb/src/routes/parse-reminder.js', 'utf8');
const prLines = pr.split('\n');
prLines.forEach((l, i) => {
  if (l.includes('national') || l.includes('country') || l.includes('estimated')) {
    console.log('PR', i+1, l.trim());
  }
});
// Also check api.js
const api = fs.readFileSync('/var/www/arbnb/src/routes/api.js', 'utf8');
const apiLines = api.split('\n');
apiLines.forEach((l, i) => {
  if (l.includes('national') || l.includes('estimated')) {
    console.log('API', i+1, l.trim());
  }
});