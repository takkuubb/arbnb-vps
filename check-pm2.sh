const { execSync } = require('child_process');
const fs = require('fs');
// Check what ports are listening
try {
  const r = execSync('ss -tlnp 2>/dev/null | grep -E \"3001|3002|3003\"').toString();
  console.log('Ports:', r.substring(0,500));
} catch(e) {}
// Check if pm2 is running the right thing
try {
  const p = execSync('pm2 jlist 2>/dev/null').toString();
  const apps = JSON.parse(p);
  apps.forEach(a => console.log(a.name, a.pm2_env ? a.pm2_env.env : 'no env'));
} catch(e) { console.log('pm2 jlist failed'); }
// Try direct node test
try {
  const r2 = execSync('curl -s http://localhost:3001/cron/scan?secret=arbnb-cron-secret-2026 2>&1 | head -c 200').toString();
  console.log('Port 3001:', r2.substring(0,200));
} catch(e) {}
try {
  const r3 = execSync('curl -s http://localhost:3002/cron/scan?secret=arbnb-cron-secret-2026 2>&1 | head -c 200').toString();
  console.log('Port 3002:', r3.substring(0,200));
} catch(e) {}