/* ============================================================
   ACCORDION.JS — Équipements, Reco, Wheel carousel, Form
   ============================================================ */

/* ── Expand équipements ── */
export function initEquipExpand() {
  const btn   = document.getElementById('equip-btn');
  const panel = document.getElementById('equip-panel');
  if (!btn || !panel) return;

  btn.addEventListener('click', () => {
    const grid = document.querySelector('.equip-grid');
    if (grid) grid.classList.toggle('expanded');
    const isOpen = panel.classList.toggle('open');
    panel.style.maxHeight = isOpen ? panel.scrollHeight + 'px' : null;
    btn.textContent = isOpen ? '↑ Masquer les équipements' : '↓ Voir tous les équipements';
    if (isOpen) setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 300);
  });
}

/* ── Reco panels ── */
export function initReco() {
  const tabs   = document.querySelectorAll('.reco-tab[data-panel]');
  const panels = document.querySelectorAll('.reco-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.panel;
      const panel    = document.getElementById(targetId);
      const isActive = tab.classList.contains('active');

      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => { p.classList.remove('open'); p.style.maxHeight = null; });

      if (!isActive && panel) {
        tab.classList.add('active');
        panel.classList.add('open');
        panel.style.maxHeight = panel.scrollHeight + 'px';
        setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
      }
    });
  });

  /* Ouverture automatique d'un onglet via l'URL (ex. ?reco=pratique#reco) */
  function openFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('reco');
    if (!target) return;
    const tab = document.querySelector(`.reco-tab[data-panel="panel-${target}"]`);
    if (tab) {
      tab.click();
      setTimeout(() => {
        document.getElementById('reco')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }
  openFromUrl();
}

/* ============================================================
   WHEEL OF FORTUNE — Carousel d'avis en arc
   ============================================================ */

const AVIS_DATA = [
  { txt: "Ma femme et moi avons eu un séjour très agréable, très paisible. Le calme était omniprésent. Marceau a été très rassurant et réactif selon nos besoins.", author: "Williams A.", date: "Avril 2026", plat: "AirBnB" },
  { txt: "Parfait après une journée intense au Parc Astérix. J'ai apprécié l'endroit, au calme. Les instructions sont claires.", author: "Julie", date: "Avril 2026", plat: "AirBnB" },
  { txt: "Hôte super sympa, accueillant et disponible. La terrasse éclairée était un atout majeur pour terminer la soirée en beauté.", author: "Marius", date: "Mars 2026", plat: "AirBnB" },
  { txt: "Marceau est très accueillant, le logement est très beau et bien équipé et surtout très propre et confortable.", author: "Geoffrey", date: "Mars 2026", plat: "AirBnB" },
  { txt: "Nous avons passé un excellent week-end chez Marceau. Tout était impeccable. Marceau a été très réactif et arrangeant. Encore merci !", author: "Léa", date: "Février 2026", plat: "AirBnB" },
  { txt: "Nous vous recommandons vivement de séjourner chez Marceau. Un petit havre de paix vous y attend !!", author: "Isabelle", date: "Janvier 2026", plat: "AirBnB" },
  { txt: "L'endroit a été conçu avec goût. Après une bonne nuit de sommeil, nous sommes repartis avec de bons souvenirs en poche.", author: "Robert", date: "Décembre 2025", plat: "AirBnB" },
  { txt: "Séjour excellent, hôte très accueillant. Logement très cosy et chaleureux. Literie au top. Endroit calme, parfait. Je recommande +++", author: "Marie-Laure", date: "Décembre 2025", plat: "AirBnB" },
  { txt: "Hôte très réactif. Logement conforme à la description, endroit calme avec tout ce qu'il faut même plus !", author: "Isabelle B.", date: "Novembre 2025", plat: "AirBnB" },
  { txt: "Notre hôte est très agréable. Les explications pour l'accès sont précises et claires. Le studio est confortable et super bien équipé.", author: "Chantal", date: "Septembre 2025", plat: "Booking" },
  { txt: "Le logement est juste parfait, très soigné avec des petites attentions qui font plaisir. Je recommande à 100 % et je n'hésiterai pas à reprendre.", author: "Aurélie", date: "Octobre 2025", plat: "AirBnB" },
  { txt: "Logement propre, confortable et très bien situé. Le jardin est un vrai plus ! La communication avec Marceau a été claire et efficace.", author: "Ken", date: "Juillet 2025", plat: "AirBnB" },
  { txt: "Propriétaire très attentionné. Logement propre et agréable. Je recommande vivement !", author: "Nathalie", date: "Juillet 2025", plat: "Booking" },
  { txt: "Nous avons passé 3 belles nuits. Marceau est un hôte très accommodant. La climatisation a parfaitement fonctionné. Je ne peux que recommander !", author: "Bent", date: "Août 2025", plat: "AirBnB" },
  { txt: "Fidèle à la description, appartement très propre et décoré avec goût. Je recommande sans hésitation.", author: "Loic", date: "Août 2025", plat: "AirBnB" },
  { txt: "Le studio de Marceau est fonctionnel, bien équipé et joliment décoré. Marceau s'est montré très disponible et bienveillant 🙂", author: "Cédric", date: "Août 2025", plat: "AirBnB" },
  { txt: "Appartement soigné avec toutes les commodités. Propre et frais !", author: "Regina", date: "Juillet 2025", plat: "Booking" },
];

/* Wheel geometry constants */
const WHEEL_RADIUS    = 750;   /* juste milieu : pas de chevauchement, arc visible */
const WHEEL_ANGLE_STEP = 26;   /* 26° → gap 29px entre cartes de 300px avec R=750 */
const WHEEL_CARD_W    = 300;   /* px */
const WHEEL_CARD_H    = 195;   /* px */

let wheelIdx       = 0;
let wheelArrowDeg  = 0;
let wheelAnimating = false;
let wheelCards     = [];

function buildCardHtml(d) {
  return `
    <div class="avis-stars">★★★★★</div>
    <p class="avis-text">${d.txt}</p>
    <div class="avis-footer">
      <div>
        <div class="avis-author">${d.author}</div>
        <div class="avis-date">${d.date}</div>
      </div>
      <div class="avis-platform">${d.plat}</div>
    </div>`;
}

export function initWheel() {
  const outer   = document.querySelector('.wheel-outer');
  const track   = document.getElementById('wheel-track');
  const btn     = document.getElementById('wheel-btn');
  const counter = document.getElementById('wheel-counter');
  const arrow   = document.getElementById('wheel-arrow');
  if (!outer || !track || !btn || !counter) return;

  const n = AVIS_DATA.length;

  /* Créer toutes les cartes */
  AVIS_DATA.forEach((d, i) => {
    const div = document.createElement('div');
    div.className = 'wheel-card';
    div.innerHTML = buildCardHtml(d);
    track.appendChild(div);
    wheelCards.push(div);
  });

  /* Géométrie : centre de la roue SOUS le conteneur */
  function getCenter() {
    const cw = outer.offsetWidth;
    const ch = outer.offsetHeight;
    const cx = cw / 2;
    /* On veut la carte active (angle=0) en haut du conteneur + marge */
    /* cy - RADIUS = topOffset → cy = RADIUS + topOffset */
    const topOffset = 110; /* top de la carte active = 12px du bord du container */
    const cy = WHEEL_RADIUS + topOffset;
    return { cx, cy };
  }

  function positionCards(animated) {
    const { cx, cy } = getCenter();

    wheelCards.forEach((card, i) => {
      /* relIdx : position relative par rapport à la carte active */
      let relIdx = ((i - wheelIdx) % n + n) % n;
      if (relIdx > n / 2) relIdx -= n; /* normaliser à [-n/2, n/2] */

      const angleDeg = relIdx * WHEEL_ANGLE_STEP;
      const angleRad = angleDeg * Math.PI / 180;

      /* Position sur le cercle */
      const cardCx = cx + WHEEL_RADIUS * Math.sin(angleRad);
      const cardCy = cy - WHEEL_RADIUS * Math.cos(angleRad);

      const tx = cardCx - WHEEL_CARD_W / 2;
      const ty = cardCy - WHEEL_CARD_H / 2;

      /* Scale et opacité basés sur l'angle */
      const cosA   = Math.cos(angleRad);
      const scale  = Math.max(0.55, cosA);
      const opacity = Math.max(0, (cosA - 0.3) / 0.7);

      /* Z-index : carte centrale au premier plan */
      const zi = Math.round(scale * 20);

      if (animated) {
        card.style.transition = 'transform .65s cubic-bezier(.16,1,.3,1), opacity .65s ease';
      } else {
        card.style.transition = 'none';
      }

      card.style.transform  = `translate(${tx}px, ${ty}px) scale(${scale})`;
      card.style.opacity    = opacity;
      card.style.zIndex     = zi;
      card.classList.toggle('active', relIdx === 0);
    });

    counter.textContent = `${wheelIdx + 1} / ${n}`;
  }

  /* Positionnement initial (sans animation) */
  positionCards(false);

  /* Bouton : avancer d'une carte */
  btn.addEventListener('click', () => {
    if (wheelAnimating) return;
    wheelAnimating = true;

    wheelIdx = (wheelIdx + 1) % n;

    /* Rotation de la flèche */
    wheelArrowDeg += 360;
    if (arrow) {
      arrow.style.transition = 'transform .65s ease';
      arrow.style.transform  = `rotate(${wheelArrowDeg}deg)`;
    }

    positionCards(true);

    setTimeout(() => { wheelAnimating = false; }, 700);
  });

  /* Recalcul au resize */
  window.addEventListener('resize', () => {
    positionCards(false);
  }, { passive: true });
}

/* ============================================================
   FORM
   ============================================================ */

const FORM_ENDPOINT =
  'https://script.google.com/macros/s/AKfycby9Wl5NkOsqpnwpltSUX6-XNYsGp8VSiPpKQNTTGDuwslXsTs5-vVsJ4Ufi4oFrz4g/exec';


