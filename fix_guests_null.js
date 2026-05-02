const { getDb } = require('/var/www/arbnb/src/db');
const db = getDb();

// Step 1: Set all guests_total=1 to NULL (→ dashboard will show '—')
// Only set NULL where email_id is NOT a reservation reminder email id
// We want to mark as unmatched anyone who doesn't have a confirmed reminder match
// The simplest rule: if guests_total=1 AND there was no confirmed match, set to NULL
// Actually: set ALL to NULL first, then re-apply only confirmed matches

// Better approach: set guests_total/guests_adult to NULL for all
// (they'll display as '—' unless we can confirm a real match)
const r1 = db.prepare('UPDATE payouts SET guests_total=NULL, guests_adult=NULL, guests_child=NULL, guests_infant=NULL').run();
console.log('Cleared all guests fields:', r1.changes, 'records');

// Now re-apply only CONFIRMED matches (name matched with high confidence score >= 8)
const confirmedMatches = [
  ['Suteemas Jirajaroenrat', 'HM8NW9WXRQ'],
  ['Trang Ho', 'HMHNKCDHSJ'],
  ['Pamika Wuttisri', 'HM9M3C449S'],
  ['Tina Schlich', 'HMERKNXAYQ'],
  ['Charlie Jiang', 'HMFADJFZY2'],
  ['Alessio Scaravetti', 'HMES4TXT9X'],
  ['Iris Wong', 'HM45JSBNTA'],
  ['Lanlan Yang', 'HMZBJHPWD5'],
  ['Steve Australia', 'HMDATQTF48'],
  ['Clarisse Levannier', 'HM4W3D3JSQ'],
  ['Bess Chen', 'HMRRQDZMNT'],
  ['Justine Marcoux', 'HMZX29KHJQ'],
  ['Melvin Smolenaars', 'HM3PTQTE89'],
  ['Eric Wilson', 'HM539WMT3C'],
  ['Povilas Kasparavičius', 'HM5BME5JFA'],
  ['Denzal Ngati', 'HMS8SCJM8F'],
  ['Naoto Yamada', 'HMPNRPKTCD'],
  ['Jennifer Ylarde', 'HMDR5RHHSQ'],
  ['Nahshon Ern Shen Lim', 'HM8P89JCKY'],
  ['Aditi Mishra', 'HMRYYYB4Q3'],
  ['Alessandro Uyemura', 'HMRYNRXMCR'],
  ['Mark Riley', 'HMTRTE9T45'],
  ['Emiri Meguro', 'HM9DD4NDQW'],
  ['Nur Liyana Tajudin', 'HMZFMZFKCN'],
  ['Dominik Boddy', 'HMDMKJRW2P'],
  ['Laurin Dietz', 'HMERXBTPEF'],
  ['Hailong Wang', 'HMNDSCNCDZ'],
  ['Krich Homklai', 'HMNFPAAYWS'],
  ['Soma Ohara', 'HMXS9NQ5NY'],
  ['Owen Isaac', 'HM3PMTHRMZ'],
  ['Yu-Ting Huang', 'HMRDFJECQW'],
  ['Adeline Hong', 'HMJ5JESQZ8'],
  ['Paulius Peciura', 'HMCBDHKPSK'],
  ['Pak Hong Cheong', 'HM9CTF8HJX'],
  ['Alexandre Chrun', 'HMNCWMZ4TH'],
  ['Alex Tseng Tseng', 'HMD5DYA9SF'],
  ['Louise Marsh', 'HMPMYSFC24'],
  ['Sunny Huang', 'HM43TDFZQM'],
  ['Regiena Cera', 'HM4NS2KFBR'],
  ['Felipe Maciel', 'HMQ99ESZND'],
  ['Kanyawee Akkharanantphinyo', 'HMKN2Z25S2'],
  ['Sang Lee', 'HMSJXJXF4P'],
  ['Justine Gardier', 'HMWJECHC48'],
  ['Shihab Nogdallah', 'HMFZSQH8HZ'],
  ['Made Pramana Putra', 'HM9ZMSZ3JC'],
  ['Mickael Blondeau', 'HMYXT9N44M'],
  ['Heather Kinsman', 'HMZ2ZYTX3J'],
  ['Chang YuChin', 'HMREMDQT35'],
  ['Arata Mori', 'HM3EDST2R5'],
  ['Melanie Wagner', 'HMJNYT3BHT'],
  ['Hasif Harun', 'HMHXZC4TAT'],
  ['George Molina', 'HMZ2EW5XFQ'],
  ['Bruno Santos', 'HMEECHPXT2'],
  ['Caroline Thien', 'HMHC3FKJ8C'],
  ['Sornsawan Maksung', 'HMWKTT8RBN'],
  ['Teddy Zetterlund', 'HMDNQMHF8Q'],
  ['Youri Pierik', 'HM55JJXCBQ'],
  ['Rebecca Sing', 'HMQBQBE3CY'],
  ['Yash Singhal', 'HMBWTT3QHQ'],
  ['Mingyi Wang', 'HMK2QXANSJ'],
  ['Oha Panarat', 'HMFFF4TNWM'],
  ['Patricia Selpa', 'HMJAQ93H82'],
  ['Ainaa Iylia Mohd Naim', 'HMB34A5E4B'],
  ['Nurul Jannah', 'HMTPCET94B'],
  ['Tomoya Tagawa', 'HMBNRYYMAA'],
  ['Pariphat Chompoonutprapa', 'HM94SC4JQX'],
  ['Wai Kit Ng', 'HMY35NP2EP'],
  ['Tania Some', 'HM8YZA88M9'],
  ['Amizah Othman', 'HM9N5BKKR8'],
  ['Erlangga Bhakti', 'HMTFPN4TTB'],
  ['Joana Balibay', 'HM4RW4K8C'],
  ['Tik Man Cheung', 'HMCPW4E3XD'],
  ['Soryajit Saini', 'HM3ENAC3N9'],
  ['Jerry Yip', 'HM8RYYR4JP'],
  ['Minami Ward', 'HMRK9WXHH8'],
  ['Elizabeth Zhou', 'HM3FQ9BS5E'],
  ['Phil Clandillon', 'HMR8BWFXPQ'],
  ['Keanna Kemsley', 'HMXKEKE9FN'],
  ['Wan Asnani', 'HMWS4QYS43'],
  ['Brian Vincent', 'HMHNJCTPS5'],
  ['Brett Thiedeke', 'HMYM5K33TY'],
  ['Elham Monavari', 'HMSPTW55M9'],
  ['Edward Cullen', 'HMQRMFDJJ9'],
  ['Kelvin Wong', 'HMPEH8FDDD'],
  ['Pandora Chung', 'HMBT38P4HF'],
  ['Graham Miles', 'HMADZR9PXT'],
  ['Joseph Hoover', 'HMEWQMCA5F'],
  ['Sze Xin Ng', 'HMTM9K22ZQ'],
  ['Taichi Obata', 'HMSNBXJHX3'],
  ['Ng Js', 'HMWAPTNHN2'],
  ['Lucas Ruzafa', 'HMBRM8B3XZ'],
  ['Raph Tsui', 'HM3K4TDKKH'],
  ['소연 임', 'HMAFEZRHDX'],
  ['Belbellbelle Kangwanpornsiri', 'HMERQMDKQR'],
  ['Fuly Sugianto', 'HM59Y3BAFY'],
  ['Ming Fung Wong', 'HMH24C8RDZ'],
  ['Haruka Smyth', 'HM5D2PXNJP'],
  ['Ed Leung', 'HMHQNWF3SN'],
  ['Jules Longyapon', 'HM5QH5DSPM'],
  ['Haley Perez', 'HM2FZRERTE'],
  ['Jackie Chen', 'HMKBAWEA43'],
  ['Yu Chih Lin', 'HM2C58ZHJC'],
  ['Ricky Nieto', 'HMZ22AS5C8'],
  ['山口 和穂', 'HMQMEJD8C9'],
  ['進藤 友梨香', 'HMSPNYR5QN'],
  ['Lee Lee', 'HMFXRCRJHJ'],
  ['Cheryl Li', 'HMEBHAJNWY'],
  ['John Lansing', 'HM9H9S5SHM'],
  ['FatHang Poon', 'HMZSDQCTDM'],
  ['Ankhjargal Bayar', 'HMCFFPJJ8B'],
  ['Hoi Ling Leung', 'HM395WDK2W'],
  ['애정 이', 'HMHB8SJFBF'],
  ['翔太 五十嵐', 'HME4N2CQDW'],
  ['久義 髙村', 'HMNBT9KZBY'],
  ['翔一 浅井', 'HMWTYK2NTE'],
];

