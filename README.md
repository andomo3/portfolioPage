# Portfolio — Abba Ndomo

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
