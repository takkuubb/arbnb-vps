require('dotenv').config();
const { google } = require('googleapis');
const { parsePayoutEmail } = require('./src/parser');

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

async function test() {
  const resp = await gmail.users.messages.list({ userId: 'me', q: 'subject:(payout) from:airbnb.com', maxResults: 5 });
  if (!resp.data.messages || resp.data.messages.length === 0) { console.log('No messages'); return; }
  const msg = await gmail.users.messages.get({ userId: 'me', id: resp.data.messages[0].id, format: 'full' });
  const headers = msg.data.payload.headers;
  const getH = n => headers.find(h => h.name.toLowerCase() === n.toLowerCase())?.value || '';
  const subject = getH('subject');
  const body = getBody(msg.data.payload);
  console.log('Subject:', subject);
  console.log('Body:\n' + body);
  console.log('\n--- Parsed ---');
  const result = parsePayoutEmail(subject, body);
  console.log('Result:', JSON.stringify(result, null, 2));
}

test().catch(e => console.error(e.message));
