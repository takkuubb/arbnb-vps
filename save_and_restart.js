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

  // Make sure payouts_new table exists
  db.exec(`CREATE TABLE IF NOT EXISTS payouts_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_code VARCHAR(20) UNIQUE NOT NULL,
    guest_name TEXT NOT NULL,
    nationality TEXT,
    listing_title TEXT,
    stay_start DATE,
    stay_end DATE,
    nights INTEGER DEFAULT 0,
    amount INTEGER DEFAULT 0,
    amount_per_night INTEGER DEFAULT 0,
    guests_adults INTEGER DEFAULT 0,
    guests_children INTEGER DEFAULT 0,
    guests_infants INTEGER DEFAULT 0,
    guests_total INTEGER DEFAULT 0,
    payout_date DATE,
    email_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  const response = await gmail.users.messages.list({ userId: 'me', q: 'subject:(payout) from:airbnb.com', maxResults: 20 });
  const messages = response.data.messages || [];

  const insert = db.prepare(`INSERT OR IGNORE INTO payouts_new
    (reservation_code, guest_name, nationality, listing_title, stay_start, stay_end, nights, amount, amount_per_night, payout_date, email_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  let totalSaved = 0;
  for (const msg of messages) {
    const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
    const headers = full.data.payload.headers;
    const getHeader = (n) => headers.find(h => h.name.toLowerCase() === n.toLowerCase())?.value || '';
    const results = parser.parsePayoutEmail(getHeader('subject'), getBody(full.data.payload));
    for (const r of results) {
      const res = insert.run(r.reservationCode, r.guestName, r.nationality, r.listingTitle,
        r.stayStart, r.stayEnd, r.nights, r.amount, r.amountPerNight, r.payoutDate, msg.id);
      if (res.changes > 0) totalSaved++;
    }
  }

  console.log(`Saved ${totalSaved} new records`);

  const rows = db.prepare('SELECT * FROM payouts_new ORDER BY id').all();
  console.log(`Total in DB: ${rows.length}`);
  rows.forEach(row => {
    console.log(`  ${row.guest_name} | ${row.nationality} | ¥${row.amount.toLocaleString('ja-JP')} | ${row.stay_start}~${row.stay_end} | ${row.nights}泊 | ${row.reservation_code}`);
  });

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });