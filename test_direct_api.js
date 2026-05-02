const http = require('http');
async function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: '127.0.0.1', port: 3002, path, method };
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (token) { headers['Authorization'] = 'Bearer ' + token; }
    opts.headers = headers;
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d), raw: d.substring(0,100) }); }
        catch(e) { resolve({ status: res.statusCode, raw: d.substring(0, 200) }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}
async function main() {
  // Login first (no /arbnb prefix needed on localhost)
  const login = await req('POST', '/auth/login', { username: 'admin', password: 'admin1234' });
  console.log('Login:', login.status, login.body.token ? 'OK' : 'FAIL');
  if (!login.body || !login.body.token) return;
  const token = login.body.token;

  // Test with /arbnb/ prefix (like the browser does via nginx)
  const r1 = await req('GET', '/arbnb/api/payouts?limit=3', null, token);
  console.log('\n=== /arbnb/api/payouts ===');
  console.log('Status:', r1.status);
  if (r1.body && r1.body.payouts) {
    r1.body.payouts.forEach(p => console.log(' ', p.guest_name, '¥' + p.amount_value, '| nat:', p.nationality, '| g:', p.guests_total ?? '—'));
  } else { console.log(r1.raw || JSON.stringify(r1.body)); }

  // Test without /arbnb/ prefix
  const r2 = await req('GET', '/api/payouts?limit=3', null, token);
  console.log('\n=== /api/payouts (no arbnb) ===');
  console.log('Status:', r2.status);
  if (r2.body && r2.body.payouts) {
    r2.body.payouts.forEach(p => console.log(' ', p.guest_name, '¥' + p.amount_value, '| nat:', p.nationality));
  }
}
main().catch(e => console.error(e.message));