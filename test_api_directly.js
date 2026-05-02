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
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, raw: d.substring(0, 200) }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}
async function main() {
  // Login
  const login = await req('POST', '/auth/login', { username: 'admin', password: 'admin1234' });
  if (!login.body || !login.body.token) { console.log('Login failed', JSON.stringify(login)); return; }
  const token = login.body.token;
  console.log('Logged in');

  // Test amount_value ASC (what happens when dropdown selects 'amount_value')
  const r1 = await req('GET', '/api/payouts?sort=amount_value&limit=5', null, token);
  console.log('\n=== sort=amount_value (ASC) ===');
  r1.body.payouts.forEach(p => console.log(' ', p.guest_name, '¥' + p.amount_value));

  // Test amount_value DESC
  const r2 = await req('GET', '/api/payouts?sort=amount_value_desc&limit=5', null, token);
  console.log('\n=== sort=amount_value_desc (DESC) ===');
  r2.body.payouts.forEach(p => console.log(' ', p.guest_name, '¥' + p.amount_value));

  // Test what the default (no sort param) returns
  const r3 = await req('GET', '/api/payouts?limit=5', null, token);
  console.log('\n=== default sort (no param) ===');
  r3.body.payouts.forEach(p => console.log(' ', p.guest_name, '¥' + p.amount_value));

  // Test guests_total DESC
  const r4 = await req('GET', '/api/payouts?sort=guests_total_desc&limit=5', null, token);
  console.log('\n=== sort=guests_total_desc ===');
  r4.body.payouts.forEach(p => console.log(' ', p.guest_name, 'guests:', p.guests_total ?? '—', '| amount:', p.amount_value));
}
main().catch(e => console.error(e.message));