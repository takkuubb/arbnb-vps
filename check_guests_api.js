const { getDb } = require('/var/www/arbnb/src/db');
const { createToken } = require('/var/www/arbnb/src/tokens');
const http = require('http');

const u = getDb().prepare('SELECT * FROM users WHERE username=?').get('admin');
const token = createToken(u);

const r = http.request({
  hostname: '127.0.0.1', port: 3002,
  path: '/api/payouts?limit=10&sort=guests_total_desc',
  headers: { 'Authorization': 'Bearer ' + token }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode, '| Body:', d.substring(0, 300));
    try {
      const data = JSON.parse(d);
      console.log('Total records:', data.total);
      (data.payouts || []).forEach(p => {
        const g = p.guests_total;
        const display = g > 1 ? g + '人' : (g === 1 ? '1人' : '—');
        console.log(p.guest_name + ' | guests:' + g + ' | adults:' + p.guests_adult + ' | display:' + display);
      });
    } catch(e) { console.log('JSON parse error:', e.message); }
  });
});
r.end();