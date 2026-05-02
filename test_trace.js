function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, '\u00a0')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '').replace(/\u200b/g, '')
    .replace(/[\r\n]+/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

const testBody = `

Details

Povilas Kasparavičius   ¥ 145,888 JPY

Home • 4/27/2026 - 5/3/2026

kagura Beach and woods/3BDR/BBQ/Jacuzzi (1209203244522463235)

HM5BME5JFA

Total paid:   ¥ 145,888 JPY

`;

const text = stripHtml(testBody);
console.log('Stripped text:');
console.log(JSON.stringify(text));
console.log('---');

const lines = text.split('\n');
console.log('Lines:');
lines.forEach((l, i) => console.log(i, JSON.stringify(l)));

// Find Details line
let detailsLineIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'Details') { detailsLineIdx = i; break; }
}
console.log('Details line index:', detailsLineIdx);

// Find Total paid
let totalPaidIdx = -1;
for (let i = detailsLineIdx + 1; i < lines.length; i++) {
  if (lines[i].startsWith('Total paid:')) { totalPaidIdx = i; break; }
}
console.log('Total paid index:', totalPaidIdx);

// Check first line in block
if (detailsLineIdx >= 0 && totalPaidIdx >= 0) {
  const blockLines = lines.slice(detailsLineIdx + 1, totalPaidIdx);
  console.log('Block lines:', blockLines.length);
  if (blockLines.length > 0) {
    const firstLine = blockLines[0];
    console.log('First block line:', JSON.stringify(firstLine));
    const nameMatch = firstLine.match(/^([^\u00a5\u3000]+?)[\u00a0 \t]+\u00a5/);
    console.log('Name match:', nameMatch);
  }
}
