/* ============================================================
   GALLERY.JS — Galerie drag-to-scroll + Lightbox + Loop
   ============================================================ */

export function initGallery() {
  initDragScroll();
  initGalleryNavLoop();
  initOpacityFade();
  initProgressBar();
  initLightbox();
}

/* ── Drag to scroll ── */
function initDragScroll() {
  const track = document.getElementById('gallery-track');
  if (!track) return;

  let isDragging = false, startX, scrollLeft, velocity = 0, lastX = 0, momentumId;

  track.addEventListener('mousedown', e => {
    isDragging = true;
    track.classList.add('is-grabbing');
    startX = e.pageX - track.offsetLeft;
    scrollLeft = track.scrollLeft;
    lastX = e.pageX;
    cancelAnimationFrame(momentumId);
    velocity = 0;
  });

  track.addEventListener('mousemove', e => {
    if (!isDragging) return;
    e.preventDefault();
    velocity = e.pageX - lastX;
    lastX = e.pageX;
    track.scrollLeft = scrollLeft - (e.pageX - track.offsetLeft - startX) * 1.4;
  });

  const stop = () => {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove('is-grabbing');
    function momentum() {
      if (Math.abs(velocity) < 1) return;
      track.scrollLeft -= velocity;
      velocity *= 0.93;
      momentumId = requestAnimationFrame(momentum);
    }
    momentum();
  };

  track.addEventListener('mouseup', stop);
  track.addEventListener('mouseleave', stop);

  /* Touch */
  let touchStartX, touchScrollLeft;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].pageX; touchScrollLeft = track.scrollLeft; }, { passive: true });
  track.addEventListener('touchmove', e => { track.scrollLeft = touchScrollLeft + (touchStartX - e.touches[0].pageX); }, { passive: true });
}

/* ── Navigation avec boucle infinie ── */
function initGalleryNavLoop() {
  const track = document.getElementById('gallery-track');
  const btnL  = document.getElementById('gallery-left');
  const btnR  = document.getElementById('gallery-right');
  if (!track || !btnL || !btnR) return;

  const figures = track.querySelectorAll('figure');
  const n = figures.length;
  let currentVisibleIdx = 0;

  function getScrollStep() {
    const fig = figures[0];
    return fig ? fig.offsetWidth + 14 : 334; /* 14 = gap */
  }

  function scrollToIdx(idx, behavior = 'smooth') {
    currentVisibleIdx = ((idx % n) + n) % n;
    const step = getScrollStep();
    /* Wrap: if past end, jump to start instantly then scroll forward */
    if (currentVisibleIdx === 0 && idx > 0) {
      track.style.scrollBehavior = 'auto';
      track.scrollLeft = 0;
      track.style.scrollBehavior = '';
    }
    track.scrollTo({ left: currentVisibleIdx * step, behavior });
    updateOpacity();
    updateProgress();
  }

  btnR.addEventListener('click', () => {
    const step = getScrollStep();
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (track.scrollLeft >= maxScroll - 10) {
      /* Au bout → retour au début */
      track.style.scrollBehavior = 'auto';
      track.scrollLeft = 0;
      track.style.scrollBehavior = '';
      currentVisibleIdx = 0;
    } else {
      track.scrollBy({ left: step, behavior: 'smooth' });
      currentVisibleIdx = Math.min(n - 1, currentVisibleIdx + 1);
    }
    setTimeout(() => { updateOpacity(); updateProgress(); }, 50);
  });

  btnL.addEventListener('click', () => {
    const step = getScrollStep();
    if (track.scrollLeft <= 10) {
      /* Au début → aller à la fin */
      track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' });
      currentVisibleIdx = n - 1;
    } else {
      track.scrollBy({ left: -step, behavior: 'smooth' });
      currentVisibleIdx = Math.max(0, currentVisibleIdx - 1);
    }
    setTimeout(() => { updateOpacity(); updateProgress(); }, 50);
  });

  track.addEventListener('scroll', () => {
    updateOpacity();
    updateProgress();
  }, { passive: true });
}

/* ── Opacité selon distance au centre ── */
function initOpacityFade() {
  updateOpacity();
  window.addEventListener('resize', updateOpacity, { passive: true });
}

