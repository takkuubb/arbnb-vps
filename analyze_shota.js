const { getDb } = require('/var/www/arbnb/src/db');
const http = require('http');

const db = getDb();

// 翔太 五十嵐's data
const rec = db.prepare('SELECT * FROM payouts WHERE guest_name LIKE ?').get('%翔太%');
console.log('翔太 record:', JSON.stringify(rec, null, 2));

// Now search Gmail for reservation HME4N2CQDW
// We need to use gmail.js functions
// Let me try to manually search using the OAuth client from gmail.js

// First, check if there's a match function in parse-reminder.js
const fs = require('fs');
const parseReminder = require('/var/www/arbnb/src/parse-reminder.js');

// Try to get reminder emails
async function run() {
  try {
    // Get reminder emails
    const reminders = await parseReminder.fetchReminderEmails();
    console.log('\nTotal reminders fetched:', reminders.length);
    
    // Search for HME4N2CQDW in reminders
    const match = reminders.find(r => r.confirmationCode === 'HME4N2CQDW');
    if (match) {
      console.log('\nFound reminder for HME4N2CQDW:');
      console.log(JSON.stringify(match, null, 2));
    } else {
      console.log('\nHME4N2CQDW NOT FOUND in', reminders.length, 'reminders');
      console.log('Sample codes:', reminders.slice(0, 5).map(r => r.confirmationCode));
      
      // Search by partial name
      const nameMatches = reminders.filter(r => 
        r.guestName && (r.guestName.includes('翔太') || r.guestName.includes('五十嵐'))
      );
      console.log('\nName matches (翔太/五十嵐):', nameMatches.length);
      nameMatches.forEach(m => console.log(' ', m.guestName, m.confirmationCode, 'guests:', m.guests));
      
      // Show all codes that contain HME4 (fuzzy)
      const fuzzyMatches = reminders.filter(r => 
        r.confirmationCode && r.confirmationCode.includes('HME4')
      );
      console.log('\nFuzzy code matches (HME4):', fuzzyMatches.length);
      fuzzyMatches.forEach(m => console.log(' ', m.guestName, m.confirmationCode, 'guests:', m.guests));
    }
  } catch(e) {
    console.error('Error:', e.message);
  }
}

run();