const http = require('http');

async function post(path, data, cookie) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
    if (cookie) headers['Cookie'] = cookie;
    const req = http.request({ hostname: 'localhost', port: 3002, path, method: 'POST', headers }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ data: JSON.parse(d), setCookie: res.headers['set-cookie'] }); } catch(e) { reject(new Error('Bad: ' + d.substring(0,200))); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function get(path, cookie) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (cookie) headers['Cookie'] = cookie;
    const req = http.request({ hostname: 'localhost', port: 3002, path, method: 'GET', headers }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(new Error('Bad: ' + d.substring(0,200))); } });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  // Login
  const loginRes = await post('/auth/login', { username: 'admin', password: 'AdminPass2024!' }, null);
  console.log('Login response:', JSON.stringify(loginRes.data));
  
  let cookie = null;
  if (loginRes.setCookie && loginRes.setCookie[0]) {
    const match = loginRes.setCookie[0].match(/arbnb.sid=([^;]+)/);
    if (match) cookie = 'arbnb.sid=' + match[1];
    console.log('Got cookie:', cookie);
  }

  if (cookie) {
    // Test /api/payouts
    const payouts = await get('/api/payouts?limit=5', cookie);
    console.log('\n=== payouts API ===');
    console.log('Total:', payouts.total);
    payouts.payouts.forEach(p => {
      const date = p.payout_date ? p.payout_date.replace(/-/g, '/') : '----/--/--';
      console.log(`  ${p.guest_name} | ${p.nationality} | ¥${Number(p.amount).toLocaleString('ja-JP')} | ${p.stay_start}~${p.stay_end} | ${p.nights}泊 | ${p.reservation_code}`);
    });

    // Test /api/me
    const me = await get('/api/me', cookie);
    console.log('\n=== /api/me ===');
    console.log(JSON.stringify(me));
  } else {
    console.log('No cookie obtained');
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });