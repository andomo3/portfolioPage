#!/usr/bin/env python3
"""
Fetch top artists from Spotify and write data/spotify-top-artists.json.

First-time setup (--auth flag):
  1. Create a Spotify app at https://developer.spotify.com/dashboard
  2. Add http://127.0.0.1:8888/callback as a Redirect URI
  3. Run: python scripts/fetch-spotify.py --auth
  4. Your browser opens automatically — log in and authorise
  5. The script captures the callback and saves SPOTIFY_REFRESH_TOKEN to .env (git-ignored)

Subsequent runs (no flag):
  python scripts/fetch-spotify.py
  Reads credentials from .env or environment variables.

Required env vars:
  SPOTIFY_CLIENT_ID
  SPOTIFY_CLIENT_SECRET
  SPOTIFY_REFRESH_TOKEN  (not needed during --auth flow)

Output: data/spotify-top-artists.json
"""

import json
import os
import sys
import urllib.parse
import urllib.request
import urllib.error
import base64
import secrets
import hashlib
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE  = REPO_ROOT / '.env'
OUT_FILE  = REPO_ROOT / 'data' / 'spotify-top-artists.json'
REDIRECT  = 'http://127.0.0.1:8888/callback'
SCOPE     = 'user-top-read'

# ---------------------------------------------------------------------------
# .env helpers
# ---------------------------------------------------------------------------
def load_env():
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, _, v = line.partition('=')
                os.environ.setdefault(k.strip(), v.strip())

def save_env_key(key, value):
    lines = ENV_FILE.read_text().splitlines() if ENV_FILE.exists() else []
    updated = False
    for i, l in enumerate(lines):
        if l.startswith(key + '='):
            lines[i] = f'{key}={value}'
            updated = True
            break
    if not updated:
        lines.append(f'{key}={value}')
    ENV_FILE.write_text('\n'.join(lines) + '\n')
    print(f'  Saved {key} to {ENV_FILE}')

# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------
def http_post(url, data, headers=None):
    body = urllib.parse.urlencode(data).encode()
    req  = urllib.request.Request(url, data=body, headers=headers or {}, method='POST')
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def http_get(url, token):
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

# ---------------------------------------------------------------------------
# Auth flow (run once) — spins up a local server to capture the callback
# ---------------------------------------------------------------------------
def auth_flow(client_id, client_secret):
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b'=').decode()

    params = urllib.parse.urlencode({
        'client_id':             client_id,
        'response_type':         'code',
        'redirect_uri':          REDIRECT,
        'scope':                 SCOPE,
        'code_challenge_method': 'S256',
        'code_challenge':        challenge,
    })
    auth_url = f'https://accounts.spotify.com/authorize?{params}'

    # Capture the auth code via a one-shot local HTTP server
    captured = {}

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args): pass  # silence request logs
        def do_GET(self):
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            captured['code']  = qs.get('code',  [None])[0]
            captured['error'] = qs.get('error', [None])[0]
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            msg = b'<h2>Authorised! You can close this tab.</h2>' if captured.get('code') \
                  else b'<h2>Authorisation failed. Check the terminal.</h2>'
            self.wfile.write(msg)

    server = HTTPServer(('127.0.0.1', 8888), Handler)
    server.timeout = 120  # wait up to 2 minutes

    print(f'\nOpening browser for Spotify login…')
    webbrowser.open(auth_url)
    print('Waiting for callback on http://127.0.0.1:8888/callback …\n')
    server.handle_request()  # blocks until one request comes in
    server.server_close()

    code = captured.get('code')
    if not code:
        sys.exit(f'Auth failed: {captured.get("error", "no code received")}')

    creds = base64.b64encode(f'{client_id}:{client_secret}'.encode()).decode()
    tokens = http_post(
        'https://accounts.spotify.com/api/token',
        {
            'grant_type':    'authorization_code',
            'code':          code,
            'redirect_uri':  REDIRECT,
            'code_verifier': verifier,
            'client_id':     client_id,
        },
        headers={'Authorization': f'Basic {creds}'},
    )

    refresh_token = tokens.get('refresh_token')
    if not refresh_token:
        sys.exit(f'Error: no refresh token in response: {tokens}')

    save_env_key('SPOTIFY_REFRESH_TOKEN', refresh_token)
    print('\nAuth complete. Re-run without --auth to fetch your top artists.')

# ---------------------------------------------------------------------------
# Fetch top artists
# ---------------------------------------------------------------------------
def get_access_token(client_id, client_secret, refresh_token):
    creds = base64.b64encode(f'{client_id}:{client_secret}'.encode()).decode()
    data  = http_post(
        'https://accounts.spotify.com/api/token',
        {'grant_type': 'refresh_token', 'refresh_token': refresh_token, 'client_id': client_id},
        headers={'Authorization': f'Basic {creds}'},
    )
    return data['access_token']

def fetch_top_artists(access_token):
    url  = 'https://api.spotify.com/v1/me/top/artists?limit=12&time_range=long_term'
    data = http_get(url, access_token)
    out  = []
    for item in data.get('items', []):
        images = item.get('images', [])
        image  = images[0]['url'] if images else None
        out.append({
            'name':   item['name'],
            'image':  image,
            'genres': item.get('genres', [])[:3],
        })
    return out

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    load_env()
    client_id     = os.environ.get('SPOTIFY_CLIENT_ID')
    client_secret = os.environ.get('SPOTIFY_CLIENT_SECRET')

    if not client_id or not client_secret:
        sys.exit(
            'Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env or as env vars.\n'
            'Create a Spotify app at https://developer.spotify.com/dashboard'
        )

    if '--auth' in sys.argv:
        auth_flow(client_id, client_secret)
        return

    refresh_token = os.environ.get('SPOTIFY_REFRESH_TOKEN')
    if not refresh_token:
        sys.exit('SPOTIFY_REFRESH_TOKEN not found. Run with --auth first.')

    print('Fetching access token…')
    access_token = get_access_token(client_id, client_secret, refresh_token)

    print('Fetching top artists…')
    artists = fetch_top_artists(access_token)

    OUT_FILE.parent.mkdir(exist_ok=True)
    OUT_FILE.write_text(json.dumps(artists, indent=2, ensure_ascii=False) + '\n')
    print(f'Wrote {len(artists)} artists → {OUT_FILE}')

if __name__ == '__main__':
    main()