function updateOpacity() {
  const track = document.getElementById('gallery-track');
  if (!track) return;

  const figures = track.querySelectorAll('figure');
  const trackRect = track.getBoundingClientRect();
  const trackCenter = trackRect.left + trackRect.width / 2;

  figures.forEach(fig => {
    const figRect = fig.getBoundingClientRect();
    const figCenter = figRect.left + figRect.width / 2;
    const dist = Math.abs(figCenter - trackCenter);
    const rel = dist / (trackRect.width / 2);

    fig.classList.remove('edge-far', 'edge-near', 'edge-mid', 'edge-center');
    if (rel < 0.25)       fig.classList.add('edge-center');
    else if (rel < 0.5)   fig.classList.add('edge-mid');
    else if (rel < 0.75)  fig.classList.add('edge-near');
    else                   fig.classList.add('edge-far');
  });
}

/* ── Barre de progression ── */
function initProgressBar() {
  const track = document.getElementById('gallery-track');
  const fill  = document.querySelector('.gallery-progress-fill');
  const label = document.querySelector('.gallery-progress-label');
  if (!track || !fill) return;

  function update() {
    const pct = track.scrollLeft / (track.scrollWidth - track.clientWidth) || 0;
    fill.style.width = (pct * 100) + '%';
    if (label) {
      const figures = track.querySelectorAll('figure');
      const idx = Math.round(pct * (figures.length - 1)) + 1;
      label.textContent = `${idx} / ${figures.length}`;
    }
  }

  track.addEventListener('scroll', update, { passive: true });
  update();
}

function updateProgress() {
  const track = document.getElementById('gallery-track');
  const fill  = document.querySelector('.gallery-progress-fill');
  const label = document.querySelector('.gallery-progress-label');
  if (!track || !fill) return;
  const pct = track.scrollLeft / (track.scrollWidth - track.clientWidth) || 0;
  fill.style.width = (pct * 100) + '%';
  if (label) {
    const figures = track.querySelectorAll('figure');
    const idx = Math.round(pct * (figures.length - 1)) + 1;
    label.textContent = `${idx} / ${figures.length}`;
  }
}

/* ── Lightbox ── */
function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  const lbImg     = lightbox.querySelector('.lightbox-img');
  const lbClose   = lightbox.querySelector('.lightbox-close');
  const lbPrev    = lightbox.querySelector('.lightbox-prev');
  const lbNext    = lightbox.querySelector('.lightbox-next');
  const lbCaption = lightbox.querySelector('.lightbox-caption');
  const lbCounter = lightbox.querySelector('.lightbox-counter');

  const figures = Array.from(document.querySelectorAll('#gallery-track figure'));
  const n = figures.length;
  let currentIdx = 0;

  figures.forEach((fig, idx) => {
    fig.addEventListener('click', () => {
      currentIdx = idx;
      showImage(idx);
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  function showImage(idx) {
    const fig = figures[idx];
    const img = fig.querySelector('img');
    const cap = fig.querySelector('figcaption');
    lbImg.style.opacity = '0';
    lbImg.style.transform = 'scale(.94)';
    setTimeout(() => {
      lbImg.src = img.src;
      lbImg.alt = img.alt;
      if (lbCaption) lbCaption.textContent = cap ? cap.textContent : img.alt;
      if (lbCounter) lbCounter.textContent = `${idx + 1} / ${n}`;
    }, 150);
    lbImg.onload = () => { lbImg.style.opacity = '1'; lbImg.style.transform = 'scale(1)'; };
  }

  function closeLightbox() { lightbox.classList.remove('open'); document.body.style.overflow = ''; }

  lbClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  lbPrev.addEventListener('click', () => { currentIdx = (currentIdx - 1 + n) % n; showImage(currentIdx); });
  lbNext.addEventListener('click', () => { currentIdx = (currentIdx + 1) % n; showImage(currentIdx); });

  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft')  { currentIdx = (currentIdx - 1 + n) % n; showImage(currentIdx); }
    if (e.key === 'ArrowRight') { currentIdx = (currentIdx + 1) % n; showImage(currentIdx); }
  });

  let tX = 0;
  lightbox.addEventListener('touchstart', e => { tX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', e => {
    const diff = tX - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 50) return;
    if (diff > 0) { currentIdx = (currentIdx + 1) % n; showImage(currentIdx); }
    else          { currentIdx = (currentIdx - 1 + n) % n; showImage(currentIdx); }
  });
}

/* ── Drag pour le carousel avis ── */
export function initAvisDrag() { /* replaced by wheel — no-op */ }
