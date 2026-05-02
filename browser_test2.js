const https = require('https');
const fs = require('fs');

const HOST = 'app-ai.xvps.jp';
const COOKIE_FILE = '/tmp/arbnb_cookies.txt';

function request(path, method, headers, body) {
  return new Promise((resolve, reject) => {
    const options = { hostname: HOST, port: 443, path, method, headers, rejectUnauthorized: false };
    const req = https.request(options, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function saveCookie(headers) {
  const setCookie = headers['set-cookie'];
  if (setCookie) fs.writeFileSync(COOKIE_FILE, setCookie.join(', '));
}

function loadCookie() {
  try { return fs.readFileSync(COOKIE_FILE, 'utf8'); } catch(e) { return ''; }
}

async function main() {
  const body = JSON.stringify({ username: 'admin', password: 'AdminPass2024!' });
  const loginRes = await request('/arbnb/auth/login', 'POST', {
    'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body),
    'Referer': 'https://app-ai.xvps.jp/arbnb/login.html',
    'Origin': 'https://app-ai.xvps.jp'
  }, body);

  console.log('Login:', loginRes.status, loginRes.body.substring(0, 100));
  saveCookie(loginRes.headers);
  const cookie = loadCookie();

  if (loginRes.status === 200 && cookie) {
    const apiRes = await request('/arbnb/api/payouts?limit=3', 'GET', {
      Cookie: cookie,
      'Referer': 'https://app-ai.xvps.jp/arbnb/dashboard.html'
    }, null);
    console.log('API:', apiRes.status, apiRes.body.substring(0, 300));
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });