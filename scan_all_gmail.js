const { google } = require('googleapis');
const { parsePayoutEmail } = require('./parser');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/oauth2callback'
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

function getBody(payload) {
  if (payload.body && payload.body.data) return Buffer.from(payload.body.body.data, 'base64').toString('utf8');
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
        if (part.body && part.body.data) return Buffer.from(part.body.data, 'base64').toString('utf8');
      }
      if (part.parts) { const nested = getBody(part); if (nested) return nested; }
    }
  }
  return '';
}

function getHeader(headers, name) {
  const h = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
}

async function scanAllPayoutEmails() {
  // Search for any Airbnb email containing payout info
  const queries = [
    'from:airbnb.com 送金',
    'from:airbnb.com payout',
    'from:airbnb.com ご送金'
  ];
  
  let allMessages = [];
  let seen = new Set();
  
  for (const q of queries) {
    try {
      console.log('Searching:', q);
      const response = await gmail.users.messages.list({
        userId: 'me', q: q, maxResults: 100
      });
      const msgs = response.data.messages || [];
      console.log('  Found:', msgs.length);
      for (const m of msgs) {
        if (!seen.has(m.id)) { seen.add(m.id); allMessages.push(m); }
      }
    } catch(e) { console.log('  Error:', e.message); }
  }
  
  console.log('\nTotal unique emails:', allMessages.length);
  
  // Fetch full content of each
  const results = [];
  for (let i = 0; i < allMessages.length; i++) {
    try {
      const full = await gmail.users.messages.get({
        userId: 'me', id: allMessages[i].id, format: 'full'
      });
      const headers = full.data.payload.headers;
      const subject = getHeader(headers, 'Subject');
      const date = getHeader(headers, 'Date');
      const body = getBody(full.data.payload);
      
      const parsed = parsePayoutEmail(subject, body);
      
      if (parsed && parsed.length > 0) {
        for (const r of parsed) {
          results.push({ ...r, emailId: allMessages[i].id, emailDate: date });
          console.log(i+1 + '/' + allMessages.length, '✅ Parsed:', r.guest_name, r.amount_value, r.nationality);
        }
      } else {
        console.log(i+1 + '/' + allMessages.length, '⚠️ No parse:', subject.substring(0, 60));
      }
    } catch(e) {
      console.log(i+1 + '/' + allMessages.length, '❌ Error:', e.message);
    }
  }
  
  console.log('\nTotal parsed results:', results.length);
  
  // Save to file
  const fs = require('fs');
  fs.writeFileSync('/tmp/parsed_payouts.json', JSON.stringify(results, null, 2));
  console.log('Saved to /tmp/parsed_payouts.json');
}

scanAllPayoutEmails().catch(console.error);