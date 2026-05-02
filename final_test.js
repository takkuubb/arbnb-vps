require('dotenv').config();
const { google } = require('googleapis');
const parser = require('/var/www/arbnb/src/parser.js');

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
  const response = await gmail.users.messages.list({ userId: 'me', q: 'subject:(payout) from:airbnb.com', maxResults: 6 });
  const messages = response.data.messages || [];
  console.log(`Found ${messages.length} payout emails\n`);

  const allResults = [];
  for (const msg of messages) {
    const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
    const headers = full.data.payload.headers;
    const getHeader = (n) => headers.find(h => h.name.toLowerCase() === n.toLowerCase())?.value || '';
    const subject = getHeader('subject');
    const body = getBody(full.data.payload);
    const results = parser.parsePayoutEmail(subject, body);

    console.log(`Email: ${subject}`);
    console.log(`Guests found: ${results.length}`);
    for (const r of results) {
      console.log(`  ✓ ${r.guestName} | ${r.nationality} | ${r.listingTitle.substring(0,40)} | ${r.stayStart}~${r.stayEnd} | ${r.nights}泊 | ¥${r.amount.toLocaleString('ja-JP')} | ¥${r.amountPerNight.toLocaleString('ja-JP')}/泊 | ${r.reservationCode}`);
      allResults.push(r);
    }
    console.log('');
  }

  console.log(`Total guests parsed: ${allResults.length}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });