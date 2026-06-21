(function () {

  // ---------- Loading screen ----------
  const loader = document.getElementById('loader');
  const heroDark = document.querySelector('.hero-dark');

  function triggerHero() {
    if (heroDark) heroDark.classList.add('hero-loaded');
    startStatCounters();
  }

  if (loader) {
    // Hold for 1.4s then exit
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
      const duration = 700;
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

  // ---------- Scroll reveal ----------
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.07, rootMargin: '0px 0px -24px 0px' });

  function observeRevealTargets() {
    const targets = document.querySelectorAll(
      '.section-head, .exp-card, .card, .tile, .star-item, .metric, .np-widget, .hero-widget-row > div'
    );
    targets.forEach((el, i) => {
      if (el.classList.contains('reveal')) return;
      el.classList.add('reveal');
      el.style.transitionDelay = (i % 5) * 55 + 'ms';
      revealObserver.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeRevealTargets);
  } else {
    observeRevealTargets();
  }

  // Re-observe after page navigation
  window.addEventListener('navigate', () => setTimeout(observeRevealTargets, 80));

})();
