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

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, '\u00a0')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '').replace(/\u200b/g, '')
    .replace(/[\r\n]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
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
  
  const text = stripHtml(body);
  
  // Find line with Details
  const textLines = text.split('\n');
  for (let i = 0; i < textLines.length; i++) {
    if (textLines[i].includes('Povilas')) {
      console.log('Line', i, ':', JSON.stringify(textLines[i]));
      // Show hex of first 50 chars
      console.log('Hex:', Buffer.from(textLines[i].substring(0,50)).toString('hex'));
    }
  }
  
  const result = parsePayoutEmail('test', body);
  console.log('Parsed:', result.length);
}

test().catch(e => console.error(e.message));
