/* App glue v2: navigation, shelves, playlist, IDE, heatmap, langs, distribution, player. */
(function () {
  const PROJECTS = (window.__term && window.__term.TRACKS) || [];

  const PROJECT_FILES = [
    {
      id: '01', file: 'perchance.py', icon: '🏀', art: 'a1', title: 'PerChance — NBA Prop Prediction',
      sub: 'Live prediction platform serving 100+ daily users across the NBA season.',
      metrics: [['Daily Users', '100+'], ['Accuracy', '70%'], ['API Latency', '<200ms'], ['Training Data', '1.1M rows']],
      body: `Sportsbooks price props using teams of analysts with injury feeds, sharp money movement, and lineup projections. The only edge available to a solo builder is model accuracy. I trained separate XGBoost regressors on 1.1M player-game records, validated across four held-out seasons, and reached 70% accuracy across 20 metrics — 15% above the naive baseline. A conservative backtest against linear regression lines (same features, different model) showed +13% ROI on points props.\n\nThe system ingests NBA data nightly, retrains automatically via Airflow, and serves predictions through a Django REST API with Redis caching. Sub-200ms under live traffic.`,
      stack: ['PyTorch', 'XGBoost', 'Django', 'React', 'Docker', 'Airflow', 'Redis']
    },
    {
      id: '02', file: 'altura_estimator.py', icon: '🏗️', art: 'a2', title: 'Altura — Renovation Cost Estimator',
      sub: 'Automated pricing platform for a 101-unit multi-family property operator.',
      metrics: [['Estimate Time', 'hours → 5s'], ['Categories', '13'], ['Units', '101'], ['Pipeline', 'Airflow DAG']],
      body: `The client's pricing data wasn't missing — it was trapped in deeply nested Excel matrices that no off-the-shelf tool could parse. I built an ETL pipeline using PySpark and Airflow that extracts those matrices into structured Parquet tables, runs DuckDB validation, and feeds a Next.js interface where the client configures a project in four steps and gets a side-by-side estimate in under five seconds.\n\nWhat previously took most of a workday is now one click. The schema is PySpark-ready for multi-property expansion without code changes.`,
      stack: ['PySpark', 'Airflow', 'DuckDB', 'Parquet', 'Next.js', 'Python']
    },
    {
      id: '03', file: 'gtsf_portfolio.py', icon: '📈', art: 'a3', title: 'GTSF — Portfolio Risk Analysis',
      sub: 'Quantitative tools for a $500K live student-managed equity fund.',
      metrics: [['Portfolio', '$500K live'], ['VaR Reduction', '15%'], ['Coverage', '50 → 120 stocks'], ['Simulations', '10,000 runs']],
      body: `The GTSF manages a $500K live equity fund where model outputs inform real trades. During the mentorship program, I sought to implement ARIMA models to validate sector-rotation strategies and ran 10,000-iteration Monte Carlo simulations to stress-test the portfolio under macro shocks — the simulations identified 8% downside risk that directly shaped the fund's hedging position.\n\n I also built a Bloomberg Terminal screener that tripled coverage from 50 to 120 tickers because I wanted to change what the team could even consider for the portfolio. First time I worked with data where being wrong had an immediate dollar cost.`,
      stack: ['Python', 'Bloomberg Terminal', 'ARIMA', 'NumPy', 'Statsmodels', 'Monte Carlo']
    },
    {
      id: '04', file: 'doc_intelligence.py', icon: '📄', art: 'a4', title: 'Document Intelligence System',
      sub: 'Production classifier processing 10,000+ documents monthly for 50+ auditors.',
      metrics: [['Precision', '95%'], ['Latency', '45s → 8s'], ['Volume', '10K docs/mo'], ['Error Rate', '40% → 5%']],
      body: `The latency problem turned out to be a single O(n²) loop in the document matching step — swapping it for an O(n+m) hash-join approach cut processing time from 45 seconds to 8 seconds without touching the model. The precision problem was mostly label noise; a statistical validation framework with 50+ automated distributional checks surfaced the bad training examples that were silently degrading performance.\n\nThe pipeline now serves 50+ auditors processing 10,000+ documents monthly at 95% precision. A/B testing framework with bootstrapped confidence intervals and multiple-comparison corrections governs any future model updates.`,
      stack: ['Python', 'PostgreSQL', 'NLP', 'A/B Testing', 'PyTest']
    },
    {
      id: '05', file: 'loan_default.py', icon: '💳', art: 'a5', title: 'Loan Default Risk Model',
      sub: 'ML classifier to flag high-risk loan applications before approval.',
      metrics: [['AUC', '0.80'], ['Recall', '82%'], ['Applications', '50,000+'], ['Decision Quality', '+10%']],
      body: `The interesting part wasn't the model — XGBoost on 50,000+ applications is fairly standard. The hard part was that the lending team couldn't act on a black-box score. SHAP analysis revealed debt-to-income ratio was driving the majority of predictions, which allowed me to build a tiered risk framework they could explain to regulators and apply in approval meetings.\n\nI engineered 15 features from raw credit bureau data using CTE-based SQL ETL — payment velocity, credit utilization trends, account age. Applied SMOTE to address the 20:1 class imbalance before training. The framework improved approval decision quality by 10%.`,
      stack: ['XGBoost', 'SHAP', 'SQL', 'Python', 'SMOTE']
    },
    {
      id: '06', file: 'hospital_ops.sql', icon: '🏥', art: 'a6', title: 'Hospital Operations Database',
      sub: 'Redesigned data infrastructure for 50,000+ patient records.',
      metrics: [['Tables', '15'], ['Records', '50,000+'], ['Redundancy', '-20%'], ['Query Time', '3s → 200ms']],
      body: `The hospital's data wasn't inaccessible — it was just slow and structurally inconsistent. Every useful query required bespoke one-off scripts because there was no foreign key discipline and no normalization. I redesigned the schema to 3NF across 15 tables, eliminating 20% redundancy.\n\nThe most impactful change was composite indexes on the bed utilization queries — the primary operations query dropped from 3 seconds to 200ms, making it fast enough to pull up in a morning standup rather than scheduled as an overnight report. Window functions handle the rolling utilization analysis.`,
      stack: ['PostgreSQL', 'Python', 'CTEs', 'Window Functions']
    },
  ];

  // Clock
  const clock = document.getElementById('clock');
  setInterval(() => {
    if (clock) {
      const d = new Date();
      const h = d.getHours(), m = d.getMinutes();
      clock.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }, 1000);

  // ----------- Navigation -----------
  function navigate(page) {
    const main = document.querySelector('.main');
    const current = document.querySelector('.page.active');
    const target = document.querySelector(`.page[data-page="${page}"]`);
    if (!target) return;
    document.querySelectorAll('.sb-item').forEach(a => a.classList.toggle('active', a.dataset.nav === page));
    history.replaceState({}, '', '#/' + page);
    if (current === target) return;
    if (current) {
      current.classList.add('leaving');
      setTimeout(() => {
        current.classList.remove('active', 'leaving');
        target.classList.add('active');
        if (main) main.scrollTo({ top: 0, behavior: 'instant' });
      }, 180);
    } else {
      target.classList.add('active');
      if (main) main.scrollTo({ top: 0, behavior: 'instant' });
    }
  }
  window.__navigate = navigate;
  document.querySelectorAll('.sb-item').forEach(a => {
    a.addEventListener('click', () => { if (a.dataset.nav) navigate(a.dataset.nav); });
  });
  window.addEventListener('navigate', (e) => navigate(e.detail));
  const hash = (location.hash || '').replace('#/', '');
  if (['home', 'projects', 'about', 'contact'].includes(hash)) navigate(hash);

  window.addEventListener('keydown', (e) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const map = { '1': 'home', '2': 'projects', '3': 'about', '4': 'contact' };
    if (map[e.key]) { e.preventDefault(); navigate(map[e.key]); }
    if (e.key === 'k') { e.preventDefault(); const s = document.getElementById('search'); if (s) s.focus(); }
  });

  // ----------- Contextual icons (24px, line) -----------
  const ICONS = {
    '01': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
    '02': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12c3-2 6-2 9 0s6 2 9 0"/><path d="M12 3c-2 3-2 6 0 9s2 6 0 9"/></svg>',
    '03': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 010 18"/><path d="M12 3a14 14 0 000 18"/></svg>',
    '04': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>',
    '05': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-8"/><path d="M22 20H2"/></svg>',
    '06': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>',
    '07': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="8" width="14" height="11" rx="2"/><path d="M12 4v4"/><circle cx="12" cy="4" r="1.2"/><path d="M9 13h.01M15 13h.01"/><path d="M2 13v3M22 13v3"/></svg>',
  };
  window.__ICONS = ICONS;
  function tile(p) {
    const el = document.createElement('div');
    el.className = 'tile';
    el.innerHTML = `
      <div class="art">
        <div class="art-icon">${ICONS[p.id] || ''}</div>
      </div>
      <div class="title">${p.title}</div>
      <div class="sub">${p.sub.split('.')[0]}</div>
    `;
    el.addEventListener('click', () => {
      navigate('projects');
      setTimeout(() => openTab(p.id), 220);
    });
    return el;
  }
  const featured = document.getElementById('featured-shelf');
  const recent = document.getElementById('recent-shelf');
  if (featured) PROJECT_FILES.slice(0, 4).forEach(p => featured.appendChild(tile(p)));
  if (recent) PROJECT_FILES.slice().reverse().slice(0, 5).forEach(p => recent.appendChild(tile(p)));

  // ----------- File tree + IDE tabs -----------
  const tree = document.getElementById('file-tree');
  if (tree) {
    PROJECT_FILES.forEach(p => {
      const el = document.createElement('div');
      el.className = 'ide-item';
      el.dataset.tab = p.id;
      el.innerHTML = `<span class="glyph">›</span><span>${p.file}</span>`;
      el.addEventListener('click', () => openTab(p.id));
      tree.appendChild(el);
    });
  }

  const tabs = document.getElementById('ide-tabs');
  const content = document.getElementById('ide-content');

  function renderEmptyView() {
    return `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height: 380px; text-align:center; color: var(--fg-3);">
        <div style="font-size: 36px; margin-bottom: 12px; opacity: 0.6;">♫</div>
        <div style="font-size: 15px; color: var(--fg-2); margin-bottom: 6px;">No file open</div>
        <div style="font-size: 13px;">Pick a file from the tree, or browse the playlist above.</div>
      </div>
    `;
  }

  function renderFileView(id) {
    const p = PROJECT_FILES.find(x => x.id === id);
    if (!p) return renderEmptyView();
    return `
      <div class="project-detail">
        <div class="crumb">~/projects/${p.file}</div>
        <h1>${p.title}</h1>
        <div class="sub">${p.sub}</div>
        <div class="meta-grid">
          ${p.metrics.map(([k, v]) => `<div class="metric"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom: 18px;">
          ${p.stack.map(s => `<span class="tag">${s}</span>`).join('')}
        </div>
        <p>${p.body.replace(/\n\n/g, '</p><p>')}</p>
      </div>
    `;
  }

  function closeTab(id) {
    if (!tabs || !content) return;
    const tab = tabs.querySelector(`.ide-tab[data-tab="${id}"]`);
    if (!tab) return;
    const wasActive = tab.classList.contains('active');
    const remaining = Array.from(tabs.querySelectorAll('.ide-tab'));
    const idx = remaining.indexOf(tab);
    tab.remove();
    if (tree) {
      const t = tree.querySelector(`.ide-item[data-tab="${id}"]`);
      if (t) t.classList.remove('active');
    }
    const left = tabs.querySelectorAll('.ide-tab');
    if (left.length === 0) {
      content.innerHTML = renderEmptyView();
      return;
    }
    if (wasActive) {
      const nextTab = left[Math.min(idx, left.length - 1)];
      if (nextTab) openTab(nextTab.dataset.tab);
    }
  }

  let bootDone = false;
  let syncingFromTab = false;
  let syncingFromTerm = false;

  function openTab(id) {
    if (!tabs || !content) return;
    let tab = tabs.querySelector(`.ide-tab[data-tab="${id}"]`);
    if (!tab) {
      const p = PROJECT_FILES.find(x => x.id === id);
      if (!p) return;
      tab = document.createElement('div');
      tab.className = 'ide-tab';
      tab.dataset.tab = id;
      tab.innerHTML = `<span>${p.icon}</span> ${p.file} <span class="x" data-close="${id}">×</span>`;
      tab.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('x')) {
          e.stopPropagation();
          closeTab(id);
          return;
        }
        openTab(id);
      });
      tabs.appendChild(tab);
    }
    tabs.querySelectorAll('.ide-tab').forEach(t => t.classList.toggle('active', t === tab));
    if (tree) tree.querySelectorAll('.ide-item').forEach(t => t.classList.toggle('active', t.dataset.tab === id));
    content.innerHTML = renderFileView(id);

    // Sync the player to the open tab (suppressed during boot and re-entrant calls)
    if (bootDone && !syncingFromTerm) {
      syncingFromTab = true;
      const n = parseInt(id, 10);
      if (window.__term) window.__term.runCmd('play ' + n);
      syncingFromTab = false;
    }
  }
  window.__openTab = openTab;

  // Open the first project by default (silent — boot flag prevents sync echo)
  if (PROJECT_FILES[0]) openTab(PROJECT_FILES[0].id);
  bootDone = true;

  // When the track changes (terminal, prev/next, shelf tile), navigate to
  // projects and open the matching IDE tab.
  window.addEventListener('np-update', (e) => {
    if (syncingFromTab) return;
    const idx = e.detail && e.detail.idx;
    const t = (window.__term && window.__term.TRACKS && window.__term.TRACKS[idx]);
    if (!t) return;
    const projectsPage = document.querySelector('.page[data-page="projects"]');
    const onProjects = projectsPage && projectsPage.classList.contains('active');
    if (!onProjects && window.__navigate) window.__navigate('projects');
    syncingFromTerm = true;
    openTab(t.n);
    syncingFromTerm = false;
  });

  // ----------- Heatmap -----------
  const hm = document.getElementById('heatmap');
  if (hm) {
    const GITHUB_USER = 'andomo3';
    const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    function renderMockHeatmap(el) {
      for (let w = 0; w < 53; w++) {
        for (let d = 0; d < 7; d++) {
          const recencyBoost = (w / 53) * 1.8;
          const weekday = (d >= 1 && d <= 5) ? 1.0 : 0.45;
          const score = (Math.random() * weekday + recencyBoost * 0.4);
          let cls = '';
          if (score > 1.4) cls = 'l4';
          else if (score > 1.0) cls = 'l3';
          else if (score > 0.65) cls = 'l2';
          else if (score > 0.35) cls = 'l1';
          const cell = document.createElement('div');
          cell.className = 'cell ' + cls;
          cell.title = `week ${w + 1} · ${DAYS[d]} · ${cls ? Math.round(score * 7) : 0} commits`;
          el.appendChild(cell);
        }
      }
    }

    function renderHeatmap(grid) {
      let totalCommits = 0, activeDays = 0, maxStreak = 0, curStreak = 0;
      hm.innerHTML = '';
      const flat = grid.flat();
      const max = Math.max(...flat, 1);
      grid.forEach((week, wi) => {
        week.forEach((count, di) => {
          totalCommits += count;
          if (count > 0) { activeDays++; curStreak++; maxStreak = Math.max(maxStreak, curStreak); }
          else curStreak = 0;
          const lvl = count === 0 ? '' : count < max * 0.25 ? 'l1' : count < max * 0.5 ? 'l2' : count < max * 0.75 ? 'l3' : 'l4';
          const cell = document.createElement('div');
          cell.className = 'cell ' + lvl;
          cell.title = `week ${wi + 1} · ${DAYS[di]} · ${count} commits`;
          hm.appendChild(cell);
        });
      });
      const statsEl = hm.closest('.heatmap-wrap') && hm.closest('.heatmap-wrap').querySelector('.heatmap-stats');
      if (statsEl) {
        const s = statsEl.querySelectorAll('.s');
        if (s[0]) s[0].innerHTML = `<b>${totalCommits.toLocaleString()}</b>commits`;
        if (s[1]) s[1].innerHTML = `<b>${activeDays}</b>active days`;
        if (s[2]) s[2].innerHTML = `<b>${maxStreak}</b>day streak`;
      }
    }

    async function fetchCommitActivity(repoName, retries = 3) {
      for (let i = 0; i < retries; i++) {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${repoName}/stats/commit_activity`);
        if (res.status === 202) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      }
      return [];
    }

    async function buildHeatmapLive() {
      const reposRes = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100`);
      if (!reposRes.ok) throw new Error(`GitHub repos fetch failed: ${reposRes.status}`);
      const repos = await reposRes.json();
      const weekMaps = await Promise.all(repos.map(r => fetchCommitActivity(r.name).catch(() => [])));
      const grid = Array.from({ length: 52 }, () => new Array(7).fill(0));
      for (const weeks of weekMaps) {
        weeks.forEach((wk, wi) => {
          if (wi < 52 && Array.isArray(wk.days)) {
            wk.days.forEach((count, di) => { grid[wi][di] += count; });
          }
        });
      }
      return grid;
    }

    fetch('data/github-commits.json')
      .then(r => r.ok ? r.json() : Promise.reject('no static file'))
      .then(renderHeatmap)
      .catch(() =>
        buildHeatmapLive()
          .then(renderHeatmap)
          .catch(err => { console.warn('[heatmap] falling back to mock:', err); renderMockHeatmap(hm); })
      );
  }

  // ----------- Languages -----------
  const langsEl = document.getElementById('langs');
  if (langsEl) {
    const langs = [['Python', 32], ['TypeScript', 22], ['SQL', 12], ['C++', 9], ['R', 8], ['JavaScript', 7], ['Go', 5], ['Bash', 5]];
    langsEl.innerHTML = langs.map(([n, p]) => `
      <div class="row">
        <div class="name">${n}</div>
        <div class="bar"><span style="width: ${p * 2.5}%"></span></div>
        <div class="pct">${p}%</div>
      </div>
    `).join('');
  }

  // ----------- Distribution -----------
  const dist = document.getElementById('distribution');
  if (dist) {
    const N = 48;
    let html = '';
    for (let i = 0; i < N; i++) {
      const x = i / N * 24;
      const morning = Math.exp(-Math.pow((x - 9.5) / 2.4, 2));
      const night = 1.4 * Math.exp(-Math.pow((x - 22) / 2.0, 2));
      const v = morning + night + 0.04 * Math.random();
      html += `<div class="b" style="height: ${10 + v * 70}px; opacity: ${0.55 + v * 0.4};"></div>`;
    }
    dist.innerHTML = html;
  }

  // ----------- Artist grid -----------
  const ag = document.getElementById('artist-grid');
  if (ag) {
    function renderFallbackArtists() {
      const fallback = ['playboi carti', 'jaden smith', 'ken carson', 'yeat', '—', '—', '—', '—', '—', '—', '—', '—'];
      ag.innerHTML = fallback.map((name, i) => {
        const angle = (i * 30) % 360;
        const flip = i % 2 === 0;
        return `<div class="artist-tile" style="background:linear-gradient(${angle}deg,${flip ? 'var(--p1)' : 'var(--p3)'},${flip ? 'var(--p3)' : 'var(--p1)'})"><span>${name}</span></div>`;
      }).join('');
    }

    fetch('data/spotify-top-artists.json')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(artists => {
        ag.innerHTML = artists.slice(0, 12).map(a => {
          const bg = a.image
            ? `background-image:url(${a.image})`
            : `background:linear-gradient(135deg,var(--p1),var(--p3))`;
          return `<div class="artist-tile" style="${bg}"><span>${a.name}</span></div>`;
        }).join('');
      })
      .catch(renderFallbackArtists);
  }

  // ----------- Player sync -----------
  const npTitle = document.getElementById('np-title');
  const npArtist = document.getElementById('np-artist');
  const npFill = document.getElementById('np-fill');
  const npElapsed = document.getElementById('np-elapsed');
  const npTotal = document.getElementById('np-total');

  function fmtTime(s) {
    const m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ':' + String(r).padStart(2, '0');
  }

  let trackElapsed = 84;
  let trackTotal = 222;
  let isPlaying = true;
  const playBtn = document.getElementById('np-play');
  if (playBtn) playBtn.addEventListener('click', () => { isPlaying = !isPlaying; });

  const npCoverIcon = document.querySelector('.player-left .cover-icon-np');

  window.addEventListener('np-update', (e) => {
    const idx = e.detail.idx;
    const t = PROJECTS[idx];
    if (!t) return;
    if (npTitle) npTitle.textContent = t.title;
    if (npArtist) npArtist.textContent = `${t.artist} · ${t.album}`;
    const pf = PROJECT_FILES.find(f => parseInt(f.id, 10) === idx + 1);
    if (npCoverIcon && pf) npCoverIcon.textContent = pf.icon;
    const [m, s] = t.dur.split(':').map(Number);
    trackTotal = m * 60 + s;
    trackElapsed = 0;
    if (npTotal) npTotal.textContent = t.dur;
  });

  function onProjectsPage() {
    const p = document.querySelector('.page[data-page="projects"]');
    return !!(p && p.classList.contains('active'));
  }

  setInterval(() => {
    if (!isPlaying) return;
    // While the user is reading a project, scroll drives the seek bar — skip auto-tick.
    if (onProjectsPage()) return;
    trackElapsed = (trackElapsed + 1) % trackTotal;
    if (npFill) npFill.style.width = (trackElapsed / trackTotal * 100) + '%';
    if (npElapsed) npElapsed.textContent = fmtTime(trackElapsed);
  }, 1000);

  // Scroll → seek: as the user scrolls through the Projects page, fill the seek bar.
  const mainEl = document.querySelector('.main');
  if (mainEl) {
    mainEl.addEventListener('scroll', () => {
      if (!onProjectsPage()) return;
      const total = mainEl.scrollHeight - mainEl.clientHeight;
      if (total <= 0) return;
      const pct = Math.min(1, Math.max(0, mainEl.scrollTop / total));
      trackElapsed = pct * trackTotal;
      if (npFill) npFill.style.width = (pct * 100) + '%';
      if (npElapsed) npElapsed.textContent = fmtTime(trackElapsed);
    }, { passive: true });
  }
})();
