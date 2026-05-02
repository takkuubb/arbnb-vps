const { getDb } = require('/var/www/arbnb/src/db');
const db = getDb();

// Revert false positive matches → guests = NULL (will display as '—')
const bad = [
  ['Joseph Hoover',   'HMEWQMCA5F'],
  ['Ed Leung',        'HMHQNWF3SN'],
  ['Steven Hartmann', 'HMWM23CXJA'],
  ['Suhyun Kim',      'HM343RZSR4'],
  ['Cheryl Li',       'HMEBHAJNWY'],
  ['Stephanie Chu',   'HMW2R8STY9'],
  ['Oli Watts',       'HM5EJX2QAM'],
];
for (const [name, code] of bad) {
  const r = db.prepare('UPDATE payouts SET guests_total=NULL, guests_adult=NULL, guests_child=NULL, guests_infant=NULL, email_id=NULL WHERE guest_name=? AND reservation_code=?').run(name, code);
  console.log(r.changes > 0 ? 'REVERTED: ' + name : 'NOT FOUND: ' + name);
}

// Check how many records now have guests info
const withGuests = db.prepare('SELECT COUNT(*) as c FROM payouts WHERE guests_total IS NOT NULL AND guests_total > 0').get();
const totalAll = db.prepare('SELECT COUNT(*) as c FROM payouts').get();
console.log('With guests_total > 0:', withGuests.c, '/', totalAll.c);

// Also restore nationality (推測) for records where nationality is null/missing
// Re-run detectNationality on names that have no nationality
const payouts = db.prepare('SELECT * FROM payouts WHERE nationality IS NULL OR nationality = \u0027\u0027 OR nationality = \u0027(undefined)\u0027').all();
console.log('Records needing nationality restore:', payouts.length);

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
  'Chang':'Taiwan','Shihab':'Jordan','Mickael':'France','Justine':'France',
  'Heather':'UK','Arata':'Japan','Siem':'Netherlands','Leonard':'Italy',
  'Melanie':'Germany','Hasif':'Malaysia','George':'USA','Bruno':'Brazil',
  'Caroline':'Vietnam','Sornsawan':'Thailand','Teddy':'Sweden','Youri':'Netherlands',
  'Rebecca':'Singapore','Yash':'India','Mingyi':'China','Oha':'Thailand',
  'Patricia':'Philippines','Ainaa':'Malaysia','Nurul':'Malaysia','Wai':'Hong Kong',
  'Pariphat':'Thailand','Tania':'Burkina Faso','Tomoya':'Japan','Sau':'Hong Kong',
  'Amizah':'Malaysia','Erlangga':'Indonesia','Joana':'Philippines','Tik':'Hong Kong',
  'Soryajit':'India','Jerry':'Canada','Minami':'Japan','Phil':'UK',
  'Keanna':'UK','Virginie':'Canada','Brian':'USA','Brett':'Germany',
  'Elham':'Iran','Edward':'USA','Kelvin':'Canada','Lian':'Taiwan',
  'Graham':'UK','Pandora':'Hong Kong','Joseph':'USA','Taichi':'Japan',
  'Ng':'Hong Kong','Lucas':'Spain','Raph':'Hong Kong','Belbellbelle':'Thailand',
  'Fuly':'Indonesia','Ming Fung':'Hong Kong','Haruka':'Japan','Ed':'Hong Kong',
  'Jules':'Papua New Guinea','Haley':'USA','David':'USA','Kelly':'Taiwan',
  'Jackie':'Taiwan','Yu Chih':'Taiwan','Ricky':'USA','山口':'Japan',
  '進藤':'Japan','Lee':'USA','Cheryl':'USA','John':'USA','FatHang':'Hong Kong',
  'Ankhjargal':'Mongolia','Hoi':'Hong Kong','翔太':'Japan','久義':'Japan',
  '元濱':'Japan','宏':'Japan','充貴':'Japan','熊澤':'Japan',
  '明香':'Japan','亭妤':'Taiwan','方瑜':'Taiwan','雅雯':'Taiwan',
  '翔一':'Japan','芽維':'Japan','奨士':'Japan','維':'Taiwan',
  '陽香':'Japan','大悟':'Japan','洋':'Japan','幸一':'Japan',
  '美月':'Japan','光紀':'Japan','康生':'Japan','智弥':'Japan',
  '麻未':'Japan','俊輔':'Japan','日野':'Japan','馬場':'Japan',
  '蓮姫':'Korea','鑫':'China','美紀':'Japan','太郎':'Japan',
  '立松':'Japan','凌真':'Japan','祐斗':'Japan','彩':'Japan',
  ' 애정':'Korea'
};

function detectNat(name) {
  const first = (name.split(/[\u0020\u3000\u3001]/)[0] || '').replace(/\u200b/g,'');
  if (first && FIRST_NAME_MAP[first]) return FIRST_NAME_MAP[first] + '（推測）';
  // Check for Korean
  if (/[가-힣]/.test(name)) return 'Korea（推測）';
  // Thai
  if (/[\u0e00-\u0e7f]/.test(name)) return 'Thailand（推測）';
  // Hebrew
  if (/[\u0590-\u05ff]/.test(name)) return 'Israel（推測）';
  // Arabic
  if (/[\u0600-\u06ff]/.test(name)) return 'Palestine（推測）';
  return null;
}

let restored = 0;
for (const p of payouts) {
  const nat = detectNat(p.guest_name);
  if (nat) {
    db.prepare('UPDATE payouts SET nationality=? WHERE id=?').run(nat, p.id);
    restored++;
  }
}
console.log('Nationality restored:', restored);

process.exit(0);