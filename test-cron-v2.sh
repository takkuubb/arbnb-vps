const { execSync } = require('child_process');
const result = execSync('curl -s http://localhost:3002/arbnb/cron/scan?secret=arbnb-cron-secret-2026', { timeout: 120000 });
console.log(result.toString().substring(0, 2000));