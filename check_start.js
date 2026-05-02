require('dotenv').config();
const { google } = require('googleapis');

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

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '').replace(/\u00a0/g, ' ').replace(/\u200b/g, '')
    .replace(/[\r\n]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function main() {
  const response = await gmail.users.messages.list({ userId: 'me', q: 'subject:(payout) from:airbnb.com', maxResults: 1 });
  const msg = response.data.messages[0];
  const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
  const body = getBody(full.data.payload);
  const text = stripHtml(body);

  console.log('First 200 chars:', JSON.stringify(text.substring(0, 200)));
  console.log('\nChecking payout patterns:');
  console.log('  We sent a payout:', text.match(/We sent a payout/i));
  console.log('  we sent a payout:', text.match(/we sent a payout/i));
  console.log('  sent a payout:', text.match(/sent a payout/i));
  console.log('  was sent today:', text.match(/was sent today/i));
  console.log('  payout:', text.match(/payout/i));

  // Check the subject too
  console.log('\nSubject:', text.substring(0, 100));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });