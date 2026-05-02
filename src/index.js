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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'arbnb-dev-secret',
  resave: false,
  saveUninitialized: false,
  name: 'arbnb.sid',
  cookie: { secure: false, httpOnly: true, maxAge: 7*24*60*60*1000 }
  // Removed sameSite:'lax' - was blocking cookies on same-origin fetch over HTTPS
}));

app.use('/auth', authRouter);
app.use('/api', apiRouter);
app.use('/cron', cronRouter);

// Login page is public
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(VIEWS_DIR, 'login.html'));
});

// Static files (dashboard.html) are public - auth is handled client-side via Bearer token
app.use(express.static(VIEWS_DIR));

// API routes have their own requireAuth in routes/api.js

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
