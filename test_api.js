const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = { hostname: 'localhost', port: 3002, path, method: 'GET' };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Parse error: ' + data.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    // Test /api/payouts
    const data = await makeRequest('/api/payouts?limit=5');
    console.log(`Total records: ${data.total}`);
    console.log('\nRecent payouts:');
    data.payouts.forEach(p => {
      const date = p.payout_date ? p.payout_date.replace(/-/g, '/') : '----/--/--';
      console.log(`  ${p.guest_name} | ${p.nationality} | ¥${Number(p.amount).toLocaleString('ja-JP')} | ${p.stay_start}~${p.stay_end} | ${p.nights}泊 | ${p.reservation_code}`);
    });
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

main();