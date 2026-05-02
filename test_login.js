const https = require('https');
const crypto = require('crypto');

function makeRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  const host = 'app-ai.xvps.jp';
  const cookieStore = [];

  // Login
  const loginBody = JSON.stringify({ username: 'admin', password: 'AdminPass2024!' });
  const loginRes = await makeRequest({
    hostname: host, path: '/arbnb/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody), 'Host': host }
  }, loginBody);

  console.log('=== LOGIN ===');
  console.log('Status:', loginRes.status);
  console.log('Body:', loginRes.body.substring(0, 200));
  const setCookie = loginRes.headers['set-cookie'];
  if (setCookie) {
    console.log('Set-Cookie:', setCookie);
    setCookie.forEach(c => {
      const m = c.match(/^([^=]+)=([^;]+)/);
      if (m) cookieStore.push(m[1] + '=' + m[2]);
    });
  }

  // API/me
  const cookieStr = cookieStore.join('; ');
  console.log('\n=== /API/ME ===');
  const meRes = await makeRequest({
    hostname: host, path: '/arbnb/api/me', method: 'GET',
    headers: { 'Host': host, 'Cookie': cookieStr }
  }, null);
  console.log('Status:', meRes.status, 'Body:', meRes.body.substring(0, 200));

  // API/payouts
  console.log('\n=== /API/PAYOUTS ===');
  const payRes = await makeRequest({
    hostname: host, path: '/arbnb/api/payouts', method: 'GET',
    headers: { 'Host': host, 'Cookie': cookieStr }
  }, null);
  console.log('Status:', payRes.status, 'Body:', payRes.body.substring(0, 300));
}

main().catch(console.error);