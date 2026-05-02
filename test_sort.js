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
  const login = await req('POST', '/auth/login', { username: 'admin', password: 'admin1234' });
  const token = login.body.token;

  // Test amount_value sort
  const r1 = await req('GET', '/api/payouts?sort=amount_value_desc&limit=3', null, token);
  console.log('=== amount_value DESC ===');
  r1.body.payouts.forEach(p => console.log(' ', p.guest_name, '¥' + p.amount_value, '| guests:', p.guests_total, '| nationality:', p.nationality));

  // Test guests_total sort
  const r2 = await req('GET', '/api/payouts?sort=guests_total_desc&limit=5', null, token);
  console.log('\n=== guests_total DESC ===');
  r2.body.payouts.forEach(p => console.log(' ', p.guest_name, '| guests:', p.guests_total, '| nationality:', p.nationality));

  // Test nights sort
  const r3 = await req('GET', '/api/payouts?sort=nights_desc&limit=3', null, token);
  console.log('\n=== nights DESC ===');
  r3.body.payouts.forEach(p => console.log(' ', p.guest_name, p.nights + '泊', '| nationality:', p.nationality));
}
main().catch(e => console.error(e.message));