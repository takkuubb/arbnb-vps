// New parser for Airbnb payout emails
// Parses multi-guest payout emails and returns per-guest records

const FIRST_NAME_MAP = {
  Povilas: 'Lithuania', Denzal: 'Philippines', Jennifer: 'Philippines',
  Trang: 'Vietnam', Alessandro: 'Brazil', Tina: 'USA', Charlie: 'USA', Suteemas: 'Thailand',
  '翔太': 'Japan', '五十嵐': 'Japan', '久義': 'Japan',
  '吉實': 'Japan', '隼稀': 'Japan', '姿瑩': 'China',
  Justine: 'France', Clarisse: 'France', Alexandre: 'France', Mickael: 'France',
  Laurin: 'Germany', Melanie: 'Germany', Dominik: 'Germany',
  Hasif: 'Malaysia', Shafie: 'Malaysia', Nur: 'Malaysia', Liyana: 'Malaysia',
  Leonard: 'Netherlands', Siem: 'Netherlands', Ijsselsteijn: 'Netherlands',
  George: 'USA', Heather: 'USA', Mark: 'USA', Owen: 'USA', Sunny: 'Taiwan',
  Felipe: 'Brazil', Sang: 'Korea', Made: 'Indonesia', Kanyawee: 'Thailand',
  Pak: 'Hong Kong', Hailong: 'Vietnam', Oli: 'UK', Nahshon: 'UK',
  Regiena: 'Philippines', Paulius: 'Lithuania', Yu: 'Taiwan', YuChin: 'Taiwan',
  Shihab: 'Palestine', Arata: 'Japan', Soma: 'Japan', Naoto: 'Japan',
  Emiri: 'Japan', Melvin: 'Netherlands', Eric: 'USA', Alex: 'USA',
  Aditi: 'India', Louise: 'UK', Bess: 'China', Justine: 'France'
};

const _NBSP = String.fromCharCode(0xa0);
const _YEN  = String.fromCharCode(0xa5);

function fixDoubleEncode(str) {
  const chars = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c === 0xc2 && i + 1 < str.length) {
      const n = str.charCodeAt(i + 1);
      if (n === 0xa0) { chars.push(0xa0); i++; continue; }
      if (n === 0xa5) { chars.push(0xa5); i++; continue; }
    }
    chars.push(c);
  }
  return String.fromCharCode.apply(null, chars);
}

function stripHtml(html) {
  return fixDoubleEncode(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, _NBSP)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '')
    .replace(/\u200b/g, '')
    .replace(/[\r\n]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function calcNights(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start), e = new Date(end);
  if (isNaN(s) || isNaN(e) || e <= s) return 0;
  return Math.round((e - s) / 86400000);
}

function detectNationality(name) {
  if (!name) return null;
  const firstName = name.trim().split(/\u3000| /)[0];
  if (FIRST_NAME_MAP[firstName]) return FIRST_NAME_MAP[firstName];
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(name)) return 'Japan';
  if (/[\u4e00-\u9fff]/.test(name)) {
    if (/[中国円的转计问题时间没有这里他们妈爸哈啊]/.test(name)) return 'China';
    if (/[aeiou]{3,}/i.test(name) && /[bcdfghjklmnpqrstvwxyz]{2,}/i.test(name)) return 'China';
    const chinaSurnames = /^(王|李|张|刘|陈|杨|黄|赵|周|吴|徐|孙|马|胡|朱|郭|何|高|林|罗|郑|梁|谢|宋|唐|许|韩|冯|邓|曹|彭|曾|萧|蔡|潘|田|董|袁|于|余|叶|程|傅|苏|魏|卢|蒋|杜|丁|沈|姜|范|江|金|雷|熊|秦|白|崔|康|孔|史|夏|侯|韦|贾|况|欧|龙|万|段|钱|龚|严|顾|孟|平|姬)/;
    if (chinaSurnames.test(name)) return 'China';
    return 'Japan';
  }
  if (/Kasparavicius/i.test(name)) return 'Lithuania';
  if (/Ngati/i.test(name)) return 'Philippines';
  if (/[가-힯]/.test(name)) return 'Korea';
  if (/[฀-๿]/.test(name)) return 'Thailand';
  if (/[֐-׿]/.test(name)) return 'Israel';
  if (/[؀-ۿ]/.test(name)) return 'Palestine';
  return null;
}

