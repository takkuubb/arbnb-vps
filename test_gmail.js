require('dotenv').config();
const { google } = require('googleapis');
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

function getBody(payload) {
  if (payload.body && payload.body.data) return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' || part.mimeType === 'text/plain') {
        if (part.body && part.body.data) return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) {
        const nested = getBody(part);
        if (nested) return nested;
      }
    }
  }
  return '';
}

async function test() {
  try {
    const resp = await gmail.users.messages.list({ userId: 'me', q: 'subject:(payout) from:airbnb.com', maxResults: 5 });
    console.log('Found messages:', resp.data.messages ? resp.data.messages.length : 0);
    if (!resp.data.messages || resp.data.messages.length === 0) {
      console.log('No payout emails found.');
      return;
    }
    
    for (let i = 0; i < Math.min(resp.data.messages.length, 3); i++) {
      const msg = await gmail.users.messages.get({ userId: 'me', id: resp.data.messages[i].id, format: 'full' });
      const headers = msg.data.payload.headers;
      const getH = n => headers.find(h => h.name.toLowerCase() === n.toLowerCase())?.value || 'N/A';
      console.log('\n--- Email ' + (i+1) + ' ---');
      console.log('Subject:', getH('subject'));
      console.log('Date:', getH('date'));
      const body = getBody(msg.data.payload);
      console.log('Body (first 800 chars):\n' + body.substring(0,800));
    }
  } catch(e) {
    console.error('Error:', e.message);
  }
}

test();
