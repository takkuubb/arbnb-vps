require('dotenv').config();
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/oauth2callback'
);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

// Load existing reminder emails from DB (already processed email_ids)
const { getDb } = require('/var/www/arbnb/src/db');
const db = getDb();

// Get all reminder email IDs already matched
const existingIds = new Set(
  db.prepare('SELECT email_id FROM payouts WHERE email_id IS NOT NULL AND email_id != ?').all('').map(r => r.email_id)
);
console.log('Already processed:', existingIds.size, 'emails');

async function main() {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Fetch reminder emails in batches to get older ones too
  let allMsgs = [];
  let pageToken = null;
  for (let i = 0; i < 3; i++) {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: 'subject:(reservation reminder) from:airbnb.com',
      maxResults: 100,
      pageToken
    });
    const msgs = res.data.messages || [];
    allMsgs.push(...msgs);
    console.log('Page', i+1, ':', msgs.length, 'emails');
    pageToken = res.data.nextPageToken;
    if (!pageToken || msgs.length === 0) break;
  }
  console.log('Total reminder emails:', allMsgs.length, '\n');

  // Parse all reminder emails
  const reminders = [];
  for (const msg of allMsgs) {
    if (existingIds.has(msg.id)) continue; // skip already matched
    const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
    const headers = full.data.payload.headers;
    const getHeader = (n) => headers.find(h=>h.name.toLowerCase()===n.toLowerCase())?.value||'';
    const body = getBody(full.data.payload);

    // Extract name from subject: Reservation reminder: 奨士 is coming soon!
    const subjectNameM = getHeader('subject').match(/Reservation reminder: (.+?) is coming/i);
    const subjectName = subjectNameM ? subjectNameM[1].trim() : null;

    // Extract name from body (after URL block, near the arrives text)
    // e.g.: ...details/HMJP853TE5...   奨士 田中
    const bodyNameM = body.match(/(?:details\/[A-Z0-9]+[^>\n]{0,300}?)[\r\n\t ]+([^\n\r]{2,50})(?:\r?\n|$)/i);
    let bodyName = null;
    if (bodyNameM) {
      const raw = bodyNameM[1].trim().replace(/[\u200B\u00a0]+/g, '');
      if (raw.length >= 2 && !raw.startsWith('http') && !raw.startsWith('If you')) {
        bodyName = raw;
      }
    }

    reminders.push({
      id: msg.id,
      subjectName,
      bodyName,
      fullName: bodyName || subjectName
    });
  }

  console.log('New reminder emails to process:', reminders.length, '\n');

  // Get all unmatched payouts
  const payouts = db.prepare('SELECT * FROM payouts').all();

  let matched = 0, updated = 0;
  const matches = [];

  for (const rem of reminders) {
    const name = rem.fullName;
    if (!name) continue;

    const nameParts = name.split(/[\u0020\u3000\u3001\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/).filter(p => p.length >= 2);
    if (nameParts.length === 0) continue;

    let bestPayout = null, bestScore = 0;

    for (const p of payouts) {
      if (p.guests_total && p.guests_total > 1 && p.email_id) continue; // already have guests info
      const dbName = p.guest_name || '';
      const dbParts = dbName.split(/[\u0020\u3000\u3001\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/).filter(pp => pp.length >= 2);

      let score = 0;
      for (const np of nameParts) {
        for (const dp of dbParts) {
          // Exact match
          if (np === dp) { score += 3; continue; }
          // One contains other
          if (dp.includes(np) || np.includes(dp)) { score += 2; continue; }
          // Prefix match (first 3+ chars match)
          if (np.length >= 3 && dp.length >= 3 && (dp.startsWith(np) || np.startsWith(dp))) { score += 2; continue; }
          // Soundex-ish: last name match for Western names
          if (np.length >= 4 && dp.length >= 4 && np.substring(0,3) === dp.substring(0,3)) { score += 1; }
        }
      }

      // Bonus: same number of name parts
      if (dbParts.length === nameParts.length) score += 2;
      // Penalty: too different lengths
      if (Math.abs(nameParts.length - dbParts.length) > 2) score = 0;

      if (score > bestScore) { bestScore = score; bestPayout = p; }
    }

    // Threshold: score >= 4 (means at least 2 name parts partially match, or 1 exact match + same length)
    if (bestPayout && bestScore >= 4) {
      matched++;
      const result = db.prepare(
        'UPDATE payouts SET guests_total=1, guests_adult=1, guests_child=0, guests_infant=0, email_id=? WHERE id=?'
      ).run(rem.id, bestPayout.id);
      if (result.changes > 0) updated++;
      matches.push({ reminderName: name, payoutName: bestPayout.guest_name, code: bestPayout.reservation_code, score: bestScore });
      console.log('MATCH[' + bestScore + ']:', name, '→', bestPayout.guest_name, '|', bestPayout.reservation_code);
    } else {
      if (name.length >= 3) console.log('NO MATCH:', name);
    }
  }

  console.log('\n=== RESULT: matched=' + matched + ', updated=' + updated + ' ===');
  console.log('\nMatches:');
  matches.forEach(m => console.log(' ', m.reminderName, '→', m.payoutName, '|', m.code, '| score:', m.score));
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