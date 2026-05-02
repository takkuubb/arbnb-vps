const http = require('http');

async function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: '127.0.0.1', port: 3002, path, method };
    const headers = {};
    if (body) { headers['Content-Type'] = 'application/json'; }
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
  const login = await req('POST', '/auth/login', { username: 'admin', password: 'admin1234' });
  const token = JSON.parse(login.body).token;

  // Check what /api/payouts returns
  const api = await req('GET', '/api/payouts?limit=3', null, token);
  console.log('Status:', api.status);
  console.log('Body:', api.body.substring(0, 2000));
}

main().catch(e => console.error(e.message));