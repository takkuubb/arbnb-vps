require('dotenv').config();
const { google } = require('googleapis');

function createGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3001/oauth2callback'
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function getBody(payload) {
  if (payload.body && payload.body.data) return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  if (payload.parts) {
    for (const part of payload.parts) {
      if ((part.mimeType === 'text/html' || part.mimeType === 'text/plain') && part.body && part.body.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) { const nested = getBody(part); if (nested) return nested; }
    }
  }
  return '';
}

async function main() {
  const gmail = createGmailClient();
  const response = await gmail.users.messages.list({
    userId: 'me', q: 'subject:(reservation reminder) from:airbnb.com', maxResults: 20
  });
  const messages = response.data.messages || [];
  for (const msg of messages.slice(0, 1)) {
    const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
    const body = getBody(full.data.payload);
    const idx = body.indexOf('Identity verified');
    console.log('Identity section:');
    console.log(body.substring(idx, idx + 800));
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });