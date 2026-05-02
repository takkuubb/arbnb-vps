// Check what codes ARE being matched by scan-reminders
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
  // Login
  const login = await req('POST', '/auth/login', { username: 'admin', password: 'admin1234' });
  const token = login.token;
  
  // Get current state of matched records
  const db = getDb();
  
  // Records that have guests_total > 1 (matched by previous scans)
  const matched = db.prepare('SELECT reservation_code, guest_name, guests_total, guests_adult FROM payouts WHERE guests_total > 1').all();
  console.log('=== Currently matched (guests_total > 1) ===');
  matched.forEach(r => console.log(r.reservation_code, '|', r.guest_name, '|', r.guests_total, 'adults'));
  
  // Show all DB reservation codes
  const all = db.prepare('SELECT reservation_code, guest_name FROM payouts ORDER BY reservation_code').all();
  console.log('\n=== All DB codes (first 20) ===');
  all.slice(0, 20).forEach(r => console.log(r.reservation_code, '|', r.guest_name));
  
  // Check: what % of DB codes have HME4 prefix?
  const hme4 = all.filter(r => r.reservation_code && r.reservation_code.startsWith('HME4'));
  console.log('\nDB codes starting with HME4:', hme4.length);
  hme4.forEach(r => console.log(' ', r.reservation_code, '|', r.guest_name));
  
  // Check for similar codes like HME, HMEX etc
  const hmex = all.filter(r => r.reservation_code && r.reservation_code.startsWith('HME'));
  console.log('\nDB codes starting with HME:', hmex.length);
}
main().catch(e => console.error(e.message));