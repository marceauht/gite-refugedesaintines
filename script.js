// --- FONCTION INIT MAP (globale pour Google Maps) ---
function initMap() {
  const mapElement = document.querySelector('.map');
  if (!mapElement) return;

  const location = { lat: 48.8566, lng: 2.3522 }; // exemple : Paris
  const map = new google.maps.Map(mapElement, {
    center: location,
    zoom: 12,
  });

  const marker = new google.maps.Marker({
    position: location,
    map: map,
  });
}

// --- SCRIPT PRINCIPAL ---
document.addEventListener("DOMContentLoaded", () => {
  // Nav toggle
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    navToggle.classList.toggle('active');
    nav.classList.toggle('open');
  });
}


  // Expandable cards
  document.querySelectorAll(".expandable-card").forEach(card => {
    card.querySelector(".expandable-title").addEventListener("click", () => {
      card.classList.toggle("expanded");
    });
  });

  // Popups
  document.querySelectorAll("[data-popup-target]").forEach(btn => {
    const targetId = btn.getAttribute("data-popup-target");
    const popup = document.getElementById(targetId);
    if (!popup) return;

    btn.addEventListener("click", e => {
      e.preventDefault();
      popup.style.display = "flex";
    });

    const closeBtn = popup.querySelector(".popup-close");
    closeBtn?.addEventListener("click", () => popup.style.display = "none");

    popup.addEventListener("click", e => {
      if (e.target === popup) popup.style.display = "none";
    });
  });

  // Accordion
  document.querySelectorAll(".acc-item").forEach(item => {
    const panel = item.querySelector(".acc-panel");
    item.querySelector(".acc-toggle").addEventListener("click", () => {
      const expanded = item.classList.toggle("expanded");
      panel.style.maxHeight = expanded ? panel.scrollHeight + "px" : "0";
      panel.style.opacity = expanded ? "1" : "0";
    });
  });

  // Galleries scroll
  function setupGalleryScroll(gallerySelector, btnLeftSelector, btnRightSelector) {
    const gallery = document.querySelector(gallerySelector);
    const btnLeft = document.querySelector(btnLeftSelector);
    const btnRight = document.querySelector(btnRightSelector);
    if (!gallery || !btnLeft || !btnRight) return;

    const items = gallery.querySelectorAll('img, .avis-card');
    if (!items.length) return;
    const gap = parseInt(getComputedStyle(gallery).gap) || 20;
    const scrollAmount = () => items[0].offsetWidth + gap;

    btnRight.addEventListener('click', () => {
      gallery.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
    });
    btnLeft.addEventListener('click', () => {
      gallery.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
    });
  }

  setupGalleryScroll('.gallery-images', '.scroll-left-images', '.scroll-right-images');
  setupGalleryScroll('.gallery-avis', '.scroll-left-avis', '.scroll-right-avis');
});