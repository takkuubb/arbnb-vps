const { getGmailClient } = require('/var/www/arbnb/src/gmail');

async function main() {
  const gmail = await getGmailClient();
  
  // Search for Reminder emails for this reservation
  const codes = ['HME4N2CQDW', 'HMZX29KHJQ', 'HMRRQDZMNT'];
  
  for (const code of codes) {
    const messages = gmail.users.messages.list({
      userId: 'me',
      q: `subject:(reservation reminder) reservation ${code} from:airbnb.com`,
      maxResults: 5
    });
    
    const list = await messages;
    console.log(`\n=== Code: ${code} ===`);
    console.log('Found:', list.data.resultSizeEstimate, 'messages');
    
    if (list.data.messages) {
      for (const m of list.data.messages.slice(0, 2)) {
        const msg = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['Subject', 'From'] });
        const subj = msg.data.payload.headers.find(h => h.name === 'Subject');
        console.log('  Subject:', subj ? subj.value : 'N/A');
        
        // Get snippet
        console.log('  Snippet:', msg.data.snippet.substring(0, 200));
      }
    }
  }
}

main().catch(e => console.error(e.message));