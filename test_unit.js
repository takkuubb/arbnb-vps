const { parsePayoutEmail } = require('./src/parser');

const testBody = `

Details

Povilas Kasparavičius   ¥ 145,888 JPY

Home • 4/27/2026 - 5/3/2026

kagura Beach and woods/3BDR/BBQ/Jacuzzi (1209203244522463235)

HM5BME5JFA

Total paid:   ¥ 145,888 JPY

`;

const result = parsePayoutEmail('We sent a payout', testBody);
console.log('Result count:', result.length);
if (result.length > 0) {
  console.log(JSON.stringify(result[0], null, 2));
} else {
  console.log('FAILED - no records parsed');
}
