const { execSync } = require('child_process');
// Check what process is on port 3002
const r1 = execSync('ss -tlnp | grep 3002').toString();
console.log('3002 process:', r1.substring(0, 200));

// Get the pid from above and check the process name
const pidMatch = r1.match(/pid=(\"),fd=/);
console.log('pid match:', JSON.stringify(pidMatch));

// Test both URL patterns
const r2 = execSync('curl -s http://localhost:3002/ 2>&1 | head -c 200').toString();
console.log('Port 3002 root:', r2.substring(0,200));
const r3 = execSync('curl -s http://localhost:3002/arbnb 2>&1 | head -c 200').toString();
console.log('Port 3002 /arbnb:', r3.substring(0,200));
const r4 = execSync('curl -s http://localhost:3002/cron/scan?secret=arbnb-cron-secret-2026 2>&1 | head -c 300').toString();
console.log('Port 3002 /cron/scan:', r4.substring(0,300));