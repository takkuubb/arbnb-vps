const { execSync } = require('child_process');
process.chdir('/var/www/arbnb');
const result = execSync('curl -s http://127.0.0.1:3002/cron/scan?secret=arbnb-cron-secret-2026', { timeout: 90 });
console.log(result.toString().substring(0, 800));