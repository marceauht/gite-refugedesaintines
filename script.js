function initMap() {
  const mapElement = document.querySelector('.map');
  if (!mapElement) return;

  const location = { lat: 49.30531365926556, lng: 2.7737150817081977 };

  const map = new google.maps.Map(mapElement, {
    center: location,
    zoom: 15,
  });

  // Cercle 1 km
  const circle = new google.maps.Circle({
    map: map,
    center: location,
    radius: 1000, 
    fillColor: '#90beab',
    fillOpacity: 0.2,
    strokeColor: '#90beab',
    strokeOpacity: 0.6,
    strokeWeight: 2,
  });

  // Adapter la vue pour que le cercle soit bien visible
  map.fitBounds(circle.getBounds());
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
  // --- Fermeture auto du menu hamburger ---
const navLinks = document.querySelectorAll('.nav a');

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    if (nav.classList.contains('open')) {
      nav.classList.remove('open');
      navToggle.classList.remove('active');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });
});



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

  // Gallery
function setupGalleryScroll(gallerySelector, btnLeftSelector, btnRightSelector, imagesPerScrollDesktop = 2, mode = "fixed") {
  const gallery = document.querySelector(gallerySelector);
  const btnLeft = document.querySelector(btnLeftSelector);
  const btnRight = document.querySelector(btnRightSelector);
  if (!gallery || !btnLeft || !btnRight) return;

  const gap = parseInt(getComputedStyle(gallery).gap) || 20;

  const getScrollAmount = () => {
    if (mode === "dynamic") {
      return gallery.clientWidth; // scroll par largeur visible
    } else {
      const items = gallery.querySelectorAll('img, .avis-card');
      if (!items.length) return 0;
      if (window.innerWidth <= 768) return items[0].offsetWidth + gap;
      let width = 0;
      for (let i = 0; i < imagesPerScrollDesktop; i++) {
        if (items[i]) width += items[i].offsetWidth + gap;
      }
      return width;
    }
  };

  btnRight.addEventListener('click', () => {
    gallery.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
  });

  btnLeft.addEventListener('click', () => {
    gallery.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
  });
}

// Images → scroll fixe
setupGalleryScroll('.gallery-images', '.scroll-left-images', '.scroll-right-images', 2, "fixed");

// Avis → scroll dynamique
setupGalleryScroll('.gallery-avis', '.scroll-left-avis', '.scroll-right-avis', 1, "dynamic");
});

// Form
document.getElementById("contact-form").addEventListener("submit", function(e) {
        e.preventDefault();
        const statusEl = document.querySelector(".form-status");
        const data = {
          nom: this.nom.value,
          email: this.email.value,
          message: this.message.value
        };

        statusEl.innerHTML = `
          <span class="loader">
            <span class="letter">📧</span>
            Envoi en cours...
          </span>
        `;

        fetch("https://script.google.com/macros/s/AKfycbyu2oCCpHnS6onwr7MEMB6aR8KVdl2vRIObVkivFaugpdQbQCJJeuBeLxFZnSqZP39JAw/exec", {
          method: "POST",
          body: JSON.stringify(data)
        })
        .then(r => r.json())
        .then(() => {
          statusEl.innerText = "Message envoyé avec succès ✅";
          statusEl.style.color = "#90beab";
          this.reset();
        })
        .catch(() => {
          statusEl.innerText = "Erreur lors de l'envoi ❌. Réessayez.";
          statusEl.style.color = "#F44336";
        });
      });