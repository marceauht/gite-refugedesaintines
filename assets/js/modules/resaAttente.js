/* ============================================================
   RESAATTENTE.JS — Attentes et messages de la réservation
   - initVoile() : voile pleine page (préparation du paiement, retour de Stripe,
     confirmation), avec la maison du logo qui se dessine et des messages qui changent
   - encadreErreur() : encadré d'erreur centré, avec ses boutons
   - fantomeCalendrier(), bandeau(), cercle() : petits éléments du formulaire
   - messagerie() : bouton « Ouvrir Gmail / Outlook… » selon l'adresse email
   - messageSaison() : chauffage, clim ou température idéale selon le mois d'arrivée
   Styles : assets/css/components/resaAttente.css
   Le Refuge de Saintines
   ============================================================ */

const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pause = ms => new Promise(r => setTimeout(r, ms));

export const TEL_AFFICHE = '06 73 73 53 18';
export const TEL_LIEN    = 'tel:+33673735318';

// ── Petits dessins ─────────────────────────────────────────
export const cercle = () => '<svg class="att-spin" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7"/></svg>';
const POINTS = '<span class="att-points" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>';

const ICONES = {
  calendrier: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 10h18M8 3v4M16 3v4M10 13.5l4 4M14 13.5l-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  alerte:     '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5v5.5M12 16.5v.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  connexion:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.8 16a5 5 0 0 1 6.4 0M12 19.5v.01" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  coche:      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 12.5l2.6 2.6L16 9.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cadenas:    '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor" stroke="currentColor" stroke-width="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
};

// Maison du logo : « dessin » (en boucle), « allumee » (fenêtres + cheminée), « calme » (dessinée, éteinte)
const maison = etat => `<svg class="att-maison is-${etat}" viewBox="0 0 120 120" aria-hidden="true">
  <path class="trait" d="M18 58 L60 22 L102 58"/>
  <path class="trait" d="M28 50 V100 H92 V50"/>
  <path class="trait" d="M52 100 V76 a8 8 0 0 1 16 0 V100"/>
  <path class="trait" d="M80 36 V24 H88 V43"/>
  <rect class="fenetre" x="35" y="64" width="11" height="11" rx="1.5"/>
  <rect class="fenetre" x="74" y="64" width="11" height="11" rx="1.5"/>
  <path class="trait" d="M35 64 h11 v11 h-11z M74 64 h11 v11 h-11z"/>
  <path class="fumee" d="M84 18 c-4 -4 4 -6 0 -10"/>
</svg>`;

// Carte bancaire avec flèche retour (annulé) ou croix (non abouti), centrées sous la bande de la carte
const carteBancaire = croix => `<svg class="att-icone" viewBox="0 0 72 72" aria-hidden="true">
  <rect class="trait" x="10" y="18" width="52" height="36" rx="6"/><path class="trait" d="M10 28h52"/>
  ${croix ? '<path class="trait trace" d="M30 35l12 12M42 35l-12 12"/>' : '<path class="trait trace" d="M27 41h18M33 35l-6 6 6 6"/>'}
</svg>`;

const DESSINS = {
  'maison':          () => maison('dessin'),
  'maison-allumee':  () => maison('allumee'),
  'maison-calme':    () => maison('calme'),
  'annule':          () => carteBancaire(false),
  'echec':           () => carteBancaire(true)
};

// ── Voile pleine page ──────────────────────────────────────
/**
 * Renvoie { afficher(etat), fermer(), ouvert() }.
 * etat = { icone, titre, points, messages: [..] (changent toutes les 2 s) ou message,
 *          carte: [[libellé, valeur], ...], actions: [{ texte, href, cible, primaire, clic }],
 *          lien: { texte, clic }, note: { texte, icone } }
 */
