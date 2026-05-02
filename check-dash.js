const fs = require('fs');
const html = fs.readFileSync('/var/www/arbnb/src/views/dashboard.html', 'utf8');
const scriptStart = html.indexOf('<script>') + '<script>'.length;
const scriptEnd = html.lastIndexOf('</script>');
const script = html.substring(scriptStart, scriptEnd);
const renderIdx = script.indexOf('function render');
// Show 1500 chars to see all table cells
console.log('render full:');
console.log(script.substring(renderIdx, renderIdx + 1800));
// Check guests_total in render
console.log('\nguests_total in render:', script.substring(renderIdx, renderIdx + 1800).includes('guests_total'));
// Check total column
console.log('guests_total column:', script.substring(renderIdx, renderIdx + 1800).includes('p.guests_total'));