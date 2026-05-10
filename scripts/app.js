/* App glue v2: navigation, shelves, playlist, IDE, heatmap, langs, distribution, player. */
(function () {
  const PROJECTS = (window.__term && window.__term.TRACKS) || [];

  const PROJECT_FILES = [
    { id: '01', file: 'house_pricing.py',  icon: '🐍', art: 'a1', title: 'Automated House Pricing Model',
      sub: 'ML-Powered pricing automation reducing estimation time by 99%.',
      metrics: [['MAE', '$8.2k'], ['R²', '0.94'], ['Speedup', '99%'], ['Rows', '184k']],
      body: `Trained a gradient-boosted regression on 184k housing transactions, with feature engineering for neighborhood embeddings and seasonal adjustments. Replaced a manual two-day estimation process with a 1-second API call.\n\nThe key insight was treating "comparable comps" as a learned similarity metric rather than a hand-tuned heuristic — XGBoost found combinations humans wouldn't have written rules for.`,
      stack: ['Python','XGBoost','Pandas','FastAPI'] },
    { id: '02', file: 'perchance.ts',      icon: '🟦', art: 'a2', title: 'PerChance — Real-Time NBA Analytics',
      sub: 'A counter to predatory sports betting platforms.',
      metrics: [['Games', '1,230'], ['ROI vs Kalshi', '+11%'], ['p95 Latency', '120ms'], ['Users', '4.1k']],
      body: `Built PerChance to counter predatory sports betting platforms with transparent NBA prediction tools. Powered by an ensemble of regression and bayesian updating with team-strength priors.`,
      stack: ['Next.js','Postgres','Python','Bayes'] },
    { id: '03', file: 'nomad_ratings.py',  icon: '🌍', art: 'a3', title: 'Nomad Ratings — Travel Credit',
      sub: 'A Django platform that quantifies visa applicant risk.',
      metrics: [['Countries', '60+'], ['Features', '34'], ['AUC', '0.81'], ['Uptime', '99.9%']],
      body: `Integrates consulate feedback, violation history, and travel patterns into a credit-style score. Front-end is a thin shell on a postgres-backed Django API.`,
      stack: ['Django','Postgres','React'] },
    { id: '04', file: 'boxxer.tsx',        icon: '📦', art: 'a4', title: 'Boxxer — Offline-First Packing',
      sub: 'A packing optimization engine for low-connectivity environments.',
      metrics: [['Students', '1.2k'], ['Offline Ratio', '78%'], ['Avg Savings', '14lb'], ['Version', 'v0.4']],
      body: `Engineered an offline-first PWA. The packing optimization engine runs locally in WASM, syncing to a server when connectivity is available.`,
      stack: ['React','SQLite','PWA','Wasm'] },
    { id: '05', file: 'queue_analysis.R',  icon: '📊', art: 'a5', title: 'Queue Analysis @ Ferst Drive',
      sub: 'Vehicle and pedestrian data at a T-intersection.',
      metrics: [['Samples', '4,212'], ['Avg Wait', '38s'], ['p95 Wait', '94s'], ['λ (peak)', '0.42/s']],
      body: `Modeled the intersection as M/M/c queues by approach and tested signal-timing alternatives via simulation. Recommended a 7-second offset that reduced average pedestrian wait by 18%.`,
      stack: ['R','simmer','ggplot2'] },
    { id: '06', file: 'loan_default.py',   icon: '💳', art: 'a6', title: 'Loan Default Prediction',
      sub: 'Improved loan default prediction to reduce financial risk.',
      metrics: [['Models', '3'], ['Best AUC', '0.87'], ['Precision', '0.74'], ['Recall', '0.69']],
      body: `Compared logistic regression, decision trees, and random forests across the same feature set. Random forest won on AUC but logistic regression won on interpretability — and that mattered for the lending team.`,
      stack: ['Python','sklearn','SHAP'] },
    { id: '07', file: 'robotics_oop.cpp',  icon: '🤖', art: 'a7', title: 'Robotics — Sensor Fusion',
      sub: 'IR + optical odometry + wheel encoder data.',
      metrics: [['Sensors', '3'], ['Drift / 10m', '4cm'], ['Hz', '60'], ['Failure', '0.4%']],
      body: `Combined infrared, optical odometry, and wheel-encoder data to help the robot navigate intersections without GPS. Implemented a complementary filter weighted by sensor reliability.`,
      stack: ['C++','ROS','Eigen'] },
  ];

  // Clock
  const clock = document.getElementById('clock');
  setInterval(() => {
    if (clock) {
      const d = new Date();
      const h = d.getHours(), m = d.getMinutes();
      clock.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
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
        current.classList.remove('active','leaving');
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
  if (['home','projects','about','contact'].includes(hash)) navigate(hash);

  window.addEventListener('keydown', (e) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const map = { '1':'home', '2':'projects', '3':'about', '4':'contact' };
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

  // ----------- Projects playlist -----------
  const pl = document.getElementById('projects-playlist');
  if (pl) {
    PROJECTS.forEach((t, i) => {
      const row = document.createElement('div');
      row.className = 'row' + (i === 0 ? ' playing' : '');
      row.innerHTML = `
        <div class="num">${i === 0 ? '<span class="eq" style="color:var(--p3)"><span></span><span></span><span></span><span></span></span>' : `<span class="n">${String(i+1).padStart(2,'0')}</span>`}</div>
        <div class="cover"><span class="cover-icon">${ICONS[String(i+1).padStart(2,'0')] || ''}</span></div>
        <div class="meta"><div class="title">${t.title}</div><div class="sub">${t.artist}</div></div>
        <div class="album">${t.album}</div>
        <div class="plays">${t.plays}</div>
        <div class="dur">${t.dur}</div>
        <div class="more">···</div>
      `;
      row.addEventListener('click', () => {
        if (window.__term) window.__term.runCmd('play ' + (i+1));
        pl.querySelectorAll('.row:not(.header)').forEach(r => r.classList.remove('playing'));
        row.classList.add('playing');
      });
      pl.appendChild(row);
    });
  }

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
          ${p.metrics.map(([k,v]) => `<div class="metric"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom: 18px;">
          ${p.stack.map(s => `<span class="tag">${s}</span>`).join('')}
        </div>
        <h3>What &amp; Why</h3>
        <p>${p.body.replace(/\n\n/g, '</p><p>')}</p>
        <h3>Preview</h3>
        <pre class="code"><span class="ln"> 1</span><span class="com"># ${p.file} — top of the module</span>
<span class="ln"> 2</span><span class="kw">from</span> <span class="var">core</span> <span class="kw">import</span> <span class="fn">model</span>, <span class="fn">data</span>
<span class="ln"> 3</span>
<span class="ln"> 4</span><span class="kw">def</span> <span class="fn">${p.id === '02' ? 'predict_spread' : p.id === '07' ? 'fuse_sensors' : 'train'}</span>(<span class="var">X</span>, <span class="var">y</span>):
<span class="ln"> 5</span>    <span class="com"># the boring 90% lives here, the magic 10% in features.py</span>
<span class="ln"> 6</span>    <span class="var">m</span> = <span class="fn">${p.id === '06' ? 'RandomForestClassifier' : 'GradientBoosting'}</span>(<span class="fn">n_estimators</span>=<span class="num">${300 + parseInt(p.id, 10) * 11}</span>)
<span class="ln"> 7</span>    <span class="var">m</span>.<span class="fn">fit</span>(<span class="var">X</span>, <span class="var">y</span>)
<span class="ln"> 8</span>    <span class="kw">return</span> <span class="var">m</span></pre>
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
  }

  // Open the first project by default
  if (PROJECT_FILES[0]) openTab(PROJECT_FILES[0].id);

  // ----------- Heatmap -----------
  const hm = document.getElementById('heatmap');
  if (hm) {
    for (let w = 0; w < 53; w++) {
      for (let d = 0; d < 7; d++) {
        const recencyBoost = (w / 53) * 1.8;
        const weekday = (d >= 1 && d <= 5) ? 1.0 : 0.45;
        const noise = Math.random();
        const score = (noise * weekday + recencyBoost * 0.4);
        let cls = '';
        if (score > 1.4) cls = 'l4';
        else if (score > 1.0) cls = 'l3';
        else if (score > 0.65) cls = 'l2';
        else if (score > 0.35) cls = 'l1';
        const cell = document.createElement('div');
        cell.className = 'cell ' + cls;
        cell.title = `week ${w+1} · ${['sun','mon','tue','wed','thu','fri','sat'][d]} · ${cls ? Math.round(score*7) : 0} commits`;
        hm.appendChild(cell);
      }
    }
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
    const artists = ['playboi carti','jaden smith','ken carson','yeat','—','—','—','—','—','—','—','—'];
    ag.innerHTML = artists.map((name, i) => {
      const angle = (i * 30) % 360;
      const flip = i % 2 === 0;
      return `
        <div class="artist-tile" style="background: linear-gradient(${angle}deg, ${flip ? 'var(--primary)' : 'var(--secondary)'}, ${flip ? 'var(--secondary)' : 'var(--primary)'});">
          <span>${name}</span>
        </div>
      `;
    }).join('');
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

  window.addEventListener('np-update', (e) => {
    const idx = e.detail.idx;
    const t = PROJECTS[idx];
    if (!t) return;
    if (npTitle) npTitle.textContent = t.title;
    if (npArtist) npArtist.textContent = `${t.artist} · ${t.album}`;
    const [m, s] = t.dur.split(':').map(Number);
    trackTotal = m * 60 + s;
    trackElapsed = 0;
    if (npTotal) npTotal.textContent = t.dur;
  });

  setInterval(() => {
    if (!isPlaying) return;
    trackElapsed = (trackElapsed + 1) % trackTotal;
    if (npFill) npFill.style.width = (trackElapsed / trackTotal * 100) + '%';
    if (npElapsed) npElapsed.textContent = fmtTime(trackElapsed);
  }, 1000);
})();
