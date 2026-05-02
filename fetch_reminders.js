require('dotenv').config();
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/oauth2callback'
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

async function main() {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: 'subject:(reservation reminder) from:airbnb.com',
    maxResults: 5
  });
  const msgs = res.data.messages || [];
  console.log('Found:', msgs.length, 'emails\n');

  for (const msg of msgs.slice(0, 5)) {
    const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
    const headers = full.data.payload.headers;
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    const body = getBody(full.data.payload).replace(/\n+/g, '\n').substring(0, 2000);
    console.log('--- Email ---');
    console.log('Subject:', getHeader('subject'));
    console.log('Date:', getHeader('date'));
    console.log('Body snippet:', body.substring(0, 800));
    console.log();
  }
  process.exit(0);
}

function getBody(payload) {
  if (payload.body && payload.body.data) return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' || part.mimeType === 'text/plain') {
        if (part.body && part.body.data) return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) { const n = getBody(part); if (n) return n; }
    }
  }
  return '';
}

main().catch(e => { console.error(e.message); process.exit(1); });