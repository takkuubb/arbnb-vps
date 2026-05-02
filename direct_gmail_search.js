// Run directly in xvps via PM2's existing process context
// Use the existing gmail client from the api.js context
const { createGmailClient } = require('/var/www/arbnb/src/gmail');

async function main() {
  const gmail = createGmailClient();
  
  // Search for HME4N2CQDW specifically
  console.log('=== Searching for HME4N2CQDW ===');
  
  // Try 1: exact code search
  const search1 = await gmail.users.messages.list({
    userId: 'me',
    q: 'HME4N2CQDW from:airbnb.com',
    maxResults: 5
  });
  console.log('Direct code search - found:', search1.data.resultSizeEstimate);
  
  // Try 2: reservation reminder for this guest name
  const search2 = await gmail.users.messages.list({
    userId: 'me',
    q: 'subject:(reservation reminder) 五十嵐 from:airbnb.com',
    maxResults: 5
  });
  console.log('Japanese name search - found:', search2.data.resultSizeEstimate);
  
  // Try 3: broader search - check-in April 26-29
  const search3 = await gmail.users.messages.list({
    userId: 'me',
    q: 'subject:(reservation reminder) from:airbnb.com',
    maxResults: 100
  });
  console.log('All reminders (100) - found:', search3.data.resultSizeEstimate);
  
  // Get all reminder codes and check for HME4 or similar
  if (search3.data.messages && search3.data.messages.length > 0) {
    const codes = [];
    for (const msg of search3.data.messages.slice(0, 20)) {
      const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
      const body = getBody(full.data.payload);
      const codeMatch = body.match(/CONFIRMATION CODE[\r\n\t ]+([A-Z0-9]{8,12})/i);
      if (codeMatch) codes.push(codeMatch[1]);
    }
    console.log('\n=== First 20 reminder codes ===');
    codes.forEach(c => console.log(' ', c));
    
    // Check for partial match
    const hme4Match = codes.filter(c => c.includes('HME4') || c.includes('HME'));
    console.log('\nCodes containing HME4/HME:', hme4Match);
  }
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

main().catch(e => console.error(e.message));