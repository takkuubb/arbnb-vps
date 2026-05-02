// Modify scan-reminders to fetch 200 reminders instead of 50
// and search for HME4N2CQDW specifically

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
  const login = await req('POST', '/auth/login', { username: 'admin', password: 'admin1234' });
  const token = login.token;
  
  // Try cron/scan with broader reminder search (200)
  console.log('Testing /cron/scan endpoint with more reminders...');
  const cron = await req('GET', '/cron/scan?secret=arbnb-cron-secret-2026', null, null);
  console.log('Cron result:', JSON.stringify(cron, null, 2));
}
main().catch(e => console.error(e.message));