# Portfolio — Abba Ndomo

Static site. No build step. Open `index.html` or serve the directory.

## Local development

```powershell
python -m http.server 8000
# → http://localhost:8000
```

## Structure

```
index.html                  # single-page app, four sections (home/projects/about/contact)
scripts/
  app.js                    # navigation, IDE projects view, heatmap, artist grid, player
  terminal.js               # music-CLI terminal on /projects
  enhancements.js           # liner notes, visualizer, setlists
  fetch-spotify.py          # pre-fetch top artists → data/spotify-top-artists.json
  fetch-github.py           # pre-fetch commit activity → data/github-commits.json
stylesheets/
  styles.css                # base
  enhancements.css          # liner notes, visualizer, etc.
data/
  spotify-top-artists.json  # baked at build time (committed)
  github-commits.json       # baked at build time (committed)
.github/workflows/
  refresh-spotify.yml       # monthly cron to refresh Spotify JSON
```

## Refreshing data

**Spotify** (top artists on About page):
```powershell
python scripts/fetch-spotify.py --auth      # first time only — saves refresh token to .env
python scripts/fetch-spotify.py             # subsequent runs
```

**GitHub** (commit heatmap on Home page):
```powershell
# optional: set GITHUB_TOKEN in .env to raise rate limit 60 → 5000/hr
python scripts/fetch-github.py
```

## Deployment — GitHub Pages

1. Push to `main` (or `master`) on a public GitHub repo.
2. Settings → Pages → Source: **Deploy from a branch** → Branch: **main / (root)**.
3. Site goes live at `https://<username>.github.io/<repo>` after ~1 min.
4. Optional custom domain: add a `CNAME` file with the domain on one line, configure DNS.

The `.nojekyll` file disables Jekyll processing so files/folders aren't filtered.
