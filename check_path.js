const path = require('path');
const __dirname = '/var/www/arbnb/src';
const VIEWS_DIR = path.join(__dirname, '..', 'views');
const VIEWS_DIR2 = path.join(__dirname, 'views');
console.log('VIEWS_DIR (../views):', VIEWS_DIR);
console.log('VIEWS_DIR (views):', VIEWS_DIR2);
console.log('login.html exists at VIEWS_DIR:', require('fs').existsSync(path.join(VIEWS_DIR, 'login.html')));
console.log('login.html exists at VIEWS_DIR2:', require('fs').existsSync(path.join(VIEWS_DIR2, 'login.html')));