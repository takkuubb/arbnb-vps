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
  const sc = headers['set-cookie'];
  if (sc) fs.writeFileSync(COOKIE_FILE, sc.join('; '));
}

function loadCookie() {
  try { return fs.readFileSync(COOKIE_FILE, 'utf8'); } catch(e) { return ''; }
}

async function main() {
  // Login
  const body = JSON.stringify({ username: 'admin', password: 'AdminPass2024!' });
  const loginRes = await request('/arbnb/auth/login', 'POST', {
    'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body),
    'Referer': 'https://app-ai.xvps.jp/arbnb/login.html', 'Origin': 'https://app-ai.xvps.jp'
  }, body);
  console.log('Login:', loginRes.status, loginRes.body);
  saveCookie(loginRes.headers);
  const cookie = loadCookie();

  if (!cookie) { console.log('No cookie'); process.exit(1); }

  // Dashboard HTML (check new version)
  const dashRes = await request('/arbnb/dashboard.html', 'GET', { Cookie: cookie }, null);
  console.log('Dashboard HTML size:', dashRes.body.length, '(expected ~12897 for new version)');
  console.log('Has BASE variable:', dashRes.body.includes('var BASE'));

  // Fetch API and render check
  const apiRes = await request('/arbnb/api/payouts?sort=amount&order=desc&limit=5', 'GET', { Cookie: cookie }, null);
  if (apiRes.status === 200) {
    const data = JSON.parse(apiRes.body);
    console.log('\n=== Top 5 by amount ===');
    console.log('Total records:', data.total);
    let totalAmount = 0;
    data.payouts.forEach(p => {
      totalAmount += p.amount;
      console.log('  ¥' + Number(p.amount).toLocaleString('ja-JP') + ' | ' + p.guest_name + ' | ' + p.nationality + ' | ' + p.stay_start + ' ' + p.nights + '泊 | ' + p.reservation_code);
    });
    console.log('Sum of top 5:', '¥' + totalAmount.toLocaleString('ja-JP'));
  }

  // Check if API returns total
  const allRes = await request('/arbnb/api/payouts?limit=0', 'GET', { Cookie: cookie }, null);
  if (allRes.status === 200) {
    const allData = JSON.parse(allRes.body);
    const allTotal = (allData.payouts || []).reduce((s,r) => s + (parseInt(r.amount) || 0), 0);
    console.log('\nAll records:', allData.total, 'Total amount: ¥' + allTotal.toLocaleString('ja-JP'));
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });