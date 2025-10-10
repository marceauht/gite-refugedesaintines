// --- FONCTION INIT MAP (globale pour Google Maps) ---
function initMap() {
  const mapElement = document.querySelector('.map');
  if (!mapElement) return;

  const location = { lat: 49.30531365926556, lng: 2.7737150817081977 };

  const map = new google.maps.Map(mapElement, {
    center: location,
    zoom: 8,
  });

  const marker = new google.maps.Marker({
    position: location,
    map: map,
  });

new google.maps.Circle({
  map: map,
  center: location,
  radius: 1000,
  fillColor: '#90beab',
  fillOpacity: 0.2,
  strokeColor: '#90beab',
  strokeOpacity: 0.6,
  strokeWeight: 2,
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

// Form
document.addEventListener("DOMContentLoaded", () => {
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

