// /var/www/arbnb/src/parse-reminder.js
const { google } = require('googleapis');

function createGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3001/oauth2callback'
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, '')
    .replace(/&quot;/g, '')
    .replace(/\u200b/g, '')
    .replace(/[\r\n]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseReminderEmail(text) {
  const results = [];
  // CONFIRMATION CODE: XXXXXXXX
  const codeMatch = text.match(/CONFIRMATION CODE[\r\n\t ]+([A-Z0-9]{8,12})/i);
  if (!codeMatch) return results;
  const resCode = codeMatch[1].trim();
  // Guest counts from GUESTS section
  const guestsSection = text.match(/GUESTS[\r\n\t ]+([0-9]+) adults?/i);
  const adults = guestsSection ? parseInt(guestsSection[1], 10) : 1;
  // Children: "X children" or "X child"
  const childMatch = text.match(/([0-9]+)[\r\n\t ]+children?/i);
  const children = childMatch ? parseInt(childMatch[1], 10) : 0;
  // Infants: "X infant" or "X infants"
  const infantMatch = text.match(/([0-9]+)[\r\n\t ]+infants?/i);
  const infants = infantMatch ? parseInt(infantMatch[1], 10) : 0;
  // Stay dates
  const moMap = { January:'01', February:'02', March:'03', April:'04', May:'05', June:'06',
                  July:'07', August:'08', September:'09', October:'10', November:'11', December:'12' };
  const ciMatch = text.match(/Check-in[\r\n\t ]+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[,\/]? (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\b1?[0-9]\b)/i);
  const coMatch = text.match(/Checkout[\r\n\t ]+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[,\/]? (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\b1?[0-9]\b)/i);
  let stayStart = null, stayEnd = null;
  const year = new Date().getFullYear();
  if (ciMatch && moMap[ciMatch[1]]) {
    stayStart = year + '-' + moMap[ciMatch[1]] + '-' + String(parseInt(ciMatch[2])).padStart(2,'0');
  }
  if (coMatch && moMap[coMatch[1]]) {
    stayEnd = year + '-' + moMap[coMatch[1]] + '-' + String(parseInt(coMatch[2])).padStart(2,'0');
  }
  // Nationality/location: after 'Identity verified · N reviews' line
  // Nationality: first line after 'Identity verified · N reviews' — place name before 'Send X a Message'
  const locMatch = text.match(/Identity verified[· ]+[0-9]+ review[sz][^\n]*\n([\s\S]*?)\n[\t ]*Send[\s\S]*?Message/i);
  let nationality = '';
  if (locMatch) {
    const locLines = locMatch[1].split('\n').filter(l => l.trim().length >= 2 && !l.trim().toLowerCase().startsWith('send '));
    const lastLine = locLines[locLines.length - 1] || '';
    const commaIdx = lastLine.indexOf(',');
    nationality = commaIdx > 0 ? lastLine.substring(commaIdx + 1).trim() : lastLine.trim();
  }
  if (nationality && (nationality.length < 2 || nationality.length > 50)) nationality = '';
  if (nationality && nationality.length > 15 && /[\u3040-\u9fff\uac00-\ud7af\u4e00-\u9fff]/.test(nationality)) nationality = '';
  // Convert US state abbreviations to USA
  const usStates = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
  if (usStates.includes(nationality)) nationality = 'USA';
  // Skip event/trial names (no comma, all lowercase words, contains keywords)
  const eventWords = ['triathlon','marathon','run ','race','cycling','tour','championship','ironman','ultra','sprint','challenge','strongman','crossfit'];
  const lowerNat = nationality.toLowerCase();
  if (eventWords.some(w => lowerNat.includes(w))) nationality = '';
  if (resCode) {
    const total = (adults || 1) + (children || 0) + (infants || 0);
    results.push({ reservationCode: resCode, adults: adults || 1, children: children || 0, infants: infants || 0, total: total || 1, stayStart: stayStart, stayEnd: stayEnd, nationality: nationality });
  }
  return results;
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

async function fetchReminderEmails(maxResults) {
  const gmail = createGmailClient();
  const response = await gmail.users.messages.list({
    userId: 'me', q: 'subject:(reservation reminder) from:airbnb.com', maxResults: maxResults || 50
  });
  const messages = response.data.messages || [];
  const results = [];
  for (const msg of messages) {
    try {
      const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
      const headers = full.data.payload.headers;
      const getHeader = (n) => headers.find(h => h.name.toLowerCase() === n.toLowerCase())?.value || '';
      const body = getBody(full.data.payload);
      const parsed = parseReminderEmail(stripHtml(body));
      if (parsed.length > 0) {
        results.push({ ...parsed[0], emailId: msg.id, emailDate: getHeader('date') });
      }
    } catch(e) {}
  }
  return results;
}

module.exports = { fetchReminderEmails };
