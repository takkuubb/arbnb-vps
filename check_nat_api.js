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
  const r = await req('GET', '/api/payouts?limit=20&sort=amount_value_desc', null, token);

  r.payouts.forEach(p => {
    const nat = p.nationality;
    const display = (nat && nat !== '(不明)') ? 'BADGE: ' + nat : 'DASH: —';
    console.log(p.guest_name, '| nat:', JSON.stringify(nat), '→', display);
  });
}
main().catch(e => console.error(e.message));