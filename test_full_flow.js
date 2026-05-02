const https = require('https');
const http = require('http');
const crypto = require('crypto');

const BASE_HOST = 'app-ai.xvps.jp';
const BASE_PATH = '/arbnb';
const COOKIE_JAR = [];

// Simple HTTP client that handles cookies and HTTPS redirect
function httpRequest(opts, cookieJar) {
  return new Promise((resolve, reject) => {
    const isHttps = opts.host === BASE_HOST && (opts.port === 443 || !opts.port);
    const mod = isHttps ? https : http;
    
    const options = {
      hostname: opts.host || opts.hostname,
      port: opts.port,
      path: opts.path,
      method: opts.method || 'GET',
      headers: { ...opts.headers },
    };
    
    // Add cookies
    if (cookieJar.length > 0) {
      const cookieStr = cookieJar.map(c => c.name + '=' + c.value).join('; ');
      options.headers['Cookie'] = cookieStr;
    }
    
    const req = mod.request(options, (res) => {
      // Collect cookies
      const setCookies = res.headers['set-cookie'];
      if (setCookies) {
        setCookies.forEach(sc => {
          const [pair] = sc.split(';');
          const [name, value] = pair.split('=');
          cookieJar.push({ name: name.trim(), value: value.trim(), raw: sc });
        });
      }
      
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function main() {
  console.log('=== Step 1: Get dashboard ===');
  const r1 = await httpRequest({
    host: BASE_HOST, port: 443,
    path: BASE_PATH + '/dashboard.html',
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0' }
  }, COOKIE_JAR);
  console.log('Status:', r1.status);
  console.log('Cookies after GET:', COOKIE_JAR.map(c => c.name));
  
  console.log('\n=== Step 2: Login ===');
  const loginData = JSON.stringify({ username: 'admin', password: 'admin1234' });
  const r2 = await httpRequest({
    host: BASE_HOST, port: 443,
    path: BASE_PATH + '/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0',
      'Content-Length': Buffer.byteLength(loginData)
    },
    body: loginData
  }, COOKIE_JAR);
  console.log('Status:', r2.status);
  console.log('Login response:', r2.body.substring(0, 200));
  console.log('Cookies after login:', COOKIE_JAR.map(c => c.name + '=' + c.value.substring(0, 20)));
  
  console.log('\n=== Step 3: Get payouts API ===');
  const r3 = await httpRequest({
    host: BASE_HOST, port: 443,
    path: BASE_PATH + '/api/payouts?limit=3',
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0' }
  }, COOKIE_JAR);
  console.log('Status:', r3.status);
  console.log('API response:', r3.body.substring(0, 500));
  
  console.log('\n=== Step 4: Check session value ===');
  const sessionCookie = COOKIE_JAR.find(c => c.name === 'arbnb.sid');
  if (sessionCookie) {
    console.log('Session cookie found:', sessionCookie.name + '=' + sessionCookie.value.substring(0, 30) + '...');
    // Decode base64 to check value
    try {
      const decoded = Buffer.from(sessionCookie.value.split('.')[0] || sessionCookie.value, 'base64').toString('utf8');
      console.log('Session decoded:', decoded);
    } catch(e) {}
  } else {
    console.log('No session cookie!');
  }
}

main().catch(e => console.error('Error:', e));