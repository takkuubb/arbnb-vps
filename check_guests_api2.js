const http = require('http');
async function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: '127.0.0.1', port: 3002, path, method };
    const headers = {};
    if (body) { headers['Content-Type'] = 'application/json'; }
    opts.headers = headers;
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { resolve({ raw: d.substring(0, 300) }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}
async function main() {
  // Login to get token
  const login = await req('POST', '/auth/login', { username: 'admin', password: 'admin1234' });
  const token = login.token;
  if (!token) { console.log('Login failed:', JSON.stringify(login)); return; }
  console.log('Token obtained');

  // Now call payouts with Bearer token
  const req2 = (method, path, body, tok) => new Promise((resolve, reject) => {
    const opts = { hostname: '127.0.0.1', port: 3002, path, method };
    const h = {};
    if (body) h['Content-Type'] = 'application/json';
    if (tok) h['Authorization'] = 'Bearer ' + tok;
    opts.headers = h;
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({ _err: e.message, _raw: d.substring(0,200) }); } });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });

  const payouts = await req2('GET', '/api/payouts?limit=10&sort=guests_total_desc', null, token);
  console.log('Payouts total:', payouts.total);
  payouts.payouts.forEach(p => {
    const g = p.guests_total;
    const display = g > 1 ? g + '人' : (g === 1 ? '1人' : '—');
    console.log(p.guest_name + ' | guests:' + g + ' | adults:' + p.guests_adult + ' | nat:' + p.nationality + ' | disp:' + display);
  });
}
main().catch(e => console.error(e.message));