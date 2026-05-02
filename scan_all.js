require('dotenv').config();
const { google } = require('googleapis');

function createGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/oauth2callback'
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    scope: ['https://www.googleapis.com/auth/gmail.readonly']
  });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function getBody(payload) {
  if (payload.body && payload.body.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' || part.mimeType === 'text/plain') {
        if (part.body && part.body.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }
      if (part.parts) {
        const nested = getBody(part);
        if (nested) return nested;
      }
    }
  }
  return '';
}

async function main() {
  const gmail = createGmailClient();
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'subject:(payout OR payment OR sent) from:airbnb.com',
    maxResults: 6
  });
  const messages = response.data.messages || [];
  console.log('Found:', messages.length, 'emails\n');
  for (const msg of messages.slice(0, 6)) {
    const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
    const headers = full.data.payload.headers;
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    const body = getBody(full.data.payload);
    console.log('\n' + '='.repeat(70));
    console.log('Subject:', getHeader('subject'));
    console.log('Date:', getHeader('date'));
    console.log('\n--- FULL BODY ---');
    console.log(body.substring(0, 2500));
    console.log('...');
  }
}

main().catch(console.error);