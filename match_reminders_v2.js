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
    maxResults: 50
  });
  const msgs = res.data.messages || [];
  console.log('Found', msgs.length, 'reminder emails\n');

  const { getDb } = require('/var/www/arbnb/src/db');
  const db = getDb();

  let matched = 0, updated = 0;

  for (const msg of msgs) {
    const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
    const headers = full.data.payload.headers;
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    const body = getBody(full.data.payload);

    // Extract reservation code from URL in body
    const codeM = body.match(/airbnb(?:\\.com)?\/hosting\/reservations\/details\/([A-Z0-9]+)/i);
    const code = codeM ? codeM[1].toUpperCase() : null;

    // Extract full guest name (after URL, e.g.   奨士 田中  or   Edwin Imada)
    const nameM = body.match(/airbnb(?:\\.com)?\/hosting\/reservations\/details\/[A-Z0-9]+[^>\n]{0,100}\n?\r?\n?\r?\n?\r?\n?\r?\n?[\r\n\t ]+([^\n\r]{3,40})/);
    // Simpler: look for the name that appears right after the URL block
    const nameBlockM = body.match(/reservations\/details\/[A-Z0-9]+[^\n]{0,200}\n+([^\n]{3,50})/);
    let guestName = null;
    if (nameBlockM) {
      const raw = nameBlockM[1].trim();
      // Filter out words that are just single chars or URLs
      if (raw && raw.length >= 2 && !raw.startsWith('http') && raw.match(/[a-zA-Z\u3040-\u9fff\u4e00-\u9faf]/)) {
        guestName = raw.replace(/\u200B/g, '').trim();
      }
    }

    // Fallback: parse subject for first name, combine with name block for full
    const subjectM = getHeader('subject').match(/Reservation reminder: (.+?) is coming/);
    const subjectName = subjectM ? subjectM[1].trim() : null;
    const fullName = guestName || subjectName;

    if (!code && !fullName) {
      console.log('SKIP: no code or name in', getHeader('subject'));
      continue;
    }

    // Try 1: match by reservation code
    let payout = code ? db.prepare('SELECT * FROM payouts WHERE reservation_code = ?').get(code) : null;

    // Try 2: match by name (fuzzy) — split name into parts, check overlap
    if (!payout && fullName) {
      const allPayouts = db.prepare('SELECT * FROM payouts').all();
      const nameParts = fullName.split(/[\u0020\u3000\u3001\u4e00-\u9faf]/).filter(p => p.length >= 2);
      for (const p of allPayouts) {
        if (p.guests_total && p.guests_total > 1) continue; // already filled
        const dbParts = (p.guest_name || '').split(/[\u0020\u3000\u3001\u4e00-\u9faf]/).filter(p => p.length >= 2);
        // Check overlap: at least 2 name parts match OR (1 part match AND both have same length)
        const overlap = nameParts.filter(np => dbParts.some(dp =>
          dp.includes(np) || np.includes(dp) || (dp.length >= 3 && np.length >= 3 && (dp.startsWith(np) || np.startsWith(dp)))
        ));
        if (overlap.length >= Math.min(2, Math.max(1, Math.floor(Math.min(nameParts.length, dbParts.length) * 0.6)))) {
          payout = p;
          console.log('NAME MATCH:', fullName, '≈', p.guest_name, '| code:', p.reservation_code, '| overlap:', overlap.join(', '));
          break;
        }
      }
    }

    if (payout) {
      matched++;
      // Extract adult count from body (look for patterns like X adults, or just say total number of guests)
      const guestM = body.match(/(\b)(\b)guests?\b.{0,5}/i);
      // Try: Total number of guests: 4 guests
      const totalM = body.match(/(?:total number of guests|total guests?)[:\n\r ]+(\b)/i);
      let adults = 1, children = 0, infants = 0;

      // Count adults mentions: look for number before adults
      const adultNum = body.match(/(\b)(\b)(\b)(\b)(\b)adults?/i);
      // Simple approach: look for any number near the word guests
      const numNearGuests = body.match(/(\b)(\b)(\b)(\b)(\b)(\b)(\b)guests?\b.{0,30}/i);

      // Hardcode: if name has multiple parts (e.g., Edwin Imada), assume 1 adult per name unless body says more
      // Total guests: parse the body more carefully
      const bodyText = body.replace(/<[^>]+>/g, ' ');
      const guestLineM = bodyText.match(/(?:guest|adult|child|infant)[:\n\r ]*(\b)/i);

      // Extract total from: X guests / X adults / X children
      const totalGuests = (bodyText.match(/(?:^|[\n\r ])(\b)(\b)(\b)(\b)(\b)guests?\b/gi) || [])
        .map(m => { const n = bodyText.match(new RegExp('(\\d+)\\s+guests?', 'i')); return n ? parseInt(n[1]) : null; })
        .filter(n => n !== null);
      const total = totalGuests.length > 0 ? totalGuests[0] : null;

      // Also check for pattern: 4 guests
      const fourM = bodyText.match(/(\b)(\b)(\b)guests?\b/i);
      let totalCount = 1;
      const numM = bodyText.match(/(\b)(\b)(\b)guests?\b/i);
      if (numM) {
        const before = bodyText.substring(Math.max(0, numM.index - 3), numM.index);
        const nm = before.match(/(\b)(\b)(\b)(\b)(\b)/);
        if (nm) {
          const n = parseInt(nm[0].trim());
          if (n >= 1 && n <= 20) totalCount = n;
        }
      }

      // For now: default to 1 adult, and use any info we have
      // Real adults from the URL subject name suggests this is for 1 guest unless stated otherwise
      // But most reservation reminders don't state the count — they just say the name
      adults = totalCount;
      const totalFinal = adults + children + infants;

      const result = db.prepare(
        'UPDATE payouts SET guests_total=?, guests_adult=?, guests_child=?, guests_infant=?, email_id=? WHERE id=?'
      ).run(totalFinal, adults, children, infants, msg.id, payout.id);

      if (result.changes > 0) {
        updated++;
        console.log('  UPDATED:', payout.guest_name, '→ adults=' + adults + ', total=' + totalFinal, '| code:', payout.reservation_code);
      } else {
        console.log('  SKIP (no change):', payout.guest_name);
      }
    } else {
      console.log('NO MATCH:', code || '-', '|', fullName || '-');
    }
  }

  console.log('\n=== RESULT: matched=' + matched + ', updated=' + updated + ' ===');
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