let restored = 0;
for (const [name, code] of confirmedMatches) {
  const r = db.prepare('UPDATE payouts SET guests_total=1, guests_adult=1 WHERE guest_name=? AND reservation_code=?').run(name, code);
  if (r.changes > 0) restored++;
  else console.log('NOT FOUND:', name, code);
}
console.log('Restored guests_total=1 for', restored, 'confirmed matches');

// Step 2: Restore nationality (推測) for records without nationality
const FIRST_NAME_MAP = {
  'Bess':'France','Justine':'France','Charlie':'Australia','Tina':'Germany',
  'Alessio':'Italy','Clarisse':'France','Steve':'Australia','Alessandro':'Japan/Brazil',
  'Lanlan':'China','Iris':'Hong Kong','Yu-Ting':'Taiwan','Adeline':'Hong Kong',
  'Paulius':'Lithuania','Alex':'Taiwan','Pak':'Hong Kong','Alexandre':'France/Brazil',
  'Melvin':'Netherlands','Eric':'UK','Aditi':'India','Nahshon':'Singapore',
  'Shafie':'Malaysia','Jennifer':'Philippines','Naoto':'Japan','Mark':'UK',
  'Dominik':'UK','Emiri':'Japan','Laurin':'Germany','Krich':'Thailand',
  'Hailong':'China','Soma':'Japan','Owen':'UK','Felipe':'Brazil',
  'Louise':'UK','Sunny':'Taiwan','Regiena':'Philippines','Sang':'Korea',
  'Shihab':'Jordan','Mickael':'France','Heather':'UK','Arata':'Japan',
  'Siem':'Netherlands','Leonard':'Italy','Melanie':'Germany','Hasif':'Malaysia',
  'George':'USA','Bruno':'Brazil','Caroline':'Vietnam','Sornsawan':'Thailand',
  'Teddy':'Sweden','Youri':'Netherlands','Rebecca':'Singapore','Yash':'India',
  'Mingyi':'China','Oha':'Thailand','Patricia':'Philippines','Ainaa':'Malaysia',
  'Nurul':'Malaysia','Wai':'Hong Kong','Pariphat':'Thailand','Tania':'Burkina Faso',
  'Tomoya':'Japan','Amizah':'Malaysia','Erlangga':'Indonesia','Joana':'Philippines',
  'Tik':'Hong Kong','Soryajit':'India','Jerry':'Canada','Minami':'Japan',
  'Phil':'UK','Keanna':'UK','Virginie':'Canada','Brian':'USA',
  'Brett':'Germany','Elham':'Iran','Edward':'USA','Kelvin':'Canada',
  'Lian':'Taiwan','Graham':'UK','Pandora':'Hong Kong','Taichi':'Japan',
  'Ng':'Hong Kong','Lucas':'Spain','Raph':'Hong Kong','Belbellbelle':'Thailand',
  'Fuly':'Indonesia','Ming Fung':'Hong Kong','Haruka':'Japan','Ed':'Hong Kong',
  'Jules':'Papua New Guinea','Haley':'USA','Jackie':'Taiwan','Yu Chih':'Taiwan',
  'Ricky':'USA','山口':'Japan','進藤':'Japan','Lee':'USA',
  'Cheryl':'USA','John':'USA','FatHang':'Hong Kong','Ankhjargal':'Mongolia',
  'Hoi':'Hong Kong','翔太':'Japan','久義':'Japan','翔一':'Japan',
  '芽維':'Japan','奨士':'Japan','美月':'Japan','光紀':'Japan',
  '康生':'Japan','麻未':'Japan','俊輔':'Japan','日野':'Japan',
  '蓮姫':'Korea','美紀':'Japan',
  'Briony':'Australia','Soryujit':'India',
};

