const https = require('https');

async function req(path, method, body, headers) {
  return new Promise((resolve) => {
    const opts = { hostname: 'app-ai.xvps.jp', path, method,
      headers: { 'Host': 'app-ai.xvps.jp', ...headers }};
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
  
  // Simulate full browser flow
  // 1. Load login page
  await req('/arbnb/login.html', 'GET', null, {});
  
  // 2. Login (like browser would)
  const body = JSON.stringify({ username: 'admin', password: 'AdminPass2024!' });
  const login = await req('/arbnb/auth/login', 'POST', body, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Origin': 'https://app-ai.xvps.jp',
    'Referer': 'https://app-ai.xvps.jp/arbnb/login.html'
  });
  
  if (login.headers['set-cookie']) {
    login.headers['set-cookie'].forEach(c => {
      const m = c.match(/^([^=]+)=([^;]+)/);
      if (m) jar.push(m[1] + '=' + m[2]);
    });
  }
  const cookieStr = jar.join('; ');
  console.log('Cookie name:', cookieStr.split('=')[0]);
  console.log('Cookie path check:', login.headers['set-cookie'][0]);
  
  // 3. Load dashboard (like browser would - sets document.referrer)
  await req('/arbnb/dashboard.html', 'GET', null, {
    'Referer': 'https://app-ai.xvps.jp/arbnb/login.html'
  });
  
  // 4. API call with cookie
  const me = await req('/arbnb/api/me', 'GET', null, {
    'Cookie': cookieStr,
    'Origin': 'https://app-ai.xvps.jp',
    'Referer': 'https://app-ai.xvps.jp/arbnb/dashboard.html'
  });
  console.log('/api/me status:', me.status, '| body:', me.body);
  
  const pay = await req('/arbnb/api/payouts?sort=payout_date&order=desc', 'GET', null, {
    'Cookie': cookieStr,
    'Origin': 'https://app-ai.xvps.jp',
    'Referer': 'https://app-ai.xvps.jp/arbnb/dashboard.html'
  });
  console.log('/api/payouts status:', pay.status, '| payouts count:', JSON.parse(pay.body).payouts?.length);
}

main().catch(console.error);