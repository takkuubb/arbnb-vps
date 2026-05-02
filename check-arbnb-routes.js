const { execSync } = require('child_process');
// Check process actual command line
const r = execSync('ps aux | grep 219840 | head -3').toString();
console.log('Process:', r.substring(0, 400));

// Try both URL patterns
const r2 = execSync('curl -sv http://localhost:3002/arbnb/api/me 2>&1 | tail -10').toString();
console.log('/arbnb/api/me:', r2.substring(0,300));

// Check if there's a different base path
const r3 = execSync('curl -sv http://localhost:3002/api/me 2>&1 | tail -10').toString();
console.log('/api/me:', r3.substring(0,300));