function detectNat(name) {
  const first = (name.split(/[\u0020\u3000\u3001]/)[0] || '').replace(/\u200b/g,'');
  if (first && FIRST_NAME_MAP[first]) return FIRST_NAME_MAP[first] + '（推測）';
  if (/[가-힣]/.test(name)) return 'Korea（推測）';
  if (/[\u0e00-\u0e7f]/.test(name)) return 'Thailand（推測）';
  if (/[\u0590-\u05ff]/.test(name)) return 'Israel（推測）';
  if (/[\u0600-\u06ff]/.test(name)) return 'Palestine（推測）';
  if (/[\u4e00-\u9faf]/.test(name)) return 'Japan（推測）';
  return null;
}

const needNat = db.prepare('SELECT id, guest_name FROM payouts WHERE nationality IS NULL OR nationality = \u0027\u0027 OR nationality = \u0027(undefined)\u0027 OR nationality = \u0027(null)\u0027').all();
console.log('\nRecords needing nationality:', needNat.length);
let natRestored = 0;
for (const p of needNat) {
  const nat = detectNat(p.guest_name);
  if (nat) { db.prepare('UPDATE payouts SET nationality=? WHERE id=?').run(nat, p.id); natRestored++; }
}
console.log('Nationality restored:', natRestored);

// Final check
const withGuests = db.prepare('SELECT COUNT(*) as c FROM payouts WHERE guests_total IS NOT NULL').get();
const totalAll = db.prepare('SELECT COUNT(*) as c FROM payouts').get();
const withNat = db.prepare('SELECT COUNT(*) as c FROM payouts WHERE nationality IS NOT NULL AND nationality != \u0027\u0027').get();
console.log('\nFinal: guests_total set:', withGuests.c, '/', totalAll.c);
console.log('Final: nationality set:', withNat.c, '/', totalAll.c);

process.exit(0);