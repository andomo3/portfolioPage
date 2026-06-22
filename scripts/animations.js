(function () {

  // ---------- Loading screen ----------
  const loader = document.getElementById('loader');
  const heroDark = document.querySelector('.hero-dark');

  function triggerHero() {
    if (heroDark) heroDark.classList.add('hero-loaded');
    startStatCounters();
    setTimeout(startEyebrowCycle, 500);
    setTimeout(typeTagline, 250);
  }

  if (loader) {
    setTimeout(() => {
      loader.classList.add('exit');
      setTimeout(() => {
        loader.remove();
        triggerHero();
      }, 450);
    }, 1400);
  } else {
    requestAnimationFrame(triggerHero);
  }

  // ---------- Stat counters ----------
  function startStatCounters() {
    document.querySelectorAll('.hero-stat-n').forEach(el => {
      const raw = el.textContent.trim();
      const num = parseInt(raw.replace(/\D/g, ''), 10);
      if (isNaN(num)) return;
      const suffix = raw.replace(/[\d]/g, '');
      const duration = 1200;
      const start = performance.now();
      function tick(now) {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(ease * num) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  // ---------- Typewriter core ----------
  function typewriter(el, text, speed, onDone) {
    // Reserve the element's current height so clearing text doesn't collapse layout
    const h = el.offsetHeight;
    if (h > 0) el.style.minHeight = h + 'px';

    el.textContent = '';
    const cursor = document.createElement('span');
    cursor.className = 'tw-cursor';
    el.appendChild(cursor);
    let i = 0;
    function tick() {
      if (i < text.length) {
        cursor.insertAdjacentText('beforebegin', text[i]);
        i++;
        setTimeout(tick, speed + Math.random() * 18);
      } else {
        el.style.minHeight = '';
        if (onDone) onDone(cursor);
      }
    }
    tick();
  }

  // ---------- Cycling eyebrow ----------
  const EYEBROW_PHRASES = [
    'MLE · Data Engineering',
    "Georgia Tech ISyE · OR '27",
    'Atlanta · CPT / F-1',
    'Building PerChance',
  ];

  function startEyebrowCycle() {
    const el = document.querySelector('.hero-eyebrow');
    if (!el) return;
    let phraseIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let waiting = false;

    function tick() {
      if (waiting) return;
      const phrase = EYEBROW_PHRASES[phraseIdx];

      if (!deleting) {
        charIdx++;
        el.textContent = phrase.slice(0, charIdx);
        if (charIdx === phrase.length) {
          waiting = true;
          setTimeout(() => { waiting = false; deleting = true; tick(); }, 2400);
          return;
        }
        setTimeout(tick, 48 + Math.random() * 22);
      } else {
        charIdx--;
        el.textContent = phrase.slice(0, charIdx);
        if (charIdx === 0) {
          deleting = false;
          phraseIdx = (phraseIdx + 1) % EYEBROW_PHRASES.length;
        }
        setTimeout(tick, 20);
      }
    }

    el.textContent = '';
    tick();
  }

  // ---------- Hero tagline typewriter ----------
  function typeTagline() {
    const el = document.querySelector('.hero-tagline');
    if (!el) return;
    const text = el.textContent.trim();
    typewriter(el, text, 14, (cursor) => {
      setTimeout(() => cursor.classList.add('tw-cursor-done'), 1200);
    });
  }

  // ---------- Scroll reveal ----------
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.07, rootMargin: '0px 0px -24px 0px' });

  // Section sub typewriter on scroll
  const subObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      subObserver.unobserve(el);
      const text = el.dataset.twText;
      if (!text) return;
      typewriter(el, text, 26, (cursor) => {
        setTimeout(() => cursor.classList.add('tw-cursor-done'), 700);
      });
    });
  }, { threshold: 0.8 });

  function observeRevealTargets() {
    document.querySelectorAll(
      '.section-head, .exp-card, .card, .tile, .star-item, .metric, .np-widget, .hero-widget-row > div'
    ).forEach((el, i) => {
      if (el.classList.contains('reveal')) return;
      el.classList.add('reveal');
      el.style.transitionDelay = (i % 5) * 55 + 'ms';
      revealObserver.observe(el);
    });

    document.querySelectorAll('.section-head .sub').forEach(el => {
      if (el.dataset.twText) return;
      el.dataset.twText = el.textContent.trim();
      el.textContent = '';
      subObserver.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { observeRevealTargets(); initParallax(); });
  } else {
    observeRevealTargets();
    initParallax();
  }

  window.addEventListener('navigate', () => setTimeout(observeRevealTargets, 80));

  // ---------- Parallax ----------
  function initParallax() {
    // removed
  }

})();
