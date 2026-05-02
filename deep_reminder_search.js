// Search for HME4N2CQDW and check reminder emails more broadly
const { createGmailClient } = require('/var/www/arbnb/src/gmail');

async function main() {
  const gmail = createGmailClient();
  
  // 1. Search for this specific code in ALL emails from Airbnb
  console.log('=== Search 1: Direct code search ===');
  const s1 = await gmail.users.messages.list({
    userId: 'me',
    q: 'HME4N2CQDW from:airbnb.com',
    maxResults: 5
  });
  console.log('Found:', s1.data.resultSizeEstimate);
  
  // 2. Search with subject containing HME4N2CQDW
  console.log('\n=== Search 2: Subject search ===');
  const s2 = await gmail.users.messages.list({
    userId: 'me',
    q: 'subject:HME4N2CQDW from:airbnb.com',
    maxResults: 5
  });
  console.log('Found:', s2.data.resultSizeEstimate);
  
  // 3. Get all reservation reminders (more pages)
  console.log('\n=== Search 3: All reservation reminders (100) ===');
  const s3 = await gmail.users.messages.list({
    userId: 'me',
    q: 'subject:(reservation reminder) from:airbnb.com',
    maxResults: 100
  });
  console.log('Found:', s3.data.resultSizeEstimate, 'messages');
  
  // Check first 10 codes
  if (s3.data.messages && s3.data.messages.length > 0) {
    console.log('\n=== First 10 reminder codes ===');
    for (const msg of s3.data.messages.slice(0, 10)) {
      const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
      const body = getBody(full.data.payload);
      const codeMatch = body.match(/CONFIRMATION CODE[\r\n\t ]+([A-Z0-9]{8,12})/i);
      const guestsMatch = body.match(/GUESTS[\r\n\t ]+([0-9]+) adults?/i);
      const guests = guestsMatch ? guestsMatch[1] : '?';
      console.log(' ', codeMatch ? codeMatch[1] : 'NO_CODE', '|', guests, 'adults');
    }
  }
  
  // 4. Search for 翔太 in all emails
  console.log('\n=== Search 4: 翔太 in emails ===');
  const s4 = await gmail.users.messages.list({
    userId: 'me',
    q: '翔太 from:airbnb.com',
    maxResults: 5
  });
  console.log('Found:', s4.data.resultSizeEstimate);
  
  // 5. Search for reservation reminder for check-in April 26
  console.log('\n=== Search 5: April 26 checkin ===');
  const s5 = await gmail.users.messages.list({
    userId: 'me',
    q: 'subject:(reservation reminder) April 26 from:airbnb.com',
    maxResults: 10
  });
  console.log('Found:', s5.data.resultSizeEstimate);
  
  // 6. Total emails from Airbnb
  console.log('\n=== Search 6: All from Airbnb ===');
  const s6 = await gmail.users.messages.list({
    userId: 'me',
    q: 'from:airbnb.com',
    maxResults: 5
  });
  console.log('Total from Airbnb:', s6.data.resultSizeEstimate);
}
main().catch(e => console.error(e.message));

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