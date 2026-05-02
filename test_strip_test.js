const { parsePayoutEmail } = require('./src/parser');

const testBody = 'Details\nPovilas Kasparavičius   ¥ 145,888 JPY\nHome • 4/27/2026 - 5/3/2026\nkagura Beach and woods/3BDR/BBQ/Jacuzzi (1209203244522463235)\nHM5BME5JFA\nTotal paid:   ¥ 145,888 JPY';

const result = parsePayoutEmail('test', testBody);
console.log('Result count:', result.length);
if (result.length > 0) {
  console.log(JSON.stringify(result[0], null, 2));
} else {
  console.log('NO RESULT');
  // Debug: check stripHtml
  const text = result._strip ? result._strip : 'N/A';
  console.log('Stripped:', JSON.stringify(testBody.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, '\u00a0').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '').replace(/\u200b/g, '').replace(/\u00c2\u00a0/g, '\u00a0').replace(/\u00c2\u00a5/g, '\u00a5').replace(/[\r\n]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim()));
}