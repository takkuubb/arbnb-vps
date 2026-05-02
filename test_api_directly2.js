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
  const login = await req('POST', '/auth/login', { username: 'admin', password: 'admin1234' });
  if (!login.body || !login.body.token) { console.log('Login failed'); return; }
  const token = login.body.token;

  // Explicitly test ASC vs DESC for amount_value
  const r1 = await req('GET', '/api/payouts?sort=amount_value&order=asc&limit=3', null, token);
  console.log('=== amount_value ASC ===');
  r1.body.payouts.forEach(p => console.log(' ', p.guest_name, '¥' + p.amount_value));

  const r2 = await req('GET', '/api/payouts?sort=amount_value&order=desc&limit=3', null, token);
  console.log('\n=== amount_value DESC ===');
  r2.body.payouts.forEach(p => console.log(' ', p.guest_name, '¥' + p.amount_value));

  // Test guests_adult (NOT in allowedSorts)
  const r3 = await req('GET', '/api/payouts?sort=guests_adult_desc&limit=5', null, token);
  console.log('\n=== guests_adult_desc (not in allowedSorts) ===');
  r3.body.payouts.forEach(p => console.log(' ', p.guest_name, 'adults:', p.guests_adult, 'total:', p.guests_total));

  // Test nights ASC
  const r4 = await req('GET', '/api/payouts?sort=nights&order=asc&limit=3', null, token);
  console.log('\n=== nights ASC ===');
  r4.body.payouts.forEach(p => console.log(' ', p.guest_name, p.nights + '泊'));
}
main().catch(e => console.error(e.message));