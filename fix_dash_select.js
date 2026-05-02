const fs = require('fs');
const path = '/var/www/arbnb/src/views/dashboard.html';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: Update select options to use _desc suffix for descending sorts
const oldSelect = `<select id=\"sort\" onchange=\"load()\">
    <option value=\"payout_date\">支払日順</option>
    <option value=\"amount_value\">金額多い順</option>
    <option value=\"guest_name\">ゲスト名順</option>
    <option value=\"nights\">泊数多い順</option>
    <option value=\"stay_start\">チェックイン順</option>
  </select>`;

const newSelect = `<select id=\"sort\" onchange=\"load()\">
    <option value=\"payout_date_desc\">支払日順（新しい順）</option>
    <option value=\"amount_value_desc\">金額多い順</option>
    <option value=\"guest_name_asc\">ゲスト名順</option>
    <option value=\"nights_desc\">泊数多い順</option>
    <option value=\"stay_start_desc\">チェックイン順</option>
  </select>`;

if (content.includes(oldSelect)) {
  content = content.replace(oldSelect, newSelect);
  console.log('Fixed select options');
} else {
  console.log('Select block not found, trying alternate...');
  // Try finding by content
  if (content.includes('<option value=\"amount_value\">')) {
    content = content.replace('<option value=\"amount_value\">金額多い順</option>', '<option value=\"amount_value_desc\">金額多い順</option>');
    content = content.replace('<option value=\"payout_date\">支払日順</option>', '<option value=\"payout_date_desc\">支払日順</option>');
    content = content.replace('<option value=\"nights\">泊数多い順</option>', '<option value=\"nights_desc\">泊数多い順</option>');
    content = content.replace('<option value=\"stay_start\">チェックイン順</option>', '<option value=\"stay_start_desc\">チェックイン順</option>');
    console.log('Fixed individual options');
  } else {
    console.log('ERROR: Could not find select options');
    process.exit(1);
  }
}

// Fix 2: Add debug logging to load() to see what URL is being built
const oldLoad = `function load() {
    var search = document.getElementById('search').value.trim();
    var sort = document.getElementById('sort').value;
    var filter = document.getElementById('filter').value;
    var url = '/arbnb/api/payouts?limit=500';
    if (search) url += '&search=' + encodeURIComponent(search);
    if (sort) url += '&sort=' + encodeURIComponent(sort);
    if (filter) url += '&filter=' + encodeURIComponent(filter);`;

const newLoad = `function load() {
    var search = document.getElementById('search').value.trim();
    var sort = document.getElementById('sort').value;
    var filter = document.getElementById('filter').value;
    var url = '/arbnb/api/payouts?limit=500';
    if (search) url += '&search=' + encodeURIComponent(search);
    if (sort) url += '&sort=' + encodeURIComponent(sort);
    if (filter) url += '&filter=' + encodeURIComponent(filter);
    // DEBUG: log actual URL + first result
    console.log('LOAD URL:', url);
    api(url).then(function(res) { return res.json(); }).then(function(data) {
      if (data.payouts && data.payouts.length > 0) {
        console.log('FIRST:', data.payouts[0].guest_name, '¥' + data.payouts[0].amount_value, 'nat:', data.payouts[0].nationality, 'g:', data.payouts[0].guests_total);
      }
    }).catch(function(e) { console.error('API ERR:', e.message); });`;

if (content.includes(oldLoad)) {
  content = content.replace(oldLoad, newLoad);
  console.log('Added debug logging to load()');
} else {
  console.log('load() block not found');
}

// Fix 3: The api() function needs to handle POST with body for /api/payouts
// Current api() only sets JSON headers but doesn't set method to POST when body is provided
const oldApi = `function api(path, options) {
    return fetch(path, Object.assign({
      method: 'GET',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' }
    }, options || {}));
  }`;

// Keep existing api() function but make sure it doesn't default to GET for POST requests
// Actually the dashboard's load() never uses body, so GET is fine

fs.writeFileSync(path, content);
console.log('SUCCESS: dashboard.html updated');
console.log('File size:', content.length, 'bytes');