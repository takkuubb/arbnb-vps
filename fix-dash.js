const fs = require('fs');
let html = fs.readFileSync('/var/www/arbnb/src/views/dashboard.html', 'utf8');

// 1. Add missing stat-card HTML (after the 3rd one)
const old3Cards = `<div class=\"stat-card\"><div class=\"val\" id=\"s-avg-night\">—</div><div class=\"lbl\">平均1泊金額</div><div class=\"sub\" id=\"s-count-month\">今月 — 件</div></div>
</div>`;

const new6Cards = `<div class=\"stat-card\"><div class=\"val\" id=\"s-avg-night\">—</div><div class=\"lbl\">平均1泊金額</div><div class=\"sub\" id=\"s-count-month\">今月 — 件</div></div>
  <div class=\"stat-card\"><div class=\"val\" id=\"s-total-guests\">—</div><div class=\"lbl\">合計ゲスト数</div><div class=\"sub\" id=\"s-avg-adults\">平均 — 人/組</div></div>
</div>`;

if (!html.includes(old3Cards)) {
  console.error('Could not find the 3-card block');
  // Show what's there
  const idx = html.indexOf('s-avg-night');
  console.log('Around s-avg-night:', html.substring(idx-20, idx+200));
  process.exit(1);
}

html = html.replace(old3Cards, new6Cards);
console.log('Stats HTML updated');

// 2. Update updateStats function to add totalGuests and avgAdults
const scriptStart = html.indexOf('<script>') + '<script>'.length;
const scriptEnd = html.lastIndexOf('</script>');
const script = html.substring(scriptStart, scriptEnd);

const oldUpdateStats = `document.getElementById('s-count-month').textContent = '先月 ' + lastMonth.length + '件';
  }`;

const newUpdateStats = `document.getElementById('s-count-month').textContent = '先月 ' + lastMonth.length + '件';
    var totalGuests = payouts.reduce(function(s, p) { return s + (p.guests_total || p.guests_adult || 0); }, 0);
    var guestsWithData = payouts.filter(function(p) { return p.guests_total || p.guests_adult; });
    var avgAdults = guestsWithData.length > 0 ? (guestsWithData.reduce(function(s, p) { return s + (p.guests_adult || 1); }, 0) / guestsWithData.length).toFixed(1) : 0;
    document.getElementById('s-total-guests').textContent = totalGuests;
    document.getElementById('s-avg-adults').textContent = '平均 ' + avgAdults + ' 人/組';
  }`;

if (!script.includes(oldUpdateStats)) {
  console.error('Could not find end of updateStats');
  console.log(script.substring(script.indexOf('function updateStats') + 500, script.indexOf('function updateStats') + 900));
  process.exit(1);
}

const newScript = script.replace(oldUpdateStats, newUpdateStats);
const newHTML = html.substring(0, scriptStart) + newScript + html.substring(scriptEnd);

fs.writeFileSync('/var/www/arbnb/src/views/dashboard.html', newHTML);
console.log('Dashboard fixed');
// Verify
const check = fs.readFileSync('/var/www/arbnb/src/views/dashboard.html', 'utf8');
console.log('stat-card count:', (check.match(/<div class=\"stat-card\">/g) || []).length);
console.log('s-total-guests:', check.includes('s-total-guests'));
console.log('totalGuests:', check.includes('totalGuests'));