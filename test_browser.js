const https = require('https');

function req(path, method, body, headers) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'app-ai.xvps.jp', path, method,
      headers: { 'Host': 'app-ai.xvps.jp', ...headers }
    };
    const r = https.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
    });
    r.on('error', e => resolve({ status: 0, body: e.message }));
    if (body) r.write(body);
    r.end();
  });
}

async function main() {
  const jar = [];

  // 1. Load login page
  const loginPage = await req('/arbnb/login.html', 'GET', null, {});
  console.log('1. Login page:', loginPage.status);

  // 2. Login
  const body = JSON.stringify({ username: 'admin', password: 'AdminPass2024!' });
  const login = await req('/arbnb/auth/login', 'POST', body, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Origin': 'https://app-ai.xvps.jp',
    'Referer': 'https://app-ai.xvps.jp/arbnb/login.html'
  });
  console.log('2. Login:', login.status, login.body.substring(0, 100));
  if (login.headers['set-cookie']) {
    console.log('   Set-Cookie:', login.headers['set-cookie']);
    login.headers['set-cookie'].forEach(c => {
      const m = c.match(/^([^=]+)=([^;]+)/);
      if (m) jar.push(m[1] + '=' + m[2]);
    });
  }

  const cookieStr = jar.join('; ');
  console.log('   Cookie jar:', cookieStr.substring(0, 80));

  // 3. GET /api/me with session cookie
  const me = await req('/arbnb/api/me', 'GET', null, {
    'Cookie': cookieStr,
    'Origin': 'https://app-ai.xvps.jp',
    'Referer': 'https://app-ai.xvps.jp/arbnb/dashboard.html'
  });
  console.log('3. /api/me:', me.status, me.body.substring(0, 200));

  // 4. GET /api/payouts
  const pay = await req('/arbnb/api/payouts?sort=payout_date&order=desc', 'GET', null, {
    'Cookie': cookieStr,
    'Origin': 'https://app-ai.xvps.jp',
    'Referer': 'https://app-ai.xvps.jp/arbnb/dashboard.html'
  });
  console.log('4. /api/payouts:', pay.status, pay.body.substring(0, 200));
}

main().catch(console.error);