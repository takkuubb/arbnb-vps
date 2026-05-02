# Simple script that prints the OAuth URL for manual browser access
# User visits URL, copies the code from the redirect URL, and pastes it here
import sys

CLIENT_ID = sys.argv[1] if len(sys.argv) > 1 else 'YOUR_CLIENT_ID'
CLIENT_SECRET = sys.argv[2] if len(sys.argv) > 2 else 'YOUR_CLIENT_SECRET'
REDIRECT_URI = 'http://localhost:3001/oauth2callback'

# Minimal OAuth URL generator
import base64

auth_url = (
    f'https://accounts.google.com/o/oauth2/v2/auth'
    f'?client_id={CLIENT_ID}'
    f'&response_type=code'
    f'&redirect_uri={REDIRECT_URI}'
    f'&scope=https://www.googleapis.com/auth/gmail.readonly'
    f'&access_type=offline'
    f'&prompt=consent'
)

print('=' * 60)
print('OAuth URL (visit in your browser):')
print('=' * 60)
print(auth_url)
print('=' * 60)
print()
print('After you visit the URL and authorize, Google will redirect to:')
print(f'  {REDIRECT_URI}?code=XXXXX')
print()
print('Copy the CODE value from that URL and paste it back here.')
