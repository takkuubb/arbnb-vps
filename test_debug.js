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
  const resp = await gmail.users.messages.list({ userId: 'me', q: 'subject:(payout) from:airbnb.com', maxResults: 1 });
  if (!resp.data.messages || resp.data.messages.length === 0) return;
  const msg = await gmail.users.messages.get({ userId: 'me', id: resp.data.messages[0].id, format: 'full' });
  const body = getBody(msg.data.payload);
  
  // Check for non-breaking spaces
  const hasNbsp = body.includes('\u00a0');
  console.log('Has NBSP:', hasNbsp);
  
  // Show the exact bytes around ¥
  const idx = body.indexOf('\u00a5');
  if (idx >= 0) {
    const before = body.substring(Math.max(0, idx-10), idx);
    const after = body.substring(idx, idx+15);
    console.log('Around ¥: before=<', Buffer.from(before).toString('hex'), '> after=<', Buffer.from(after).toString('hex'), '>');
    console.log('Before chars:', JSON.stringify(before));
  }
  
  const result = parsePayoutEmail('test', body);
  console.log('Parsed result count:', result.length);
  if (result.length > 0) console.log(JSON.stringify(result[0], null, 2));
}

test().catch(e => console.error(e.message));
