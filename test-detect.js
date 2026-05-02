// Test detectNationality
function detectNationality(name) {
  if (!name) return null;
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(name)) return 'Japan';
  if (/[\u4e00-\u9fff]/.test(name)) return 'China';
  if (/[가-힯]/.test(name)) return 'Korea';
  if (/[฀-๿]/.test(name)) return 'Thailand';
  return null;
}

const testNames = ['Olivier Charvet', '翔太 五十嵐', 'Joseph Chu Chu', 'Bess Chen', '애정 이'];
testNames.forEach(function(n) {
  console.log(n + ' -> ' + detectNationality(n));
});

// Check the deployed dashboard's detectNationality
const fs = require('fs');
const content = fs.readFileSync('/var/www/arbnb/src/views/dashboard.html', 'utf8');
const fnMatch = content.match(/function detectNationality[\\S\n]+?^  \return null;$/m);
if (fnMatch) {
  console.log('\nDeployed detectNationality:');
  console.log(fnMatch[0]);
} else {
  // Try simpler match
  const idx = content.indexOf('function detectNationality');
  if (idx >= 0) {
    console.log('\nDeployed detectNationality (raw):');
    console.log(content.substring(idx, idx + 400));
  }
}