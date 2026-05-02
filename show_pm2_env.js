const { execSync } = require('child_process');
try {
  const list = JSON.parse(execSync('pm2 jlist', { encoding: 'utf8' }));
  list.forEach(p => {
    const env = p.pm2_env || {};
    console.log(p.name, '| NODE_APP_INSTANCE:', env.NODE_APP_INSTANCE);
    const vars = env.env_vars || {};
    const google = Object.keys(vars).filter(k => k.includes('GOOGLE'));
    console.log('  GOOGLE vars:', google.map(k => k + '=' + vars[k]).join(', '));
  });
} catch(e) { console.error(e.message); }