export function initVoile() {
  const voile = document.createElement('div');
  voile.className = 'resa-voile';
  voile.setAttribute('role', 'dialog');
  voile.setAttribute('aria-modal', 'true');
  voile.setAttribute('aria-labelledby', 'resa-voile-titre');
  voile.innerHTML = `<div class="resa-voile-aurora" aria-hidden="true"><i></i><i></i></div>
    <div class="resa-voile-contenu" aria-live="polite">
      <div class="resa-voile-icone"></div>
      <p class="resa-voile-titre" id="resa-voile-titre"></p>
      <p class="resa-voile-msg"></p>
      <div class="resa-voile-carte" hidden></div>
      <div class="resa-voile-actions" hidden></div>
      <p class="resa-voile-note" hidden></p>
    </div>`;
  document.body.append(voile);
  const $ = s => voile.querySelector(s);
  const icone = $('.resa-voile-icone'), titre = $('.resa-voile-titre'), msg = $('.resa-voile-msg');
  const carte = $('.resa-voile-carte'), actions = $('.resa-voile-actions'), note = $('.resa-voile-note');
  let tour = 0, iconeActuelle = '';

  async function afficher(e) {
    const monTour = ++tour;
    const dejaOuvert = voile.classList.contains('is-ouvert');
    // Textes déjà affichés : ils s'effacent en douceur avant les nouveaux
    if (dejaOuvert) {
      titre.classList.add('is-sortie'); msg.classList.add('is-sortie');
      await pause(450);
      if (monTour !== tour) return;
    }
    if (e.icone !== iconeActuelle) { icone.innerHTML = DESSINS[e.icone](); iconeActuelle = e.icone; }
    titre.innerHTML = esc(e.titre) + (e.points ? POINTS : '');
    const messages = e.messages || [e.message || ''];
    msg.textContent = messages[0];
    carte.hidden = !e.carte;
    carte.innerHTML = (e.carte || []).map(([l, v]) => `<div><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join('');
    actions.hidden = !(e.actions?.length || e.lien);
    actions.innerHTML = '';
    (e.actions || []).forEach(a => actions.append(bouton(a)));
    if (e.lien) {
      const l = document.createElement('button');
      l.type = 'button'; l.className = 'att-lien'; l.textContent = e.lien.texte;
      l.addEventListener('click', e.lien.clic);
      actions.append(l);
    }
    note.hidden = !e.note;
    note.innerHTML = e.note ? (ICONES[e.note.icone] || '') + esc(e.note.texte) : '';
    titre.classList.remove('is-sortie'); msg.classList.remove('is-sortie');

    if (!dejaOuvert) {
      document.documentElement.classList.add('att-voile-ouvert');
      voile.hidden = false;
      void voile.offsetWidth;
      voile.classList.add('is-ouvert');
      // Une fois le voile opaque, on masque la page dessous : Safari (iPhone) la laisse sinon
      // apparaître derrière l'heure et la barre d'adresse, que le voile ne peut pas recouvrir.
      setTimeout(() => { if (monTour === tour || voile.classList.contains('is-ouvert')) document.documentElement.classList.add('att-voile-plein'); }, 550);
    }
    if (!actions.hidden) setTimeout(() => actions.querySelector('a, button')?.focus({ preventScroll: true }), 500);

    // Messages qui défilent (toutes les 2,1 s) tant que l'écran ne change pas
    for (let i = 1; i < messages.length; i++) {
      await pause(2100);
      if (monTour !== tour) return;
      msg.classList.add('is-sortie');
      await pause(500);
      if (monTour !== tour) return;
      msg.textContent = messages[i];
      msg.classList.remove('is-sortie');
    }
  }

  async function fermer() {
    tour++;
    document.documentElement.classList.remove('att-voile-plein');   // la page réapparaît sous le voile avant son fondu
    voile.classList.remove('is-ouvert');
    document.documentElement.classList.remove('att-voile-ouvert');
    await pause(500);
    if (!voile.classList.contains('is-ouvert')) { voile.hidden = true; icone.innerHTML = ''; iconeActuelle = ''; }
  }

  voile.hidden = true;
  return { afficher, fermer, ouvert: () => voile.classList.contains('is-ouvert') };
}

// Bouton ou lien du voile et des encadrés
export function bouton({ texte, href, cible, primaire, clic, petit }) {
  const b = document.createElement(href ? 'a' : 'button');
  b.className = 'att-btn' + (primaire ? ' att-btn--primaire' : '') + (petit ? ' att-btn--petit' : '');
  if (href) {
    b.href = href;
    if (cible) { b.target = cible; b.rel = 'noopener'; }
  } else b.type = 'button';
  b.textContent = texte;
  if (clic) b.addEventListener('click', ev => clic(ev, b));
  return b;
}

// Bouton qui tourne pendant une action (le texte reste lisible)
export function occuper(b, texte) {
  b.classList.add('is-occupe');
  b.innerHTML = cercle() + esc(texte);
}

// ── Encadré d'erreur ───────────────────────────────────────
// icone : calendrier | alerte | connexion
export function encadreErreur({ icone, titre, texte, actions = [] }) {
  const div = document.createElement('div');
  div.className = 'att-erreur';
  div.setAttribute('role', 'alert');
  div.innerHTML = `${ICONES[icone] || ICONES.alerte}<strong>${esc(titre)}</strong><p>${esc(texte)}</p>`;
  if (actions.length) {
    const zone = document.createElement('div');
    zone.className = 'att-erreur-actions';
    actions.forEach(a => zone.append(bouton(a)));
    div.append(zone);
  }
  return div;
}

// Bouton « Appeler Marceau » (lien téléphone)
export const appeler = () => ({ texte: 'Appeler Marceau', href: TEL_LIEN });

// ── Petits éléments du formulaire ──────────────────────────
// Calendrier fantôme qui clignote pendant le chargement
export function fantomeCalendrier() {
  const div = document.createElement('div');
  div.className = 'att-fantome';
  div.setAttribute('aria-hidden', 'true');
  div.innerHTML = Array.from({ length: 28 }, (_, i) => `<i style="--d:${i}"></i>`).join('');
  return div;
}

// Bandeau centré (ex. « Vos informations ont été conservées »)
export function bandeau(texte) {
  const div = document.createElement('div');
  div.className = 'att-bandeau';
  div.setAttribute('role', 'status');
  div.innerHTML = ICONES.coche + `<span>${esc(texte)}</span>`;
  return div;
}

// ── Bouton de messagerie selon l'adresse ───────────────────
// Renvoie { nom, url } pour les messageries connues, sinon null (le bouton n'est pas affiché)
const MESSAGERIES = [
  { domaines: ['gmail.com', 'googlemail.com'], nom: 'Gmail', url: 'https://mail.google.com/' },
  { domaines: ['outlook.', 'hotmail.', 'live.', 'msn.com'], nom: 'Outlook', url: 'https://outlook.live.com/mail/' },
  { domaines: ['yahoo.', 'ymail.com'], nom: 'Yahoo Mail', url: 'https://mail.yahoo.com/' },
  { domaines: ['icloud.com', 'me.com', 'mac.com'], nom: 'iCloud Mail', url: 'https://www.icloud.com/mail' },
  { domaines: ['orange.fr', 'wanadoo.fr'], nom: 'ma messagerie Orange', url: 'https://messagerie.orange.fr/' },
  { domaines: ['sfr.fr', 'neuf.fr'], nom: 'ma messagerie SFR', url: 'https://webmail.sfr.fr/' },
  { domaines: ['free.fr'], nom: 'ma messagerie Free', url: 'https://webmail.free.fr/' },
  { domaines: ['laposte.net'], nom: 'ma messagerie La Poste', url: 'https://www.laposte.net/accueil' }
];
export function messagerie(email) {
  const domaine = String(email || '').toLowerCase().split('@')[1] || '';
  return MESSAGERIES.find(m => m.domaines.some(d => d.endsWith('.') ? domaine.startsWith(d) : domaine === d)) || null;
}

// ── Message selon le mois d'arrivée ────────────────────────
// Chauffage de novembre à mars, clim de juin à septembre, sinon température idéale
export function messageSaison(dateArrivee) {
  const mois = (dateArrivee instanceof Date && !isNaN(dateArrivee) ? dateArrivee : new Date()).getMonth() + 1;
  if (mois >= 11 || mois <= 3) return 'On allume le chauffage pour votre arrivée…';
  if (mois >= 6 && mois <= 9)  return 'On allume la clim pour votre arrivée…';
  return 'On règle la température idéale pour votre arrivée…';
}

// « 12/12/2026 » et « 15/12/2026 » → « 12 → 15 déc. 2026 » (ou « 30 déc. → 2 janv. 2027 »)
export function sejourCourt(arrivee, depart) {
  const lire = t => { const [j, m, a] = String(t).split('/').map(Number); return new Date(a, m - 1, j); };
  const a = lire(arrivee), d = lire(depart);
  if (isNaN(a) || isNaN(d)) return `${arrivee} → ${depart}`;
  const mois = x => x.toLocaleDateString('fr-FR', { month: 'short' });
  if (a.getFullYear() !== d.getFullYear()) return `${a.getDate()} ${mois(a)} ${a.getFullYear()} → ${d.getDate()} ${mois(d)} ${d.getFullYear()}`;
  if (a.getMonth() !== d.getMonth()) return `${a.getDate()} ${mois(a)} → ${d.getDate()} ${mois(d)} ${d.getFullYear()}`;
  return `${a.getDate()} → ${d.getDate()} ${mois(d)} ${d.getFullYear()}`;
}

export { ICONES, pause };
