/* Music-CLI terminal: hybrid (autoplay intro, then typeable). */
(function () {
  const term = document.getElementById('term-body');
  const input = document.getElementById('term-input');
  const inputRow = document.getElementById('term-input-row');
  if (!term || !input) return;

  // ---------- Data ----------
  const TRACKS = [
    { n: '01', title: 'PerChance — NBA Prop Prediction',      artist: 'Founder · Jan 2026',       album: 'live_at_100_users',     dur: '4:18', plays: '1.1M', stack: ['PyTorch','XGBoost','Django','React'] },
    { n: '02', title: 'Altura — Renovation Cost Estimator',   artist: 'Data & ML Engineer',        album: 'hours_to_5_seconds',    dur: '3:55', plays: '847K', stack: ['PySpark','Airflow','DuckDB','Next.js'] },
    { n: '03', title: 'GTSF — Portfolio Risk Analysis',       artist: 'Quantitative Analyst',      album: 'live_500k_equity',      dur: '4:11', plays: '512K', stack: ['Python','Bloomberg','ARIMA','Monte Carlo'] },
    { n: '04', title: 'Document Intelligence System',         artist: 'Data Science Intern',       album: 'mumbai_audit_pipeline', dur: '3:42', plays: '673K', stack: ['Python','PostgreSQL','NLP'] },
    { n: '05', title: 'Loan Default Risk Model',              artist: 'Credit Risk Models',        album: 'logit_xgb_shap',        dur: '4:36', plays: '512K', stack: ['XGBoost','SHAP','SQL'] },
    { n: '06', title: 'Hospital Operations Database',         artist: 'Systems Design',            album: '3nf_50k_records',       dur: '3:28', plays: '198K', stack: ['PostgreSQL','Python','CTEs'] },
  ];

  const HELP = [
    ['help',          'show this list'],
    ['ls',            'list pages — home, projects, about, contact'],
    ['cd <page>',     'navigate to a page'],
    ['play <n|name>', 'play a track from the project playlist'],
    ['next / prev',   'skip tracks'],
    ['queue',         'show the playlist'],
    ['now',           'what is currently playing'],
    ['shuffle',       'roll the dice — pick a random project'],
    ['stack',         'show top languages / tools (with %)'],
    ['whoami',        'identity readout'],
    ['fortune',       'a probabilistic koan'],
    ['clear',         'clear the buffer'],
  ];

  // ---------- State ----------
  let currentTrack = 0;
  let history = [];
  let histIdx = -1;
  let typing = false;

  // ---------- Output helpers ----------
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function lineHTML(html, cls) {
    const d = document.createElement('div');
    d.className = 'line ' + (cls || 'out');
    d.innerHTML = html;
    term.appendChild(d);
    term.scrollTop = term.scrollHeight;
    return d;
  }
  function blank() { lineHTML('&nbsp;', 'dim'); }

  function promptHTML() {
    return `<span class="prompt"><span class="user">abba</span><span class="at">@</span><span class="host">portfolio</span><span class="sep">:</span><span class="path">~</span><span class="sep">$</span></span>`;
  }

  function printPrompt(cmd) {
    lineHTML(`${promptHTML()} <span class="cmd">${cmd}</span>`, 'cmd');
  }

  function trackLine(t, playing=false) {
    const icon = playing
      ? `<span class="eq"><span></span><span></span><span></span><span></span></span>`
      : `<span style="color:var(--fg-muted)">▸</span>`;
    return `
      <div class="np">
        <div class="icon">${icon}</div>
        <div>
          <div><span class="title">${t.title}</span> <span class="dim" style="color:var(--fg-muted)">— ${t.artist}</span></div>
          <div style="color:var(--fg-muted); font-size: 11.5px;">album: <span style="color:var(--fg-dim)">${t.album}</span> · stack: ${t.stack.join(' · ')}</div>
        </div>
        <div class="time">${t.dur}</div>
      </div>
    `;
  }

  // ---------- Boot intro (animated) ----------
  const intro = [
    { delay: 100, html: `<span class="dim">[boot] terminal-mu v0.4.2 // probabilistic shell</span>`, cls: 'dim' },
    { delay: 280, html: `<span class="dim">[ok]   loading playlist… <span class="ok">6 tracks</span> indexed</span>`, cls: 'out' },
    { delay: 240, html: `<span class="dim">[ok]   markov chain warm — transitions stable</span>`, cls: 'out' },
    { delay: 240, html: `<span class="dim">[ok]   stack profiler online</span>`, cls: 'out' },
    { delay: 320, html: `&nbsp;` },
    { delay: 200, html: `${promptHTML()} <span class="cmd">whoami</span>` , cls: 'cmd', type: true },
    { delay: 200, html: `<span style="color:var(--fg)">abba ndomo</span> · <span class="dim">georgia tech '27</span> · <span class="dim">ISyE + OR</span>`, cls: 'out' },
    { delay: 100, html: `<span class="dim">data & ml engineer · building perchance · CPT available · f-1 visa</span>`, cls: 'dim' },
    { delay: 320, html: `&nbsp;` },
    { delay: 200, html: `${promptHTML()} <span class="cmd">play 1</span>`, cls: 'cmd', type: true },
    { delay: 100, html: `<span class="ok">▶</span> now playing: <span style="color:var(--fg)">${TRACKS[0].title}</span> — <span class="dim">${TRACKS[0].artist}</span>`, cls: 'out' },
    { delay: 80, html: trackLine(TRACKS[0], true), cls: 'out' },
    { delay: 240, html: `&nbsp;` },
    { delay: 200, html: `<span class="dim">type</span> <span style="color:var(--p3)">help</span> <span class="dim">to see what i respond to. ↑/↓ recalls history.</span>`, cls: 'dim' },
  ];

  function typeLineInto(target, fullHTML, done) {
    // Type by characters but using innerHTML — we'll detect tags
    // Strategy: render full HTML invisibly, then reveal char by char
    const tmp = document.createElement('span');
    tmp.innerHTML = fullHTML;
    const chars = [];
    function walk(node) {
      if (node.nodeType === 3) {
        for (const c of node.nodeValue) chars.push({ kind: 't', c, parent: node.parentNode, ref: node });
      } else if (node.nodeType === 1) {
        const clone = node.cloneNode(false);
        chars.push({ kind: 'open', el: clone });
        node.childNodes.forEach(walk);
        chars.push({ kind: 'close' });
      }
    }
    tmp.childNodes.forEach(walk);

    // simpler: just type plain text content with a slight cursor
    const text = tmp.textContent;
    let i = 0;
    target.innerHTML = '';
    const cursor = document.createElement('span');
    cursor.style.cssText = 'display:inline-block;width:7px;height:13px;background:var(--p3);vertical-align:-2px;margin-left:1px;animation:blink 1s steps(2,end) infinite;';
    function step() {
      if (i >= text.length) {
        target.innerHTML = fullHTML; // upgrade to styled HTML
        if (done) done();
        return;
      }
      const c = text[i++];
      target.appendChild(document.createTextNode(c));
      target.appendChild(cursor);
      setTimeout(step, 22 + Math.random() * 30);
    }
    step();
  }

  let introIdx = 0;
  function runIntro() {
    typing = true;
    function next() {
      if (introIdx >= intro.length) {
        typing = false;
        inputRow.style.opacity = '1';
        input.focus();
        return;
      }
      const step = intro[introIdx++];
      setTimeout(() => {
        const d = lineHTML('', step.cls || 'out');
        if (step.type) {
          typeLineInto(d, step.html, next);
        } else {
          d.innerHTML = step.html;
          term.scrollTop = term.scrollHeight;
          next();
        }
      }, step.delay);
    }
    next();
  }

  // ---------- Commands ----------
  const COMMANDS = {
    help() {
      lineHTML('<span style="color:var(--fg)">commands</span>', 'out');
      HELP.forEach(([cmd, desc]) => {
        lineHTML(`  <span style="color:var(--p3)">${cmd.padEnd(16, ' ')}</span><span class="dim">${desc}</span>`, 'out');
      });
    },
    ls() {
      lineHTML(`<span style="color:var(--p1)">home/</span>  <span style="color:var(--p1)">projects/</span>  <span style="color:var(--p1)">about/</span>  <span style="color:var(--p1)">contact/</span>  <span class="dim">resume.pdf</span>`, 'out');
    },
    cd(args) {
      const page = (args[0] || '').replace(/\/$/, '');
      const valid = ['home', 'projects', 'about', 'contact'];
      if (!valid.includes(page)) {
        lineHTML(`<span class="err">cd: no such page: ${page || '(empty)'}</span>`, 'err');
        return;
      }
      lineHTML(`<span class="ok">→</span> navigating to /${page}`, 'ok');
      window.dispatchEvent(new CustomEvent('navigate', { detail: page }));
    },
    play(args) {
      let idx;
      if (!args.length) idx = currentTrack;
      else if (/^\d+$/.test(args[0])) idx = parseInt(args[0], 10) - 1;
      else {
        const q = args.join(' ').toLowerCase();
        idx = TRACKS.findIndex(t => t.title.toLowerCase().includes(q));
      }
      if (idx == null || idx < 0 || idx >= TRACKS.length) {
        lineHTML(`<span class="err">play: track not found</span>`, 'err');
        return;
      }
      currentTrack = idx;
      const t = TRACKS[idx];
      lineHTML(`<span class="ok">▶</span> now playing: <span style="color:var(--fg)">${t.title}</span> — <span class="dim">${t.artist}</span>`, 'out');
      lineHTML(trackLine(t, true), 'out');
      window.dispatchEvent(new CustomEvent('np-update', { detail: { idx } }));
    },
    next() { COMMANDS.play([String(((currentTrack + 1) % TRACKS.length) + 1)]); },
    prev() { COMMANDS.play([String(((currentTrack - 1 + TRACKS.length) % TRACKS.length) + 1)]); },
    queue() {
      lineHTML(`<span class="dim">queue · 6 tracks · 24:10 total</span>`, 'dim');
      TRACKS.forEach((t, i) => {
        const playing = i === currentTrack;
        const num = `<span style="color:var(--fg-muted); font-variant-numeric: tabular-nums;">${String(i+1).padStart(2,'0')}</span>`;
        const tt = playing ? `<span style="color:var(--p3)">${t.title}</span>` : `<span style="color:var(--fg)">${t.title}</span>`;
        lineHTML(`  ${num}  ${tt} <span class="dim">— ${t.artist}</span>  <span style="color:var(--fg-muted)">${t.dur}</span>`, 'out');
      });
    },
    now() {
      const t = TRACKS[currentTrack];
      lineHTML(`<span class="dim">now playing</span>`, 'dim');
      lineHTML(trackLine(t, true), 'out');
    },
    shuffle() {
      const i = Math.floor(Math.random() * TRACKS.length);
      lineHTML(`<span class="dim">rolled ~ U{1..${TRACKS.length}}</span> → <span style="color:var(--p3)">${i+1}</span>`, 'dim');
      COMMANDS.play([String(i+1)]);
    },
    stack() {
      const langs = [
        ['Python',     35], ['SQL',         18], ['TypeScript',  15],
        ['R',           8], ['JavaScript',   8], ['Java',         7],
        ['Bash',        5], ['C++',          4],
      ];
      lineHTML(`<span class="dim">top languages, by recent commit volume</span>`, 'dim');
      langs.forEach(([n, p]) => {
        const w = Math.round(p * 0.6);
        const bar = '█'.repeat(w) + '░'.repeat(30 - w);
        lineHTML(`  <span style="color:var(--fg)">${n.padEnd(11,' ')}</span> <span style="color:var(--p3)">${bar}</span> <span class="dim">${p}%</span>`, 'out');
      });
    },
    whoami() {
      lineHTML(`<span style="color:var(--fg)">abba ndomo</span> · data & ml engineer · georgia tech '27`, 'out');
      lineHTML(`<span class="dim">ISyE + OR · building perchance · CPT available · f-1 visa</span>`, 'dim');
    },
    fortune() {
      const fortunes = [
        'all models are wrong; some sound good at 2am.',
        'a martingale is just a song that refuses to climax.',
        'p < 0.05 is not a personality.',
        'you are the posterior of your daily prior.',
        'the only stationary distribution is the one you ship.',
      ];
      lineHTML(`<span style="color:var(--p3)">𝑝</span> <span style="color:var(--fg)">${fortunes[Math.floor(Math.random()*fortunes.length)]}</span>`, 'out');
    },
    clear() {
      term.innerHTML = '';
    },
    contact() {
      lineHTML(`<span class="dim">use </span><span style="color:var(--p3)">cd contact</span><span class="dim"> or:</span>`, 'dim');
      lineHTML(`  email   · <a style="color:var(--p3)" href="mailto:abba.ndomo@gmail.com">abba.ndomo@gmail.com</a>`, 'out');
      lineHTML(`  github  · <a style="color:var(--p3)" target="_blank" href="https://github.com/andomo3">github.com/andomo3</a>`, 'out');
      lineHTML(`  linkedin · <a style="color:var(--p3)" target="_blank" href="https://linkedin.com/in/AbbaNdomo">linkedin.com/in/AbbaNdomo</a>`, 'out');
    },
  };

  function runCmd(raw) {
    const trimmed = raw.trim();
    if (!trimmed) { printPrompt(''); return; }
    printPrompt(trimmed);
    history.push(trimmed); histIdx = history.length;
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    if (COMMANDS[cmd]) COMMANDS[cmd](args);
    else lineHTML(`<span class="err">command not found: ${cmd}</span> <span class="dim">— try </span><span style="color:var(--p3)">help</span>`, 'err');
  }

  // ---------- Input wiring ----------
  inputRow.style.opacity = '0.4';
  input.addEventListener('keydown', (e) => {
    if (typing) { e.preventDefault(); return; }
    if (e.key === 'Enter') {
      const v = input.value;
      input.value = '';
      runCmd(v);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      histIdx = Math.max(0, histIdx - 1);
      input.value = history[histIdx] || '';
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (history.length === 0) return;
      histIdx = Math.min(history.length, histIdx + 1);
      input.value = history[histIdx] || '';
    } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      term.innerHTML = '';
    }
  });

  // start intro after a tiny delay
  setTimeout(runIntro, 220);

  // expose for tweaks/external buttons
  window.__term = { runCmd, COMMANDS, TRACKS, getCurrent: () => currentTrack };
})();
