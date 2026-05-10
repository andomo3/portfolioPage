/* Markov chain / random walk background.
   Particles take probabilistic steps; trails fade over time. */
(function () {
  const cvs = document.getElementById('markov-canvas');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  let W = 0, H = 0, dpr = window.devicePixelRatio || 1;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    cvs.width = W * dpr;
    cvs.height = H * dpr;
    cvs.style.width = W + 'px';
    cvs.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const NODES = 14;
  const nodes = [];
  const cols = 5, rows = 4;
  function placeNodes() {
    nodes.length = 0;
    for (let i = 0; i < NODES; i++) {
      nodes.push({
        x: 80 + Math.random() * (W - 160),
        y: 60 + Math.random() * (H - 120),
        r: 2 + Math.random() * 2,
      });
    }
  }
  placeNodes();
  window.addEventListener('resize', placeNodes);

  // Build sparse transition graph: each node connects to 2-3 nearest neighbors
  function buildGraph() {
    nodes.forEach((n, i) => {
      const distances = nodes
        .map((m, j) => ({ j, d: Math.hypot(m.x - n.x, m.y - n.y) }))
        .filter(o => o.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 3);
      n.next = distances.map(o => o.j);
    });
  }
  buildGraph();
  window.addEventListener('resize', buildGraph);

  const PARTICLES = 7;
  const particles = [];
  for (let i = 0; i < PARTICLES; i++) {
    const start = Math.floor(Math.random() * NODES);
    const next = nodes[start].next[Math.floor(Math.random() * nodes[start].next.length)];
    particles.push({
      from: start,
      to: next,
      t: 0,
      speed: 0.0035 + Math.random() * 0.003,
      hue: 200 + Math.random() * 95, // 200 cyan -> 295 purple
    });
  }

  let scrollY = window.scrollY;
  window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

  function tick() {
    // Fade prior frame
    ctx.fillStyle = 'rgba(10, 10, 18, 0.08)';
    ctx.fillRect(0, 0, W, H);

    // Draw graph edges faintly
    ctx.lineWidth = 1;
    nodes.forEach((n, i) => {
      n.next.forEach(j => {
        const m = nodes[j];
        ctx.strokeStyle = 'rgba(120, 120, 180, 0.06)';
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();
      });
    });

    // Move particles
    const scrollFactor = 1 + Math.min(0.8, scrollY / 4000);
    particles.forEach(p => {
      p.t += p.speed * scrollFactor;
      if (p.t >= 1) {
        p.t = 0;
        p.from = p.to;
        const opts = nodes[p.from].next;
        // Markov: equal-prob choice among neighbors
        p.to = opts[Math.floor(Math.random() * opts.length)];
      }
      const a = nodes[p.from], b = nodes[p.to];
      const x = a.x + (b.x - a.x) * p.t;
      const y = a.y + (b.y - a.y) * p.t;
      // Draw trail (a soft glow)
      const grad = ctx.createRadialGradient(x, y, 0, x, y, 60);
      grad.addColorStop(0, `oklch(0.78 0.16 ${p.hue} / 0.55)`);
      grad.addColorStop(1, `oklch(0.78 0.16 ${p.hue} / 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 60, 0, Math.PI * 2);
      ctx.fill();

      // Bright core
      ctx.fillStyle = `oklch(0.85 0.18 ${p.hue})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw nodes
    nodes.forEach(n => {
      ctx.fillStyle = 'rgba(180, 180, 220, 0.25)';
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(tick);
  }
  tick();
})();
