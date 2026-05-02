// Get matched codes BEFORE and AFTER running scan-reminders
const { getDb } = require('/var/www/arbnb/src/db');
const http = require('http');

async function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: '127.0.0.1', port: 3002, path, method };
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = 'Bearer ' + token;
    opts.headers = headers;
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({ _raw: d.substring(0,500) }); } });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function main() {
  const login = await req('POST', '/auth/login', { username: 'admin', password: 'admin1234' });
  const token = login.token;
  
  // Get BEFORE state
  const db = getDb();
  const before = db.prepare('SELECT reservation_code, guests_total FROM payouts WHERE guests_total > 1').all();
  console.log('BEFORE scan-reminders, matched:', before.length);
  before.forEach(r => console.log(' ', r.reservation_code, '->', r.guests_total));
  
  // Run scan-reminders
  console.log('\nRunning scan-reminders...');
  const result = await req('POST', '/api/scan-reminders', null, token);
  console.log('Result:', JSON.stringify(result));
  
  // Get AFTER state
  const after = db.prepare('SELECT reservation_code, guests_total FROM payouts WHERE guests_total > 1').all();
  console.log('\nAFTER scan-reminders, matched:', after.length);
  after.forEach(r => console.log(' ', r.reservation_code, '->', r.guests_total));
  
  // Find NEW matches
  const newMatches = after.filter(a => !before.find(b => b.reservation_code === a.reservation_code));
  console.log('\nNEW matches:', newMatches.length);
  newMatches.forEach(r => console.log(' ', r.reservation_code, '->', r.guests_total));
}
main().catch(e => console.error(e.message));