/* ============================================================
   NAVIGATION.JS — Header, nav mobile, active links
   ============================================================ */

export function initNavigation() {
  const header       = document.querySelector('.site-header');
  const toggle       = document.getElementById('nav-toggle');
  const overlay      = document.getElementById('nav-overlay');
  const overlayLinks = overlay ? overlay.querySelectorAll('a') : [];

  /* ── Scroll → classe scrolled sur le header ─────────────── */
  const onScroll = () => {
    if (window.scrollY > 60) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Menu mobile toggle ──────────────────────────────────── */
  if (toggle && overlay) {
    toggle.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = overlay.classList.toggle('open');
      toggle.classList.toggle('open', isOpen);
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    overlayLinks.forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    /* Fermer au clic en dehors du menu */
    document.addEventListener('click', e => {
      if (
        overlay.classList.contains('open') &&
        !overlay.contains(e.target) &&
        !toggle.contains(e.target)
      ) {
        closeMenu();
      }
    });

    /* Fermer sur Escape */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  function closeMenu() {
    overlay.classList.remove('open');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  /* ── Active link au scroll ────────────────────────────────── */
  const sections = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('.nav a[href^="#"]');

  const activeObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.toggle(
            'active',
            link.getAttribute('href') === '#' + entry.target.id
          );
        });
      }
    });
  }, { threshold: 0.4, rootMargin: '-10% 0px -50% 0px' });

  sections.forEach(s => activeObserver.observe(s));

  /* ── Sticky CTA mobile ────────────────────────────────────── */
  injectStickyCtaMobile();
}

function injectStickyCtaMobile() {
  if (window.innerWidth > 768) return;

  const cta = document.createElement('a');
  cta.href = '#contact';
  cta.className = 'mobile-cta-sticky';
  cta.textContent = 'Réserver →';
  cta.setAttribute('aria-label', 'Réserver — aller au formulaire de réservation');
  document.body.appendChild(cta);

  const contactSection = document.getElementById('contact');
  if (!contactSection) return;

  /* Masquer le bouton quand la section Réservation est visible */
  const observer = new IntersectionObserver(([entry]) => {
    cta.classList.toggle('hidden', entry.isIntersecting);
  }, { threshold: 0.15 });
  observer.observe(contactSection);
}
