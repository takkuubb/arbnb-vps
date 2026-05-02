const http = require('http');
const Database = require('better-sqlite3');
const db = new Database('/var/www/arbnb/arbnb.db');
const user = db.prepare('SELECT token FROM users LIMIT 1').get();
const token = user?.token || '';
console.log('Token found:', !!token);
db.close();

if (!token) { console.log('No token'); process.exit(1); }

const options = {
  hostname: '127.0.0.1',
  port: 3002,
  path: '/arbnb/api/payouts?limit=3',
  headers: { 'Authorization': 'Bearer ' + token }
};
http.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    const json = JSON.parse(data);
    console.log('Total:', json.total);
    if (json.payouts?.[0]) {
      const p = json.payouts[0];
      console.log('First payout:', p.guest_name, '| guests_total:', p.guests_total, '| nationality:', p.nationality);
      console.log('All keys:', Object.keys(p).join(', '));
    }
  });
}).on('error', e => console.error(e.message));