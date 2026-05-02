const { getDb } = require('/var/www/arbnb/src/db');
const db = getDb();

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
  '美月':'Japan','光紀':'Japan','康生':'Japan','麻未':'Japan',
  '俊輔':'Japan','日野':'Japan','蓮姫':'Korea','美紀':'Japan',
  'Briony':'Australia','Soryujit':'India','Gabriel':'Singapore','太輔':'Japan',
  'Kazufumi':'Japan','Gareth':'Australia','Matthew':'Australia','和':'Japan',
  '秀島':'Japan','Shira':'Israel','MASATAKE':'Japan',
  '芽維':'Japan','奨士':'Japan','大悟':'Japan','翔':'Japan','芽':'Japan',
  'J':'USA','A':'USA',
  'Pamika':'Thailand','Chang':'Taiwan','Stephanie':'USA','Teeravee':'Thailand',
  'Natthaphon':'Thailand','Ting-Ru':'Taiwan','Sau':'Hong Kong','Elizabeth':'USA',
  'Wan':'Malaysia','Muhammad':'Malaysia','Afif':'Malaysia','Teerasak':'Thailand',
  'Chayanan':'Thailand','Sophon':'Thailand','Rattanai':'Thailand','Pattaranat':'Thailand',
  'Sarun':'Thailand','Krit':'Thailand','Watchara':'Thailand','Chalit':'Thailand',
  'Pisit':'Thailand','Anucha':'Thailand','Chalermsak':'Thailand','Siriwat':'Thailand',
  'Napat':'Thailand','Ittiphon':'Thailand','Sasithorn':'Thailand','Pornsak':'Thailand',
  'Sombat':'Thailand','Worrapol':'Thailand','Nattapon':'Thailand','Petch':'Thailand',
  'Tanapol':'Thailand','Supachai':'Thailand','Suriya':'Thailand','Kittipong':'Thailand',
  'Nattawat':'Thailand','Wittawat':'Thailand','Chamnong':'Thailand','Sarawut':'Thailand',
  // MORE
  'Joseph':'USA','David':'USA','Kelly':'USA','Ivan':'Hong Kong',
  'Torben':'Germany','Dohyun':'Korea','Steven':'Germany','Elyse':'USA',
  'Kazuo':'Japan','Hikari':'Japan','Megan':'USA','Elias':'USA',
  'Julie':'France','Ryan':'USA','Jason':'Hong Kong','Sydney':'USA',
  'Arthur':'Singapore','Madoka':'Japan','Brianna':'USA','Chih':'Taiwan',
  'Junya':'Japan','Charles':'USA','Akapat':'Thailand','Siu':'Hong Kong',
  'Hanna':'USA','Julia':'Korea','Damon':'USA','Sarthak':'India',
  'Hung':'Taiwan','Molly':'USA','Brenda':'USA','Angie':'Malaysia',
  'Veronique':'Belgium','Samantha':'USA','Albert':'USA','Akikuni':'Japan',
  'Keita':'Japan','Suhyun':'Korea','Isao':'Japan','Tobias':'Finland',
  'Fan':'China','Julie':'France','Ryan':'USA','Arthur':'Singapore',
  'Puttinan':'Thailand','Meri':'Malaysia','Patiphan':'Thailand',
  'Ramiz':'Pakistan','Bryan':'USA','Leuk':'Hong Kong',
  'Nakura':'Japan','Sitanan':'Thailand','Si Weng':'Macau',
};

function detectNat(name) {
  const first = (name.split(/[\u0020\u3000\u3001]/)[0] || '').replace(/\u200b/g,'');
  if (first && FIRST_NAME_MAP[first]) return FIRST_NAME_MAP[first] + '（推測）';
  if (/[가-힣]/.test(name)) return 'Korea（推測）';
  if (/[\u0e00-\u0e7f]/.test(name)) return 'Thailand（推測）';
  if (/[\u0590-\u05ff]/.test(name)) return 'Israel（推測）';
  if (/[\u0600-\u06ff]/.test(name)) return 'Palestine（推測）';
  if (/[\u4e00-\u9faf]/.test(name)) {
    if (/[一-龯]/.test(name)) return 'Japan（推測）';
    return 'China（推測）';
  }
  return null;
}

const needFix = db.prepare(`SELECT id, guest_name FROM payouts
  WHERE nationality IS NULL OR nationality = '' OR nationality = '(不明)' OR nationality = '(null)' OR nationality = 'null'`).all();

console.log('Records needing nationality:', needFix.length);
let fixed = 0, stillUnknown = [];
for (const p of needFix) {
  const nat = detectNat(p.guest_name);
  if (nat) { db.prepare('UPDATE payouts SET nationality=? WHERE id=?').run(nat, p.id); fixed++; }
  else stillUnknown.push(p.guest_name);
}
console.log('Fixed:', fixed, '| Still unknown:', stillUnknown.length);
if (stillUnknown.length > 0) console.log('Unknown:', stillUnknown.join(', '));

const total = db.prepare('SELECT COUNT(*) as c FROM payouts').get();
const withNat = db.prepare(`SELECT COUNT(*) as c FROM payouts WHERE nationality IS NOT NULL AND nationality NOT IN ('', '(不明)', '(null)', 'null')`).get();
console.log('\nTotal:', total.c, '| With nationality:', withNat.c);

process.exit(0);