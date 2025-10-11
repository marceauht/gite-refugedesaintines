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

// Form
  const form = document.getElementById("contact-form");

  // Crée le paragraphe pour afficher le message
  let status = form.querySelector(".form-status");
  if (!status) {
    status = document.createElement("p");
    status.className = "form-status";
    form.appendChild(status);
  }

  form.addEventListener("submit", e => {
    e.preventDefault();

    const formData = new FormData(form);

    // Ajoute le champ caché 'form-name' nécessaire à Netlify
    if (!formData.has("form-name")) {
      formData.append("form-name", form.getAttribute("name"));
    }

    // Transforme les données pour fetch
    const encode = data => {
      return [...data.entries()].map(([k,v]) => encodeURIComponent(k)+"="+encodeURIComponent(v)).join("&");
    }

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encode(formData)
    })
    .then(() => {
      status.style.color = "green";
      status.textContent = "Votre message a bien été envoyé !";
      form.reset();
    })
    .catch(() => {
      status.style.color = "red";
      status.textContent = "Une erreur est survenue, veuillez réessayer plus tard.";
    });
  });
});