require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { getDb } = require('./db');
const authRouter = require('./routes/auth');
const apiRouter = require('./routes/api');
const cronRouter = require('./routes/cron');

const app = express();
const PORT = process.env.PORT || 3002;
const BASE = '/arbnb';
const VIEWS_DIR = path.join(__dirname, 'views');

app.set('trust proxy', 1);

// Custom JSON body parser - handles parse errors gracefully
// This replaces express.json() and prevents crashes on malformed JSON
app.use((req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (!ct.includes('application/json')) {
    req.body = undefined;
    return next();
  }
  let data = Buffer.from('');
  req.on('data', chunk => { data = Buffer.concat([data, chunk]); });
  req.on('end', () => {
    if (!data.length) { req.body = undefined; return next(); }
    try {
      req.body = JSON.parse(data.toString());
    } catch (e) {
      console.error('[JSON Parse Error]', req.method, req.path, e.message.slice(0, 100));
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    next();
  });
  req.on('error', next);
});

app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'arbnb-dev-secret',
  resave: false,
  saveUninitialized: false,
  name: 'arbnb.sid',
  cookie: { secure: false, httpOnly: true, maxAge: 7*24*60*60*1000 }
}));

// Catch all other errors
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.use('/auth', authRouter);
app.use('/api', apiRouter);
app.use('/cron', cronRouter);

// Login page is public
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'login.html'));
});

// Static files (dashboard.html) - no-cache to prevent browser caching issues
app.use(express.static(VIEWS_DIR, {
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// Root -> dashboard
app.get('/', (req, res) => {
  res.redirect(BASE + '/dashboard.html');
});

getDb();
app.listen(PORT, '0.0.0.0', () => { console.log('arbnb on port ' + PORT); });

if (process.env.GOOGLE_REFRESH_TOKEN) {
  const { fetchPayoutEmails, savePayouts } = require('./gmail');
  setInterval(async () => {
    try {
      const emails = await fetchPayoutEmails(30);
      const saved = await savePayouts(emails);
      console.log('[CRON] Scanned ' + emails.length + ', saved ' + saved);
    } catch (e) { console.error('[CRON] Error:', e.message); }
  }, 60*60*1000);
}