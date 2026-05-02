require('dotenv').config();
const { google } = require('googleapis');

function createGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/oauth2callback'
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

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

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '')
    .replace(/\u00a0/g, ' ').replace(/\u200b/g, '').replace(/[\r\n]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function parseDate(text) {
  // 4/27/2026 → 2026-04-27
  const m = text.match(/(\u3000*[\u4e00-\u9fff]*)([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})/);
  if (m) {
    const mo = parseInt(m[2], 10);
    const d = parseInt(m[3], 10);
    const y = parseInt(m[4], 10);
    return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  return null;
}

function calcNights(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start), e = new Date(end);
  if (isNaN(s) || isNaN(e) || e <= s) return 0;
  return Math.round((e - s) / 86400000);
}

function extractAmount(text) {
  const m = text.match(/\u00a5\u3000*([0-9,]+)/);
  return m ? parseInt(m[1].replace(/,/g, ''), 10) || 0 : 0;
}

function detectNationality(name) {
  if (!name) return null;
  const firstName = name.trim().split(/\u3000| /)[0];
  const firstNameMap = {
    'Povilas': 'Lithuania', 'Denzal': 'Philippines', 'Jennifer': 'Philippines',
    'Trang': 'Vietnam', 'Alessandro': 'Brazil', 'Tina': 'USA',
    'Charlie': 'USA', 'Suteemas': 'Thailand',
    '翔太': 'Japan', '五十嵐': 'Japan', '久義': 'Japan', '吉實': 'Japan', '隼稀': 'Japan', '姿瑩': 'China'
  };
  if (firstNameMap[firstName]) return firstNameMap[firstName];
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(name)) return 'Japan';
  if (/[\u4e00-\u9fff]/.test(name)) return 'China';
  if (/Kasparavicius/i.test(name)) return 'Lithuania';
  if (/Ngati/i.test(name)) return 'Philippines';
  return null;
}

function parsePayoutEmail(subject, body) {
  const text = stripHtml(body);
  if (!text.match(/We sent a payout/i)) return [];

  // Extract payout date: sent on April 28
  const dateMatch = text.match(/sent on ([A-Z][a-z]+ [\u3000 ]*[0-9]{1,2}[\u3000 ,]+[0-9]{4})/i);
  let payoutDate = null;
  if (dateMatch) {
    const months = { January:1, February:2, March:3, April:4, May:5, June:6, July:7, August:8, September:9, October:10, November:11, December:12 };
    const d = dateMatch[1].replace(/\u3000/g, ' ');
    const m2 = d.match(/([A-Z][a-z]+) ([0-9]{1,2}),? ([0-9]{4})/);
    if (m2) {
      const mo = months[m2[1]] || 1;
      const day = parseInt(m2[2], 10);
      const year = parseInt(m2[3], 10);
      payoutDate = `${year}-${String(mo).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
  }

  // Extract details block: after \n\nDetails\n\n and before \n\nTotal paid
  const detailsRe = /Details\n\n([\u4e00-\u9fffA-Za-zÀ-ÿ 0-9\n]+?)\n\nTotal paid:/;
  const blockMatch = text.match(detailsRe);
  if (!blockMatch) return [];

  const block = blockMatch[1];

  // Split into individual guest entries by double newlines
  const entries = block.split(/\n\n+/).filter(e => e.trim());

  const results = [];
  for (const entry of entries) {
    const lines = entry.split('\n').filter(l => l.trim());
    if (lines.length < 2) continue;

    // Line 1: Name   ¥ amount
    const nameLine = lines[0];
    const nameMatch = nameLine.match(/^([^\u00a5]+?)\u3000*\u00a5/);
    if (!nameMatch) continue;
    const guestName = nameMatch[1].trim();

    // Amount
    const amount = extractAmount(entry);

    // Dates: Home • 4/27/2026 - 5/3/2026
    let stayStart = null, stayEnd = null, listingTitle = 'Airbnb Listing', reservationCode = '';
    for (const line of lines) {
      // Date pattern
      const dateM = line.match(/([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})\u3000*[\u2013-]\u3000*([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})/);
      if (dateM && !stayStart) {
        stayStart = `${dateM[3]}-${String(dateM[1]).padStart(2,'0')}-${String(dateM[2]).padStart(2,'0')}`;
        stayEnd = `${dateM[6]}-${String(dateM[4]).padStart(2,'0')}-${String(dateM[5]).padStart(2,'0')}`;
      }
      // Reservation code: HM5BME5JFA
      const codeM = line.match(/\b([A-Z]{2,3}[A-Z0-9]{5,8})\b/);
      if (codeM && !reservationCode) {
        reservationCode = codeM[1].toUpperCase();
        // Title is the line before the code
        const idx = lines.indexOf(line);
        if (idx > 0 && idx > lines.indexOf(nameLine)) {
          listingTitle = lines[idx - 1].trim();
        }
      }
    }

    if (!reservationCode || !guestName) continue;

    const nights = calcNights(stayStart, stayEnd);
    const amountPerNight = nights > 0 ? Math.round(amount / nights) : 0;
    const nationality = detectNationality(guestName);

    results.push({
      reservationCode,
      guestName,
      nationality: nationality ? `${nationality}` : '***国名***（推測）',
      listingTitle,
      stayStart,
      stayEnd,
      nights,
      amount,
      amountPerNight,
      payoutDate,
    });
  }

  return results;
}

async function main() {
  const gmail = createGmailClient();
  const response = await gmail.users.messages.list({ userId: 'me', q: 'subject:(payout) from:airbnb.com', maxResults: 6 });
  const messages = response.data.messages || [];
  console.log(`Found ${messages.length} payout emails\n`);

  for (const msg of messages) {
    const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
    const headers = full.data.payload.headers;
    const getHeader = (n) => headers.find(h => h.name.toLowerCase() === n.toLowerCase())?.value || '';
    const body = getBody(full.data.payload);

    const results = parsePayoutEmail(getHeader('subject'), body);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Email: ${getHeader('subject')}`);
    console.log(`Guests found: ${results.length}`);
    for (const r of results) {
      console.log(`\n--- ${r.guestName} ---`);
      console.log(`国籍: ${r.nationality}`);
      console.log(`宿泊先: ${r.listingTitle}`);
      console.log(`宿泊期間: ${r.stayStart} - ${r.stayEnd}`);
      console.log(`泊数: ${r.nights}泊`);
      console.log(`金額: ${r.amount.toLocaleString('ja-JP')}`);
      console.log(`金額/泊: ${r.amountPerNight.toLocaleString('ja-JP')}`);
      console.log(`予約コード: ${r.reservationCode}`);
    }
  }
}

main().catch(console.error);