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
      res.on('end', () => resolve(JSON.parse(d)));
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}
async function main() {
  const login = await req('POST', '/auth/login', { username: 'admin', password: 'admin1234' });
  const token = login.token;

  // Check amount_value sort
  const r1 = await req('GET', '/api/payouts?sort=amount_value_desc&limit=3', null, token);
  console.log('=== amount_value DESC ===');
  r1.payouts.forEach(p => console.log(' ', p.guest_name, '¥' + p.amount_value, '| guests:', p.guests_total ?? '—', '| nat:', p.nationality));

  // Check guests_total (should show null/— mostly)
  const r2 = await req('GET', '/api/payouts?sort=guests_total_desc&limit=5', null, token);
  console.log('\n=== guests_total DESC ===');
  r2.payouts.forEach(p => console.log(' ', p.guest_name, '| guests:', p.guests_total ?? '—', '| nat:', p.nationality));

  // Check nationality - top 5 by amount should have nationality
  const r3 = await req('GET', '/api/payouts?sort=nationality&limit=5', null, token);
  console.log('\n=== nationality ASC ===');
  r3.payouts.forEach(p => console.log(' ', p.guest_name, '| nat:', p.nationality || '(null)'));

  console.log('\nAll nationalities present:');
  const r4 = await req('GET', '/api/payouts?limit=10&sort=nationality', null, token);
  r4.payouts.forEach(p => console.log(' ', p.guest_name, '→', p.nationality || 'NULL'));
}
main().catch(e => console.error(e.message));