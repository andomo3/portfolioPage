#!/usr/bin/env python3
"""
Fetch the last 53 weeks of contributions from the GitHub GraphQL API
and write data/github-commits.json. Matches the data shown on your
GitHub profile contributions graph (commits, PRs, issues, reviews —
including private contributions when authenticated as yourself).

Usage:
  python scripts/fetch-github.py

Required env var (in .env or shell):
  GITHUB_TOKEN  — a classic PAT with `read:user` scope, OR a fine-grained PAT
                  with `Account permissions → Profile (read-only)`. The token
                  must belong to the user whose graph you want.

Output: data/github-commits.json
  A 53x7 nested array: grid[week][day] = contribution_count.
  Week 0 is the oldest week, day 0 is Sunday.
"""

import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

REPO_ROOT   = Path(__file__).resolve().parent.parent
ENV_FILE    = REPO_ROOT / '.env'
OUT_FILE    = REPO_ROOT / 'data' / 'github-commits.json'
GITHUB_USER = 'andomo3'

QUERY = """
query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            weekday
            contributionCount
          }
        }
      }
    }
  }
}
"""

def load_env():
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, _, v = line.partition('=')
                os.environ.setdefault(k.strip(), v.strip())

def graphql(token, query, variables):
    body = json.dumps({'query': query, 'variables': variables}).encode()
    req  = urllib.request.Request(
        'https://api.github.com/graphql',
        data=body,
        method='POST',
        headers={
            'Authorization':         f'Bearer {token}',
            'Content-Type':          'application/json',
            'Accept':                'application/vnd.github+json',
            'X-GitHub-Api-Version':  '2022-11-28',
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f'HTTP {e.code}: {e.read().decode()}')

def main():
    load_env()
    token = os.environ.get('GITHUB_TOKEN')
    if not token:
        sys.exit(
            'GITHUB_TOKEN required. Create a classic PAT with read:user scope at\n'
            '  https://github.com/settings/tokens/new\n'
            'then add it to .env as GITHUB_TOKEN=ghp_...'
        )

    print(f'Fetching contributions for {GITHUB_USER}…')
    data = graphql(token, QUERY, {'login': GITHUB_USER})

    if 'errors' in data:
        sys.exit(f'GraphQL errors: {data["errors"]}')

    cal   = data['data']['user']['contributionsCollection']['contributionCalendar']
    weeks = cal['weeks']

    # Build a 53x7 grid (some accounts return 52 weeks; we pad if short).
    grid = []
    for wk in weeks:
        days = [0] * 7
        for d in wk['contributionDays']:
            days[d['weekday']] = d['contributionCount']
        grid.append(days)
    while len(grid) < 53:
        grid.insert(0, [0] * 7)
    grid = grid[-53:]

    OUT_FILE.parent.mkdir(exist_ok=True)
    OUT_FILE.write_text(json.dumps(grid) + '\n')
    print(f'Done — {cal["totalContributions"]} contributions across {len(grid)} weeks → {OUT_FILE}')

if __name__ == '__main__':
    main()
