const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const opn = require('opn');

const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];
const REDIRECT_URI = 'http://localhost:3001/oauth2callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.log('Usage: node get_refresh_token.js <CLIENT_ID> <CLIENT_SECRET>');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.readonly']
});

console.log('Open this URL in your browser:');
console.log(authUrl);

const server = http.createServer((req, res) => {
  const query = url.parse(req.url, true).query;
  if (query.code) {
    res.end('Got code! Close this window and check the terminal.');
    server.close();
    oauth2Client.getToken(query.code).then(({ tokens }) => {
      console.log('\nREFRESH_TOKEN:');
      console.log(tokens.refresh_token);
      console.log('\nAdd these to .env:');
      console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`);
      console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`);
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    }).catch(e => console.error('Token error:', e.message));
  }
});

server.listen(3001, () => {
  console.log('\nWaiting for callback at http://localhost:3001/ ...');
  opn(authUrl).catch(() => console.log('Please open the URL manually.\n'));
});
