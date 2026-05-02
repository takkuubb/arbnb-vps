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

async function main() {
  const response = await gmail.users.messages.list({ userId: 'me', q: 'subject:(payout) from:airbnb.com', maxResults: 1 });
  const msg = response.data.messages[0];
  const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
  const headers = full.data.payload.headers;
  const getHeader = (n) => headers.find(h => h.name.toLowerCase() === n.toLowerCase())?.value || '';
  const subject = getHeader('subject');
  const body = getBody(full.data.payload);

  // EXACT copy of parser.js stripHtml
  function stripHtml(html) {
    return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '').replace(/\u00a0/g, ' ').replace(/\u200b/g, '')
      .replace(/[\r\n]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  const text = stripHtml(body);
  console.log('Step 1 - has payout:', text.match(/We sent a payout/i) ? 'YES' : 'NO');

  const dateMatch = text.match(/sent on ([A-Z][a-z]+) ([0-9]{1,2}),? ([0-9]{4})/i);
  console.log('Step 2 - payout date match:', dateMatch ? dateMatch[1]+' '+dateMatch[2]+' '+dateMatch[3] : 'NO');

  const detailsIdx = text.indexOf('\nDetails\n');
  console.log('Step 3 - detailsIdx:', detailsIdx, '(>=0:', detailsIdx >= 0, ')');
  
  const totalPaidIdx = text.indexOf('Total paid:', detailsIdx);
  console.log('Step 4 - totalPaidIdx:', totalPaidIdx, '(>=0:', totalPaidIdx >= 0, ')');

  if (detailsIdx >= 0 && totalPaidIdx >= 0) {
    const block = text.substring(detailsIdx + 9, totalPaidIdx).trim();
    const lines = block.split('\n');
    console.log('Step 5 - block length:', block.length, 'lines:', lines.length);

    // Manual walk through
    let i = 0;
    let count = 0;
    while (i < lines.length && count < 5) {
      const line = lines[i].trim();
      console.log(`  line[${i}]: '${line.substring(0,40)}' | yen=${line.includes('¥')} | home=${line.startsWith('Home')} | code=${line.match(/^[A-Z0-9]{6,12}$/) ? 'YES' : 'NO'}`);

      // Check conditions
      const c1 = !line; // empty
      const c2 = line.startsWith('Home');
      const c3 = !!line.match(/^[A-Z0-9]{6,12}$/);
      const c4 = !line.includes('¥');

      console.log(`    skip=(${c1 || c2 || c3 || c4 ? 'YES' : 'NO'})  conditions: empty=${c1} startHome=${c2} isCode=${c3} noYen=${c4}`);

      if (!line || line.startsWith('Home') || line.match(/^[A-Z0-9]{6,12}$/) || !line.includes('¥')) {
        i++; continue;
      }

      const nameMatch = line.match(/^([^\u00a5¥]+?)[\u3000 ]+\u00a5/) || line.match(/^([^¥]+?)[\u3000 ]+¥/);
      console.log(`    nameMatch:`, nameMatch ? nameMatch[1] : 'NO MATCH');
      
      const amount = (() => {
        let m = line.match(/¥\u3000*([0-9,]+)/);
        if (!m) m = line.match(/¥[ ]*([0-9,]+)/);
        if (!m) m = line.match(/\u00a5[ ]*([0-9,]+)/);
        return m ? parseInt(m[1].replace(/,/g, ''), 10) || 0 : 0;
      })();
      console.log(`    amount:`, amount);

      i++; count++;
    }
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });