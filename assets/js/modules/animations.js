/* ============================================================
   ANIMATIONS.JS — Scroll reveal, Cursor, Parallax, Counters
   ============================================================ */

/* ── Scroll Reveal ───────────────────────────────────────────── */
export function initReveal() {
  const targets = document.querySelectorAll(
    '.reveal, .reveal-left, .reveal-right'
  );

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  targets.forEach(el => observer.observe(el));

  /* Animated lines */
  const lines = document.querySelectorAll('.animated-line');
  const lineObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        lineObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  lines.forEach(l => lineObs.observe(l));
}

/* ── Custom Cursor ───────────────────────────────────────────── */
export function initCursor() {
  /* Ne pas initialiser sur mobile / touch */
  if (window.matchMedia('(max-width: 768px)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const cursor = document.querySelector('.cursor');
  const ring   = document.querySelector('.cursor-ring');
  if (!cursor || !ring) return;

  let mouseX = 0, mouseY = 0;
  let ringX  = 0, ringY  = 0;
  let raf;

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top  = mouseY + 'px';
  });

  /* Ring suit le cursor avec un léger lag */
  function animateRing() {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    ring.style.left = ringX + 'px';
    ring.style.top  = ringY + 'px';
    raf = requestAnimationFrame(animateRing);
  }
  raf = requestAnimationFrame(animateRing);

  /* Hover state sur éléments interactifs */
  const hoverables = document.querySelectorAll(
    'a, button, .gallery-track figure, .avis-card, .reco-tab, .equip-item, .acc-toggle'
  );

  hoverables.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('hover');
      ring.classList.add('hover');
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('hover');
      ring.classList.remove('hover');
    });
  });

  /* Cacher quand la souris quitte la fenêtre */
  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
    ring.style.opacity   = '0';
  });
  document.addEventListener('mouseenter', () => {
    cursor.style.opacity = '1';
    ring.style.opacity   = '1';
  });
}

/* ── Parallax hero ───────────────────────────────────────────── */
export function initParallax() {
  const heroImg = document.querySelector('.hero-img');
  if (!heroImg) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      const speed = 0.3;
      heroImg.style.transform = `translateY(${scrollY * speed}px) scale(1.08)`;
      ticking = false;
    });
  }, { passive: true });
}

/* ── Counter animation ───────────────────────────────────────── */
export function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el      = entry.target;
      const target  = parseFloat(el.dataset.count);
      const suffix  = el.dataset.suffix || '';
      const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
      const duration = 1600;
      const start    = performance.now();

      function step(timestamp) {
        const progress = Math.min((timestamp - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); /* easeOutCubic */
        const value = target * ease;
        el.innerHTML = value.toFixed(decimals) + `<span class="stat-suffix">${suffix}</span>`;
        if (progress < 1) requestAnimationFrame(step);
        else el.innerHTML = target.toFixed(decimals) + `<span class="stat-suffix">${suffix}</span>`;
      }

      requestAnimationFrame(step);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}
