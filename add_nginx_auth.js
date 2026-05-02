const fs = require('fs');
const confPath = '/etc/nginx/sites-enabled/approval-workflow';

// Read current config
let content = fs.readFileSync(confPath, 'utf8');

// Add Authorization header to all arbnb proxy passes
// For each location /arbnb/ block, add the Authorization header proxy_set_header

// Fix the main /arbnb/ location
content = content.replace(
  'proxy_set_header X-Forwarded-Proto $scheme;',
  'proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_set_header Authorization $http_authorization;'
);

// Fix /arbnb/auth/ location
// This one already has the X-Forwarded-Proto line, add auth after it
content = content.replace(
  /location \/arbnb\/auth\/ {[^}]+proxy_set_header X-Forwarded-Proto \\\\$scheme;[^}]+}/s,
  (block) => block.replace('proxy_set_header X-Forwarded-Proto $scheme;', 'proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_set_header Authorization $http_authorization;')
);

console.log('Modified nginx config');
console.log(content.includes('Authorization') ? 'Authorization header ADDED' : 'Authorization header NOT added');

// Write back
fs.writeFileSync(confPath, content);
console.log('Written to', confPath);