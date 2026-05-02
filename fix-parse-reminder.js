const fs = require('fs');
const content = fs.readFileSync('/var/www/arbnb/src/parse-reminder.js', 'utf8');

const oldCode = `  // Adults count: GUESTS section
  const guestsSection = text.match(/GUESTS[\\r\\n\\t ]+([0-9]+) adults?/i);
  const adults = guestsSection ? parseInt(guestsSection[1], 10) : 1;
  // Stay dates`;

const newCode = `  // Guest counts from GUESTS section
  const guestsSection = text.match(/GUESTS[\\r\\n\\t ]+([0-9]+) adults?/i);
  const adults = guestsSection ? parseInt(guestsSection[1], 10) : 1;
  // Children: \"X children\" or \"X child\"
  const childMatch = text.match(/([0-9]+)[\\r\\n\\t ]+children?/i);
  const children = childMatch ? parseInt(childMatch[1], 10) : 0;
  // Infants: \"X infant\" or \"X infants\"
  const infantMatch = text.match(/([0-9]+)[\\r\\n\\t ]+infants?/i);
  const infants = infantMatch ? parseInt(infantMatch[1], 10) : 0;
  // Stay dates`;

const oldPush = `results.push({ reservationCode: resCode, adults: adults, children: children, infants: infants, stayStart: stayStart, stayEnd: stayEnd });`;
const newPush = `const total = (adults || 1) + (children || 0) + (infants || 0);
    results.push({ reservationCode: resCode, adults: adults || 1, children: children || 0, infants: infants || 0, total: total || 1, stayStart: stayStart, stayEnd: stayEnd });`;

if (!content.includes(oldCode)) {
  console.error('Could not find adults extraction block');
  process.exit(1);
}
if (!content.includes(oldPush)) {
  console.error('Could not find results.push line');
  process.exit(1);
}

const fixed = content.replace(oldCode, newCode).replace(oldPush, newPush);
fs.writeFileSync('/var/www/arbnb/src/parse-reminder.js', fixed);
console.log('parse-reminder.js fixed');
console.log(fixed.substring(fixed.indexOf('Guest counts'), fixed.indexOf('Guest counts') + 500));