function parsePayoutEmail(subject, body) {
  const text = stripHtml(body);
  if (!text.match(/money was sent|sent (a )?payout/i)) return [];

  // Extract payout date from top: \"Your money was sent on April 28\"
  // Year found in \"arrive by May 5, 2026\" or fallback to current year
  let payoutDate = null;
  const dm = text.match(/sent on ([A-Z][a-z]+) ([0-9]{1,2})/i);
  if (dm) {
    const yearMatch = text.match(/arrive by [^,]+, ([0-9]{4})/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
    const moMap = { January:1, February:2, March:3, April:4, May:5, June:6,
                    July:7, August:8, September:9, October:10, November:11, December:12 };
    const mo = moMap[dm[1]] || 1;
    const day = parseInt(dm[2], 10);
    if (day >= 1 && day <= 31) {
      payoutDate = String(year) + '-' + String(mo).padStart(2,'0') + '-' + String(day).padStart(2,'0');
    }
  }

  const lines = text.split('\n');
  let di = -1, ti = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'Details') { di = i; break; }
  }
  if (di < 0) return [];
  for (let i = di + 1; i < lines.length; i++) {
    if (lines[i].startsWith('Total paid:')) { ti = i; break; }
  }
  if (ti < 0) return [];

  // Gmail emails have \r\n line endings. After \n split, strip trailing \r.
  const block = lines.slice(di + 1, ti).map(l => l.replace(/\r$/, ''));
  const results = [];
  let cur = [];

  // Name pattern: characters not including \u3000 (ideographic space) or NBSP, before YEN
  const nmReg = new RegExp('^([^\u3000' + _NBSP + ']+)' + _YEN);

  for (const line of block) {
    const m = line.match(nmReg);
    if (m) {
      if (cur.length > 0) {
        const p = parseGuestBlock(cur.join('\n'), payoutDate);
        if (p) results.push(p);
      }
      cur = [line];
    } else {
      cur.push(line);
    }
  }
  if (cur.length > 0) {
    const p = parseGuestBlock(cur.join('\n'), payoutDate);
    if (p) results.push(p);
  }

  return results;
}

function parseGuestBlock(block, payoutDate) {
  const lines = block.split('\n').map(l => l.trim()).filter(l => l);
  if (!lines.length) return null;

  // Extract guest name: find YEN, backtrack over whitespace
  const firstLine = lines[0];
  const yenIdx = firstLine.indexOf(_YEN);
  if (yenIdx < 0) return null;

  let nameEnd = yenIdx - 1;
  while (nameEnd >= 0) {
    const c = firstLine.charCodeAt(nameEnd);
    if (c === 0x20 || c === 0x09 || c === 0xa0 || c === 0x3000) nameEnd--;
    else break;
  }
  let nameStart = 0;
  while (nameStart < nameEnd) {
    const c = firstLine.charCodeAt(nameStart);
    if (c === 0x20 || c === 0x09 || c === 0xa0 || c === 0x3000) nameStart++;
    else break;
  }
  if (nameStart > nameEnd) return null;
  const guestName = firstLine.substring(nameStart, nameEnd + 1).trim();
  if (!guestName) return null;

  // Extract per-guest amount from first line: \"GuestName   ¥ 145,888 JPY\"
  let amount = 0;
  const am = firstLine.match(new RegExp(_YEN + '\\s*([0-9,]+)'));
  if (am) amount = parseInt(am[1].replace(/,/g, ''), 10) || 0;

  // Find stay dates, listing title, reservation code
  let stayStart = null, stayEnd = null, listingTitle = 'Airbnb Listing', resCode = '';

  for (const line of lines) {
    if (line.startsWith('Home')) {
      const dm = line.match(/([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})[ -]+([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})/);
      if (dm && !stayStart) {
        stayStart = dm[3] + '-' + String(dm[1]).padStart(2,'0') + '-' + String(dm[2]).padStart(2,'0');
        stayEnd = dm[6] + '-' + String(dm[4]).padStart(2,'0') + '-' + String(dm[5]).padStart(2,'0');
      }
    }
    const cm = line.match(/^([A-Z]{2,3}[A-Z0-9]{5,8})$/);
    if (cm && !resCode) {
      resCode = cm[1];
      const rl = block.split('\n');
      const li = rl.findIndex(l => l.trim() === line);
      if (li > 0) {
        for (let j = li - 1; j >= 0; j--) {
          const p = rl[j].trim();
          if (!p) continue;
          if (p.includes(_YEN) || p.startsWith('Home') || p.match(/^[A-Z]{2,3}[A-Z0-9]{5,8}$/)) break;
          listingTitle = p.replace(/\u3000+$/, '').trim();
          break;
        }
      }
    }
  }
  if (!resCode) {
    const cm2 = block.match(/([A-Z]{2,3}[A-Z0-9]{5,8})/);
    if (cm2) resCode = cm2[1];
  }
  if (!resCode || !guestName) return null;

  const nights = calcNights(stayStart, stayEnd);
  const amountPerNight = nights > 0 ? Math.round(amount / nights) : 0;
  const nat = detectNationality(guestName);
  const guests = parseGuestsFromBlock(block);

  return {
    reservationCode: resCode,
    guestName,
    nationality: nat || null,
    listingTitle,
    stayStart, stayEnd,
    nights, amount, amountPerNight,
    payoutDate,
    guests,
  };
}

function parseGuestsFromBlock(block) {
  const text = block.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  // Patterns: "2 guests", "3 guests", "1 guest", "2 adults, 1 child", etc.
  let total = 1, adults = 1, children = 0, infants = 0;
  // "X guests" or "X adult(s)"
  const gMatch = text.match(/([0-9]+)\s*guests?/i);
  const aMatch = text.match(/([0-9]+)\s*adults?/i);
  const cMatch = text.match(/([0-9]+)\s*child(?:ren)?/i);
  const iMatch = text.match(/([0-9]+)\s*infant[s]?/i);
  if (gMatch) total = parseInt(gMatch[1], 10) || 1;
  if (aMatch) adults = parseInt(aMatch[1], 10) || 1;
  if (cMatch) children = parseInt(cMatch[1], 10) || 0;
  if (iMatch) infants = parseInt(iMatch[1], 10) || 0;
  if (!gMatch && aMatch) total = adults;
  return { total, adults, children, infants };
}

module.exports = { parsePayoutEmail };