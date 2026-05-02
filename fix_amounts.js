require('dotenv').config();
const { google } = require('googleapis');
const parser = require('/var/www/arbnb/src/parser.js');
const dbModule = require('/var/www/arbnb/src/db.js');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/oauth2callback'
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

function getBody(payload) {
  if (payload.body && payload.body.data) return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  if (payload.parts) {
    for (const part of payload.parts) {
      if ((part.mimeType === 'text/html' || part.mimeType === 'text/plain') && part.body && part.body.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) { const n = getBody(part); if (n) return n; }
    }
  }
  return '';
}

async function main() {
  const db = dbModule.getDb();

  // Get all records with amount=0
  const zeroRecords = db.prepare('SELECT id, reservation_code FROM payouts_new WHERE amount = 0').all();
  console.log(`Found ${zeroRecords.length} records with amount=0`);

  // Re-fetch and re-parse all emails to get correct amounts
  const response = await gmail.users.messages.list({ userId: 'me', q: 'subject:(payout) from:airbnb.com', maxResults: 30 });
  const messages = response.data.messages || [];

  const codeToAmount = {};
  const codeToPerNight = {};

  for (const msg of messages) {
    const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
    const headers = full.data.payload.headers;
    const getHeader = (n) => headers.find(h => h.name.toLowerCase() === n.toLowerCase())?.value || '';
    const results = parser.parsePayoutEmail(getHeader('subject'), getBody(full.data.payload));
    for (const r of results) {
      codeToAmount[r.reservationCode] = r.amount;
      codeToPerNight[r.reservationCode] = r.amountPerNight;
    }
  }

  console.log(`Amount map has ${Object.keys(codeToAmount).length} entries`);

  // Update records with correct amounts
  const update = db.prepare('UPDATE payouts_new SET amount = ?, amount_per_night = ? WHERE id = ?');
  let updated = 0;
  for (const rec of zeroRecords) {
    if (codeToAmount[rec.reservation_code] !== undefined && codeToAmount[rec.reservation_code] > 0) {
      update.run(codeToAmount[rec.reservation_code], codeToPerNight[rec.reservation_code] || 0, rec.id);
      updated++;
    }
  }
  console.log(`Updated ${updated} records`);

  // Verify
  const rows = db.prepare('SELECT * FROM payouts_new ORDER BY id').all();
  console.log(`\nTotal: ${rows.length} records`);
  let totalAmount = 0;
  rows.forEach(row => {
    totalAmount += row.amount;
    console.log(`  ${row.guest_name} | ${row.nationality} | ¥${row.amount.toLocaleString('ja-JP')} | ${row.stay_start}~${row.stay_end} | ${row.nights}泊 | ${row.reservation_code}`);
  });
  console.log(`\nTotal amount: ¥${totalAmount.toLocaleString('ja-JP')}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });