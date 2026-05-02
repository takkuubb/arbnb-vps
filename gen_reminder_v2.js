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
  console.log('Total reminder emails found:', msgs.length);

  const { getDb } = require('/var/www/arbnb/src/db');
  const db = getDb();

  let matched = 0;
  let updated = 0;

  for (const msg of msgs) {
    const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
    const headers = full.data.payload.headers;
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    const body = getBody(full.data.payload);

    // Extract confirmation code
    const codeMatch = body.match(/(?:confirmation code|confirmation ID)[:\n\r]+([A-Z0-9]+)/i)
                   || body.match(/^([A-Z0-9]{10,12})$/m);
    const code = codeMatch ? codeMatch[1].trim().toUpperCase() : null;

    // Extract guest name - try multiple patterns
    let guestName = null;
    const namePatterns = [
      /(?:Hello |Hi )(?:Dear )?(.*?),/,
      /(?:Guest name|Guest:|Name[:\n\r]+)([^\n\r]{3,40})/i,
      /(?:Reserved for|Booking for)[:\n\r]+([^\n\r]{3,40})/i,
    ];
    for (const p of namePatterns) {
      const m = body.match(p);
      if (m && m[1] && m[1].trim().length >= 3) {
        guestName = m[1].trim().replace(/\u200B/g, '').replace(/\u00a0/g, ' ').trim();
        break;
      }
    }

    // Extract guest count: 3 adults, 2 children, 1 infant
    const adults = (body.match(/(\b\/?adults?\b)/gi) || [])
      .map(m => { const n = body.match(new RegExp('(\\d+)\\s*' + m.replace(/[.?*+^$[\\]\\(){}|]/g, '\\$&'), 'i')); return n ? parseInt(n[1]) : 1; })
      .reduce((a, b) => Math.max(a, b), 1);
    // More precise: count adults
    const adultMatch = body.match(/(\b(\bchild|adult|\binfant\b))/gi);
    const adultCount = (body.match(/(\b)(\b)adults?/gi) || []).map(m => {
      const nm = body.match(new RegExp('(\\d+)\\s+adults?', 'i'));
      return nm ? parseInt(nm[1]) : 1;
    });
    const finalAdults = adultCount.length > 0 ? Math.max(...adultCount) : 1;

    // Try to extract specific counts
    const counts = {};
    const adultM = body.match(/(\b)(\b)adults?/i);
    const childM = body.match(/(\b)(\b)children\b/i);
    const infantM = body.match(/(\b)(\b)infants?\b/i);

    if (adultM) {
      const n = body.match(/(\b)(\b)adults?/i);
      // Look for number before
      const numM = body.match(/(\b)(\b)adults?/i);
      const beforeM = body.match(/(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)adults?/i);
      const numBefore = body.match(/(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)adults?/i);
    }

    const finalCode = code;
    const finalName = guestName;

    if (!finalCode && !finalName) continue;

    // Find matching payout by CODE first, then by name
    let payout = null;
    if (finalCode) {
      payout = db.prepare('SELECT * FROM payouts WHERE reservation_code = ?').get(finalCode);
    }

    if (!payout && finalName) {
      // Try to find by guest name (fuzzy-ish)
      const all = db.prepare('SELECT * FROM payouts').all();
      const cleanName = finalName.toLowerCase().replace(/\u200b/g, '').trim();
      for (const p of all) {
        const dbName = (p.guest_name || '').toLowerCase().replace(/\u200b/g, '').trim();
        // Simple: check if key words match
        const nameParts = cleanName.split(/\b[\u0020\u3000\u3001\u3002]\b/).filter(p => p.length >= 2);
        const dbParts = dbName.split(/\b[\u0020\u3000\u3001\u3002]\b/).filter(p => p.length >= 2);
        const overlap = nameParts.filter(np => dbParts.some(dp => dp.includes(np) || np.includes(dp)));
        if (overlap.length >= Math.min(2, Math.min(nameParts.length, dbParts.length))) {
          payout = p;
          console.log('  Name match:', finalName, '~', p.guest_name, '(code:', p.reservation_code, ')');
          break;
        }
      }
    }

    if (payout) {
      matched++;
      console.log('MATCHED by ' + (finalCode ? 'CODE:' + finalCode : 'NAME:' + finalName) + ' → ' + payout.guest_name);

      // Extract actual counts from email
      let adults = 1, children = 0, infants = 0;

      const guestLineM = body.match(/(\b)(\b)guests?\b[:\n\r]+(.+)/i);
      if (guestLineM) {
        const guestLine = guestLineM[3] || '';
        const aM = guestLine.match(/(\b)(\b)(\b)(\b)(\b)(\b)(\b)adults?/gi);
        const cM = guestLine.match(/(\b)(\b)(\b)(\b)(\b)(\b)(\b)children/gi);
        const iM = guestLine.match(/(\b)(\b)(\b)(\b)(\b)(\b)(\b)infants?/gi);

        // Count adults from line: look for X adults
        const adultNumM = guestLine.match(/(\b)(\b)(\b)(\b)(\b)(\b)(\b)adults?/i);
        // just count total mentions
        adults = (guestLine.match(/adults?/gi) || []).length || 1;
        if (adults === 0) adults = 1;
        children = (guestLine.match(/children/gi) || []).length;
        infants = (guestLine.match(/infants?/gi) || []).length;
      }

      // Alternative: just count total number of guests mentioned
      const totalGuestsM = body.match(/(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)guests?\b/i);
      const totalNumM = body.match(/(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)(\b)guests?\b.{0,20}/i);

      // Update DB
      const result = db.prepare(
        'UPDATE payouts SET guests_total=?, guests_adult=?, guests_child=?, guests_infant=? WHERE id=?'
      ).run(adults + children + infants, adults, children, infants, payout.id);
      if (result.changes > 0) updated++;
    }
  }

  console.log('\nResults: matched=' + matched + ', updated=' + updated);
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