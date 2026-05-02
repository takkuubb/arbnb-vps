const express = require('express');
const db = require('../db');
const gmail = require('../gmail');
const { fetchReminderEmails } = require('../parse-reminder');
const { verifyToken } = require('../tokens');

const router = express.Router();

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) {
    const user = verifyToken(auth.substring(7));
    if (user) {
      req.session.userId = user.userId;
      req.session.username = user.username;
      return next();
    }
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

router.get('/me', requireAuth, (req, res) => {
  res.json({ userId: req.session.userId, username: req.session.username });
});

router.get('/payouts', requireAuth, (req, res) => {
  let { search = '', sort = 'payout_date', order = 'desc', limit = 500 } = req.query;
  // Handle sort_desc format (from dashboard column clicks)
  if (sort.endsWith('_desc')) {
    sort = sort.replace('_desc', '');
    order = 'desc';
  }
  const payouts = db.getPayouts({ search, sort, order, limit: parseInt(limit) });
  res.json({ total: payouts.length, payouts });
});

router.post('/scan', async (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) {
    return res.status(503).json({ success: false, error: 'Gmail API未設定' });
  }
  try {
    const result = await gmail.scanGmail();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scan-reminders', async (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) {
    return res.status(503).json({ success: false, error: 'Gmail API未設定' });
  }
  try {
    const reminders = await fetchReminderEmails(200);
    let updated = 0, total = reminders.length;
    const stmt = db.getDb().prepare('UPDATE payouts SET guests_total = ?, guests_adult = ?, guests_child = ?, guests_infant = ? WHERE reservation_code = ?');
    for (const r of reminders) {
      if (!r.reservationCode) continue;
      const existing = db.getPayoutByResCode(r.reservationCode);
      if (existing) { stmt.run((r.adults||1)+(r.children||0)+(r.infants||0), r.adults||1, r.children||0, r.infants||0, r.reservationCode); updated++; }
    }
    res.json({ success: true, remindersFound: total, updatedRecords: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/payouts', requireAuth, (req, res) => {
  const { guestName, amountValue, reservationCode, payoutDate, stayDetails, listingTitle } = req.body;
  if (!guestName || !amountValue) return res.status(400).json({ error: '必須項目がありません' });
  const id = db.addPayout({ guestName, amountOriginal: '\\u00a5' + amountValue, amountValue, reservationCode: reservationCode || '', payoutDate: payoutDate || new Date().toISOString(), stayDetails: stayDetails || '', listingTitle: listingTitle || '' });
  res.json({ success: true, id });
});

module.exports = router;
