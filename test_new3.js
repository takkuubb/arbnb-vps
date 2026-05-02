// Test script: fetch real Gmail emails, parse, save to payouts_new
const { parsePayoutEmail } = require('./src/parser');
const { google } = require('googleapis');
require('dotenv').config();

function getBody(payload) {
  if (payload.body && payload.body.data) return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' || part.mimeType === 'text/plain') {
        if (part.body && part.body.data) return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) { const r = getBody(part); if (r) return r; }
    }
  }
  return '';
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// Use the app's db module
const { getDb } = require('./src/db');

async function main() {
  console.log('Fetching Airbnb payout emails...');
  const response = await gmail.users.messages.list({
    userId: 'me', q: 'subject:(payout) from:airbnb.com', maxResults: 30
  });
  const messages = response.data.messages || [];
  console.log('Found', messages.length, 'emails');

  const allRecords = [];
  for (const msg of messages) {
    const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
    const headers = full.data.payload.headers;
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    const subject = getHeader('subject');
    const body = getBody(full.data.payload);
    const results = parsePayoutEmail(subject, body);
    for (const r of results) {
      allRecords.push({ ...r, emailId: msg.id });
    }
  }

  console.log('Total records parsed:', allRecords.length);
  for (const r of allRecords.slice(0, 3)) {
    console.log('  - ' + r.guestName + ': ¥' + r.amount.toLocaleString() + ', date: ' + r.payoutDate);
  }

  // Save with INSERT OR REPLACE using the app's db module
  const db = getDb();
  const insert = db.prepare(`
    INSERT OR REPLACE INTO payouts_new
      (reservation_code, guest_name, nationality, listing_title, stay_start, stay_end, nights, amount, amount_per_night, payout_date, email_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let saved = 0;
  for (const r of allRecords) {
    insert.run(
      r.reservationCode, r.guestName, r.nationality, r.listingTitle,
      r.stayStart, r.stayEnd, r.nights, r.amount, r.amountPerNight,
      r.payoutDate, r.emailId
    );
    saved++;
  }
  console.log('Saved:', saved, 'records (INSERT OR REPLACE)');
  
  // Verify
  const rows = db.prepare('SELECT reservation_code, guest_name, amount, payout_date FROM payouts_new LIMIT 5').all();
  console.log('\nVerification - first 5 DB rows:');
  rows.forEach(r => console.log('  ' + r.guest_name + ': ¥' + r.amount + ', ' + r.payout_date));
}

main().catch(e => { console.error(e.message); process.exit(1); });