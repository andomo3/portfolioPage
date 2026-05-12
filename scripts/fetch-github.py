#!/usr/bin/env python3
"""
Fetch commit activity from all public repos and write data/github-commits.json.

Usage:
  python scripts/fetch-github.py

Optional env var (raises rate limit from 60 to 5000 req/hr):
  GITHUB_TOKEN  — a fine-grained PAT with "Public Repositories (read-only)" scope

Output: data/github-commits.json
  A 52x7 nested array: grid[week][day] = commit_count (week 0 = oldest, day 0 = Sunday)
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

REPO_ROOT   = Path(__file__).resolve().parent.parent
ENV_FILE    = REPO_ROOT / '.env'
OUT_FILE    = REPO_ROOT / 'data' / 'github-commits.json'
GITHUB_USER = 'andomo3'
API_BASE    = 'https://api.github.com'

def load_env():
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, _, v = line.partition('=')
                os.environ.setdefault(k.strip(), v.strip())

def get_headers():
    h = {'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'}
    token = os.environ.get('GITHUB_TOKEN')
    if token:
        h['Authorization'] = f'Bearer {token}'
    return h

def api_get(url, retries=3, retry_delay=2):
    req = urllib.request.Request(url, headers=get_headers())
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                if r.status == 202:
                    # GitHub is computing stats — retry after delay
                    if attempt < retries - 1:
                        time.sleep(retry_delay)
                        continue
                    return None
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code in (403, 429):
                reset = e.headers.get('X-RateLimit-Reset')
                if reset:
                    wait = max(0, int(reset) - int(time.time())) + 2
                    print(f'  rate limited — waiting {wait}s', file=sys.stderr)
                    time.sleep(wait)
                else:
                    time.sleep(60)
                continue
            raise
    return None

def fetch_repos():
    repos, page = [], 1
    while True:
        url = f'{API_BASE}/users/{GITHUB_USER}/repos?per_page=100&page={page}'
        batch = api_get(url)
        if not batch:
            break
        repos.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    return repos

def fetch_commit_grid(repos):
    grid = [[0] * 7 for _ in range(52)]
    for i, repo in enumerate(repos):
        name = repo['name']
        print(f'  [{i+1}/{len(repos)}] {name}')
        weeks = api_get(f'{API_BASE}/repos/{GITHUB_USER}/{name}/stats/commit_activity')
        if not weeks or not isinstance(weeks, list):
            continue
        for wi, wk in enumerate(weeks):
            if wi >= 52:
                break
            days = wk.get('days', [])
            for di, count in enumerate(days[:7]):
                grid[wi][di] += count
    return grid

def main():
    load_env()
    print(f'Fetching repos for {GITHUB_USER}…')
    repos = fetch_repos()
    print(f'Found {len(repos)} public repos. Fetching commit activity…')
    grid = fetch_commit_grid(repos)
    total = sum(c for week in grid for c in week)
    OUT_FILE.parent.mkdir(exist_ok=True)
    OUT_FILE.write_text(json.dumps(grid) + '\n')
    print(f'Done — {total} total commits → {OUT_FILE}')

if __name__ == '__main__':
    main()
