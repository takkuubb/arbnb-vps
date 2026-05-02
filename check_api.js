const http = require('http');

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: '127.0.0.1', port: 3002, path, method };
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    opts.headers = headers;
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function main() {
  // Login
  const login = await req('POST', '/auth/login', { username: 'admin', password: 'admin1234' });
  console.log('Login:', login.status, login.body.substring(0, 200));
  const token = JSON.parse(login.body).token;
  if (!token) return;

  // Test API
  const api = await req('GET', '/api/payouts?limit=3', null, token);
  console.log('API:', api.status);
  const data = JSON.parse(api.body);
  data.forEach(p => console.log(' ', p.guest_name, '| nat:', p.nationality, '| guests:', p.guests_total, '| amount:', p.amount_value));
}

main().catch(e => console.error(e.message));