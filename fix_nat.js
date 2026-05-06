process.chdir('/var/www/arbnb');
const { getDb } = require('./src/db.js');

const db = getDb();
const rows = db.prepare('SELECT id, guest_name, nationality FROM payouts WHERE nationality = ?').all('China');
console.log('China records:', rows.length);

const FIRST_NAME_MAP = {
  '翔太': 'Japan', '五十嵐': 'Japan', '久義': 'Japan',
  '吉實': 'Japan', '隼稀': 'Japan', '姿瑩': 'China',
  'Arata': 'Japan', 'Soma': 'Japan', 'Naoto': 'Japan', 'Emiri': 'Japan',
  'Justine': 'France', 'Bess': 'China'
};

function detectNationality(name) {
  if (!name) return null;
  const firstName = name.trim().split(/\u3000| /)[0];
  if (FIRST_NAME_MAP[firstName]) return FIRST_NAME_MAP[firstName];
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(name)) return 'Japan';
  if (/[\u4e00-\u9fff]/.test(name)) {
    if (/[\u4e2d\u56fd\u5186\u7684\u8f6c\u8ba1\u95ee\u9898\u65f6\u95f4\u6ca1\u6709\u8fd9\u91cc\u4ed6\u4eec\u5988\u7238\u54c8\u554a]/.test(name)) return 'China';
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
  if (/[-ۿ]/.test(name)) return 'Palestine';
  return null;
}

let fixed = 0;
for (const row of rows) {
  const correct = detectNationality(row.guest_name);
  if (correct === 'Japan') {
    db.prepare('UPDATE payouts SET nationality = ? WHERE id = ?').run('Japan', row.id);
    console.log('Fixed:', row.guest_name, '-> Japan');
    fixed++;
  } else {
    console.log('Keep:', row.guest_name, '->', correct || 'null');
  }
}
console.log('Total fixed to Japan:', fixed);
console.log('Remaining China:', db.prepare('SELECT COUNT(*) as c FROM payouts WHERE nationality = ?').get('China').c);