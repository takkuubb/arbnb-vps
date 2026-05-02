const express = require('express');
const { fetchPayoutEmails, savePayouts } = require('../gmail');
const { fetchReminderEmails } = require('../parse-reminder');

const router = express.Router();

// GET /cron/scan?secret=YOUR_CRON_SECRET
// Optional: &days=N (default 30)
// Optional: &start=YYYY-MM-DD&end=YYYY-MM-DD (overrides days)
router.get('/scan', async (req, res) => {
  const secret = req.query.secret;
  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  let payoutResult = { scanned: 0, newRecords: 0 };
  let reminderResult = { remindersFound: 0, updatedRecords: 0 };

  try {
    // Determine date range
    let days = parseInt(req.query.days || '30', 10);
    const startDate = req.query.start;
    const endDate = req.query.end;

    const emails = await fetchPayoutEmails(days, startDate, endDate);
    const saved = await savePayouts(emails);
    payoutResult = { scanned: emails.length, newRecords: saved };
  } catch (e) {
    console.error('[CRON] Payout scan error:', e.message);
  }

  try {
    const reminders = await fetchReminderEmails(200);
    const db = require('../db');
    const stmt = db.getDb().prepare('UPDATE payouts SET guests_total = ?, guests_adult = ?, guests_child = ?, guests_infant = ? WHERE reservation_code = ?');
    let updated = 0;
    for (const r of reminders) {
      if (!r.reservationCode) continue;
      const existing = db.getPayoutByResCode(r.reservationCode);
      if (existing) {
        const total = r.total || ((r.adults||1) + (r.children||0) + (r.infants||0));
        stmt.run(total, r.adults||1, r.children||0, r.infants||0, r.reservationCode);
        if (r.nationality) db.getDb().prepare('UPDATE payouts SET nationality = ? WHERE reservation_code = ?').run(r.nationality, r.reservationCode);
        updated++;
      }
    }
    reminderResult = { remindersFound: reminders.length, updatedRecords: updated };
  } catch (e) {
    console.error('[CRON] Reminder scan error:', e.message);
  }

  res.json({
    success: true,
    payoutScan: payoutResult,
    reminderScan: reminderResult,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
