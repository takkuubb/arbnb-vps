const { google } = require('googleapis');
const { parsePayoutEmail } = require('./parser');
const { getDb } = require('./db');

function createGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/oauth2callback'
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

async function fetchPayoutEmails(maxResults = 30, startDate, endDate) {
  const gmail = createGmailClient();
  let query = 'subject:(payout) from:airbnb.com';
  if (startDate) query += ' after:' + startDate.replace(/-/g, '/');
  if (endDate) query += ' before:' + endDate.replace(/-/g, '/');
  const response = await gmail.users.messages.list({
    userId: 'me', q: query, maxResults: maxResults || 30
  });
  const messages = response.data.messages || [];
  const results = [];
  for (const msg of messages) {
    const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
    const headers = full.data.payload.headers;
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    const body = getBody(full.data.payload);
    const parsed = parsePayoutEmail(getHeader('subject'), body);
    if (parsed && parsed.length > 0) {
      for (const r of parsed) results.push({ ...r, emailId: msg.id, emailDate: getHeader('date') });
    }
  }
  return results;
}

function getBody(payload) {
  if (payload.body && payload.body.data) return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' || part.mimeType === 'text/plain') {
        if (part.body && part.body.data) return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) { const nested = getBody(part); if (nested) return nested; }
    }
  }
  return '';
}

async function savePayouts(emails) {
  const db = getDb();
  let saved = 0;
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO payouts
    (guest_name, nationality, listing_title, reservation_code,
     stay_start, stay_end, nights, amount_original, amount_value, amount_per_night,
     guests_total, guests_adult, guests_child, guests_infant, payout_date, email_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const email of emails) {
    if (!email.reservationCode) continue;
    const existing = db.prepare('SELECT id FROM payouts WHERE reservation_code = ?').get(email.reservationCode);
    if (existing) continue;
    const amountValue = email.amount || 0;
    const amountPerNight = email.nights > 0 ? Math.round(amountValue / email.nights) : 0;
    const amountOriginal = email.amountOriginal || ('\u00a5' + Number(amountValue).toLocaleString());
    const payoutDate = email.payoutDate || new Date().toISOString().split('T')[0];
    stmt.run(
      email.guestName || '',
      email.nationality || '',
      email.listingTitle || '',
      email.reservationCode || '',
      email.stayStart || '',
      email.stayEnd || '',
      email.nights || 0,
      amountOriginal,
      amountValue,
      amountPerNight,
      email.guests?.total || 1,
      email.guests?.adults || 1,
      email.guests?.children || 0,
      email.guests?.infants || 0,
      payoutDate,
      email.emailId || ''
    );
    saved++;
  }
  return saved;
}

module.exports = { fetchPayoutEmails, savePayouts };
