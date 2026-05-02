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
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}
async function main() {
  const login = await req('POST', '/arbnb/auth/login', { username: 'admin', password: 'admin1234' });
  const token = login.body.token;
  console.log('Token obtained:', token ? 'YES' : 'NO');

  // Test what dashboard shows on load (no sort param = default)
  const r1 = await req('GET', '/arbnb/api/payouts?limit=5', null, token);
  console.log('\n=== Default (no sort) - first 5 ===');
  r1.body.payouts.forEach(p => console.log(' ', p.guest_name, '| nat:', p.nationality, '| guests:', p.guests_total ?? '—', '| amount:', p.amount_value));

  // Test amount sort
  const r2 = await req('GET', '/arbnb/api/payouts?sort=amount_value_desc&limit=3', null, token);
  console.log('\n=== amount_value DESC ===');
  r2.body.payouts.forEach(p => console.log(' ', p.guest_name, '¥' + p.amount_value, '| nat:', p.nationality, '| guests:', p.guests_total ?? '—'));

  // Test guests_total sort
  const r3 = await req('GET', '/arbnb/api/payouts?sort=guests_total_desc&limit=3', null, token);
  console.log('\n=== guests_total DESC ===');
  r3.body.payouts.forEach(p => console.log(' ', p.guest_name, '| guests:', p.guests_total ?? '—', '| nat:', p.nationality));

  // Show nationality distribution
  const r4 = await req('GET', '/arbnb/api/payouts?sort=nationality&limit=20', null, token);
  console.log('\n=== nationality sample ===');
  r4.body.payouts.forEach(p => console.log(' ', p.guest_name, '→', p.nationality || '(null)'));

  // Show all payout fields for first record
  console.log('\n=== First record all fields ===');
  console.log(JSON.stringify(r1.body.payouts[0], null, 2));
}
main().catch(e => console.error(e.message));