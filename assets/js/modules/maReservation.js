/* ============================================================
   MARESERVATION.JS — Page « Ma réservation » (réservations directes)
   Chargé par main.js uniquement sur ma-reservation.html (body.sejour-page).
   Le voyageur arrive ici par le lien secret de son email de confirmation
   (ma-reservation.html?r=JETON). Les données viennent de l'Apps Script :
   GET ?action=sejour&r=JETON, POST action=renvoyer_contrat | annuler_sejour.
   ============================================================ */

import { SCRIPT_URL } from './reservation.js';

const ADRESSE   = '80 Impasse du Lavoir, 60410 Saintines';
const MOIS      = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const JOURS     = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const REDUIT    = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const SOURIS    = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ── Échanges avec l'Apps Script ────────────────────────────── */
// Lecture de la réservation. Réponse : { statut: CONFIRMEE | ANNULEE | INCONNUE | ERREUR, … }
async function charger(jeton) {
  const ctrl = new AbortController();
  const delai = setTimeout(() => ctrl.abort(), 20000);
  try {
    const resp = await fetch(`${SCRIPT_URL}?action=sejour&r=${encodeURIComponent(jeton)}`, { redirect: 'follow', signal: ctrl.signal });
    return await resp.json();
  } finally { clearTimeout(delai); }
}

// Boutons de la page (renvoi du contrat, annulation). Réponse : { success, message?, … }
async function appeler(action, jeton) {
  const data = new FormData();
  data.append('action', action);
  data.append('r', jeton);
  const resp = await fetch(SCRIPT_URL, { method: 'POST', body: data });
  return resp.json();
}

// Dates du script : « AAAA-MM-JJ » (jour) ou « AAAA-MM-JJTHH:MM » (heure de Paris), lues en heure locale
const jourLocal  = s => new Date(`${s}T00:00:00`);
const heureLocal = s => (s ? new Date(s) : null);
function depuisScript(d) {
  const r = { ...d, arrivee: jourLocal(d.arrivee), depart: jourLocal(d.depart), annuleLe: heureLocal(d.annuleLe) };
  if (d.statut === 'ANNULEE') return r;
  r.dateResa  = heureLocal(d.dateResa);
  r.contratLe = heureLocal(d.contratLe) || r.dateResa;
  r.emails    = Object.fromEntries(Object.entries(d.emails || {}).map(([k, v]) => [k, new Date(v)]));
  return r;
}

// Lien faux / réservation introuvable, ou script injoignable
function erreur(cas) {
  document.body.classList.add('is-error');
  const bloc = $('#sj-error');
  bloc.hidden = false;
  if (cas !== 'connexion') return;
  $('#sj-error-titre').textContent = 'Connexion impossible';
  $('.sj-sheet-text', bloc).textContent = "Votre réservation n'a pas pu être chargée. Vérifiez votre connexion, puis réessayez.";
  const bouton = $('.sj-btn', bloc);
  bouton.href = location.href;
  $('span', bouton).textContent = 'Réessayer';
}

/* ── Outils ─────────────────────────────────────────────────── */
const $  = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const deux  = n => String(n).padStart(2, '0');
const court = d => `${deux(d.getDate())}/${deux(d.getMonth() + 1)}`;
const long  = d => `${court(d)}/${d.getFullYear()}`;
const euros = n => n.toFixed(2).replace('.', ',');
const prixTexte = n => `${Number.isInteger(n) ? n : euros(n)}\u00a0€`;   // 166 € ; 166,50 € s'il y a des centimes

function remplir(champ, valeur) {
  $$(`[data-f="${champ}"]`).forEach(el => { el.textContent = valeur; });
}

/* ── Rendu de la réservation ────────────────────────────────── */
function afficher(r) {
  const maintenant = new Date();
  const arrivee  = new Date(r.arrivee); arrivee.setHours(16, 0, 0, 0);
  const depart   = new Date(r.depart);  depart.setHours(11, 0, 0, 0);
  const limite   = new Date(r.arrivee); limite.setDate(limite.getDate() - 7); limite.setHours(23, 59, 59);
  const nuits    = Math.round((new Date(r.depart) - new Date(r.arrivee)) / 864e5);
  const annulee  = r.statut === 'ANNULEE';
  const enCours  = maintenant >= arrivee && maintenant < depart;
  const termine  = maintenant >= depart;

  document.body.classList.toggle('is-annulee', annulee);
  $('#sj-closed').hidden = !annulee;
  remplir('arriveeLong', long(arrivee));
  remplir('departLong', long(depart));
  if (annulee) {
    remplir('statutLibelle', 'Annulé');
    $('.sj-status').dataset.statut = 'ANNULEE';
    $('#sj-closed-le').hidden = !r.annuleLe;
    if (r.annuleLe) remplir('annuleLe', long(r.annuleLe));
    $('#sj-closed-remb').hidden = r.rembourse == null;
    if (r.rembourse != null) remplir('rembourseTexte', prixTexte(r.rembourse));
    $('[data-dock="annuler"]').hidden = true;             // reste « Besoin d'aide ? »
    $('.sj-dock').classList.add('is-solo');
    $('#sj-mail').href = `mailto:contact@gite-refugedesaintines.com?subject=${encodeURIComponent('Réservation annulée')}`;
    return;
  }
  remplir('id', r.id);
  remplir('bonjour', `Bonjour ${r.prenom},`);
  remplir('accroche', enCours ? 'bon séjour au Refuge.'
                    : termine ? 'merci pour votre venue.'
                    : 'le Refuge vous attend.');
  remplir('statutLibelle', enCours ? 'En cours' : termine ? 'Terminé' : 'Confirmé');
  $('.sj-status').dataset.statut = enCours ? 'EN_COURS' : termine ? 'TERMINE' : 'CONFIRMEE';

  // Dates
  remplir('arriveeJour', deux(arrivee.getDate()));
  remplir('arriveeMois', MOIS[arrivee.getMonth()]);
  remplir('arriveeSemaine', JOURS[arrivee.getDay()]);
  remplir('departJour', deux(depart.getDate()));
  remplir('departMois', MOIS[depart.getMonth()]);
  remplir('departSemaine', JOURS[depart.getDay()]);
  remplir('nuits', nuits);
  remplir('nuitsS', nuits > 1 ? 's' : '');
  remplir('dateResaLong', long(new Date(r.dateResa)));
  remplir('dateLimite', long(limite));

  // Voyageurs : une case par type (une case à 0 disparaît, sauf les adultes)
  [['adultes', 'Adulte', 'Adultes'], ['enfants', 'Enfant', 'Enfants'], ['bebes', 'Bébé', 'Bébés']]
    .forEach(([cle, un, plusieurs]) => {
      const caseVoy = $(`[data-pax="${cle}"]`);
      $('.sj-pax-num', caseVoy).textContent = r[cle];
      $('.sj-pax-label', caseVoy).textContent = r[cle] > 1 ? plusieurs : un;
      caseVoy.hidden = !r[cle] && cle !== 'adultes';
    });
  $('.sj-ticket-lit').hidden = r.lit !== 'OUI';      // pas de lit parapluie : la ligne disparaît
  codeBarres(r.id);

  // Paiement, contrat, caution
  $('[data-money="montant"]').dataset.target = r.montant;
  remplir('taxe', `${euros(r.taxe)} €`);
  remplir('montantTexte', prixTexte(r.montant));
  const c = new Date(r.contratLe);
  remplir('contratLe', `${long(c)} à ${deux(c.getHours())}h${deux(c.getMinutes())}`);
  // Caution : état réel chez Stripe (colonne « Caution » du Sheet, suivie par le script)
  $('[data-money="caution"]').dataset.target = r.caution;
  const veille = new Date(r.arrivee); veille.setDate(veille.getDate() - 1);
  const etatCaution = r.cautionEtat || 'prevue';
  const bloqueeLe = court(r.cautionLe ? new Date(r.cautionLe) : veille);
  const libereeLe = r.cautionLiberee ? ` le ${court(jourLocal(r.cautionLiberee))}` : '';
  remplir('cautionTexte', {
    prevue:    `Bloquée le ${bloqueeLe}, libérée après votre départ.`,
    faite:     `Bloquée le ${bloqueeLe}, libérée après votre départ.`,
    a_valider: 'Votre banque demande une validation pour bloquer la somme.',
    echec:     "La caution n'a pas pu être déposée. Veuillez ",
    liberee:   `Votre caution a été libérée${libereeLe}.`,
    encaissee: 'La somme a été encaissée.'
  }[etatCaution] || `Bloquée le ${bloqueeLe}, libérée après votre départ.`);
  if (etatCaution === 'echec') {          // « me contacter » ouvre la feuille de contact
    const lien = document.createElement('button');
    lien.type = 'button'; lien.className = 'sj-lien'; lien.dataset.vers = 'aide'; lien.textContent = 'me contacter';
    $('[data-f="cautionTexte"]').append(lien, '.');
  }
  $('#sj-caution-etat').dataset.etat = ['faite', 'liberee', 'encaissee'].includes(etatCaution) ? 'faite' : 'prevue';
  remplir('cautionLibelle', {
    prevue: 'Prévue via Stripe', a_valider: 'À valider', echec: 'Non validée',
    faite: 'Empreinte via Stripe', liberee: 'Libérée via Stripe', encaissee: 'Encaissée via Stripe'
  }[etatCaution] || 'Prévue via Stripe');
  const lienCaution = $('#sj-caution-lien');
  lienCaution.hidden = !r.cautionLien;
  if (r.cautionLien) lienCaution.href = r.cautionLien;

  frise(r, { maintenant, arrivee, depart, limite });
  portail(r, { maintenant, depart });

  // Annulation (feuille « Besoin d'annuler ? »)
  const zone = $('#sj-annuler');
  zone.dataset.mode = maintenant <= limite ? 'possible' : 'late';
  remplir('annulTitre', maintenant <= limite ? 'Annuler mon séjour' : 'Annulation');
  const sansAnnulation = enCours || termine;
  $('[data-dock="annuler"]').hidden = sansAnnulation;
  $('.sj-dock').classList.toggle('is-solo', sansAnnulation);
  const joursRestants = Math.max(Math.ceil((limite - maintenant) / 864e5), 0);
  remplir('joursRestants', joursRestants > 1 ? `Vous avez encore ${joursRestants} jours.`
                        : joursRestants === 1 ? 'Vous avez encore 1 jour.'
                        : "C'est le dernier jour.");

  // Compte à rebours
  const cible = enCours ? depart : arrivee;
  remplir('compteurLibelle', enCours ? 'Départ prévu dans' : 'Arrivée prévue dans');
  if (termine) $('#sj-countdown').classList.add('is-hidden');
  else compteARebours(cible);

  // Agenda
  agenda(r, arrivee, depart);
  $('#sj-mail').href = `mailto:contact@gite-refugedesaintines.com?subject=${encodeURIComponent('Réservation ' + r.id)}`;
}

/* ── Code-barres du billet (Code 128, jeu B) ───────────────── */
// Un vrai code-barres de la référence (ex. LRDS-0007), lisible par un scanner.
// Chaque symbole = 11 modules (1 = barre, 0 = espace).
const CODE128 = '11011001100110011011001100110011010010011000100100011001000100110010011001000100110001001000110010011001001000110010001001100010010010110011100100110111001001100111010111001100100111011001001110011011001110010110010111001100100111011011100100110011101001110110111011101001100111001011001110010011011101100100111001101001110011001011011011000110110001101100011011010100011000100010110001000100011010110001000100011010001000110001011010001000110001010001100010001010110111000101100011101000110111010111011000101110001101000111011011101110110110100011101100010111011011101000110111000101101110111011101011000111010001101110001011011101101000111011000101110001101011101111010110010000101111000101010100110000101000011001001011000010010000110100001011001000010011010110010000101100001001001101000010011000010100001101001000011001011000010010110010100001111011101011000010100100011110101010011110010010111100100100111101011110010010011110100100111100101111010010011110010100111100100101101101111011011110110111101101101010111100010100011110100010111101011110100010111100010111101010001111010001010111011110101111011101110101111011110101110110100001001101001000011010011100';
const CODE128_STOP = '1100011101011';

function codeBarres(texte) {
  const symbole = v => CODE128.substr(v * 11, 11);
  const valeurs = [...texte].map(c => c.charCodeAt(0) - 32);   // jeu B : caractère ASCII − 32
  let somme = 104;                                             // 104 = départ jeu B
  valeurs.forEach((v, i) => { somme += v * (i + 1); });
  const motif = symbole(104) + valeurs.map(symbole).join('') + symbole(somme % 103) + CODE128_STOP;

  const svg = $('.sj-barcode');
  svg.setAttribute('viewBox', `0 0 ${motif.length} 1`);
  let barres = '';
  for (let x = 0; x < motif.length; x++) {
    if (motif[x] !== '1') continue;
    let l = 1;
    while (motif[x + l] === '1') l++;
    barres += `<rect x="${x}" y="0" width="${l}" height="1" />`;
    x += l - 1;
  }
  svg.innerHTML = barres;
}

/* ── Frise « Votre séjour en détail » ───────────────────────── */
// Date décalée de n jours, à heure fixe
const a = (base, jours, heure) => { const d = new Date(base); d.setDate(d.getDate() + jours); d.setHours(heure, 0, 0, 0); return d; };
// Email d'accès et ouverture du portail : la veille de l'arrivée dès 10h (ou dès la réservation si elle est plus tardive)
const ouverturePortail = r => new Date(Math.max(a(r.arrivee, -1, 10), new Date(r.dateResa)));

// Dates prévues des emails automatiques : mêmes règles que planifierEmails() dans l'Apps Script.
// Un email est coché « Envoyé » seulement s'il figure dans la colonne « Emails envoyés » du Sheet.
const TYPE_EMAIL = { mailAcces: 'Accès', mailDepart: 'Départ', mailAvis: 'Avis' };
function frise(r, { maintenant, arrivee, depart, limite }) {
  const resa = new Date(r.dateResa);
  const dates = {
    resa,
    limite,
    mailAcces:  ouverturePortail(r),                                     // la veille dès 10h (ou le jour même si réservé tard)
    arrivee,
    mailDepart: new Date(Math.max(a(r.depart, -1, 16), resa)),           // la veille du départ dès 16h
    depart,
    mailAvis:   a(r.depart, 1, 10)                                       // le lendemain du départ dès 10h
  };
  Object.entries(TYPE_EMAIL).forEach(([cle, type]) => { if (r.emails[type]) dates[cle] = r.emails[type]; });
  const heures = { mailAcces: 10, mailDepart: 16, mailAvis: 10 };

  // Réservé à moins de 7 jours : pas d'annulation gratuite, l'étape disparaît
  $('[data-etape="limite"]').hidden = limite < resa;

  const steps = $$('.sj-step').filter(s => !s.hidden);
  let derniere = -1;
  steps.forEach((s, i) => {
    const cle = s.dataset.etape;
    const fait = TYPE_EMAIL[cle] ? !!r.emails[TYPE_EMAIL[cle]] : maintenant >= dates[cle];
    if (fait) derniere = i;
    s.style.setProperty('--d', i);
    s.classList.toggle('done', fait);
    s.classList.toggle('current', i === derniere + 1 && !fait);
    if (s.classList.contains('sj-step--mail')) {
      const d = dates[cle];
      remplir(`${cle}Le`, fait ? `Envoyé le ${long(d)}` : `Le ${long(d)} · à partir de ${heures[cle]}h`);
    }
  });
  if (maintenant > limite) $('[data-etape="limite"]').classList.add('muted');

  // Remplissage de la ligne : jusqu'à la dernière pastille passée, puis au prorata
  // du temps écoulé vers la suivante (calculé en pixels, les étapes n'ont pas la même hauteur).
  const ol = $('#sj-timeline');
  const remplirLigne = () => {
    const piste = $('.sj-timeline-track', ol);
    const centre = s => s.offsetTop + $('.sj-step-dot', s).offsetTop + $('.sj-step-dot', s).offsetHeight / 2;
    // La ligne va du centre de la première pastille au centre de la dernière
    piste.style.top = `${centre(steps[0])}px`;
    piste.style.height = `${centre(steps[steps.length - 1]) - centre(steps[0])}px`;
    let y = 0;
    if (derniere >= 0) {
      y = centre(steps[derniere]);
      const suivante = steps[derniere + 1];
      if (suivante) {
        const t0 = dates[steps[derniere].dataset.etape], t1 = dates[suivante.dataset.etape];
        const part = t1 > t0 ? Math.min(Math.max((maintenant - t0) / (t1 - t0), 0), 1) : 0;
        y += (centre(suivante) - y) * part;
      } else y = piste.offsetTop + piste.offsetHeight;
    }
    const progres = (y - piste.offsetTop) / piste.offsetHeight;
    ol.style.setProperty('--progress', Math.min(Math.max(progres, 0), 1));
  };
  remplirLigne();
  window.addEventListener('resize', remplirLigne);
  if (document.fonts) document.fonts.ready.then(remplirLigne);
}

/* ── Portail voyageurs : porte d'embarquement ────────────────── */
// Ouverte de la veille de l'arrivée (10h) jusqu'au départ ; fermée avant et après.
// Attention : ça masque seulement le lien ici, le portail lui-même reste public (tâche 18).
function portail(r, { maintenant, depart }) {
  const porte = $('#sj-portail');
  const ouverture = ouverturePortail(r);
  const ouvert = maintenant >= ouverture && maintenant < depart;
  porte.dataset.etat = ouvert ? 'ouvert' : maintenant >= depart ? 'termine' : 'ferme';
  remplir('portailStatut', ouvert ? 'Embarquement ouvert'
                         : maintenant >= depart ? 'Embarquement terminé'
                         : `Embarquement le ${court(ouverture)} · ${ouverture.getHours()}h`);
  if (ouvert) {
    porte.href = 'https://guest.gite-refugedesaintines.com';   // = fichier CNAME du dépôt guest
    porte.target = '_blank';
    porte.rel = 'noopener';
    porte.removeAttribute('aria-disabled');
    return;
  }
  // Fermé : pas de lien ; un toucher fait « non » de la tête
  porte.addEventListener('click', e => { e.preventDefault(); hocherLaTete(porte); });
}

// Petit « non » de la tête en 3D (porte fermée, billet touché)
function hocherLaTete(el) {
  el.classList.remove('is-refus');
  void el.offsetWidth;                                     // relance l'animation
  el.classList.add('is-refus');
  el.addEventListener('animationend', function fin(e) {
    if (e.animationName !== 'sjRefus') return;
    el.classList.remove('is-refus');
    el.removeEventListener('animationend', fin);
  });
}

/* ── Compte à rebours : panneau à palettes (aéroport vintage) ─ */
// Chaque chiffre est une palette coupée en deux : la moitié haute de l'ancien
// chiffre se replie vers la fente, puis la moitié basse du nouveau se déplie.
// L'état final est fixé par un minuteur (et non par la fin de l'animation),
// pour que les deux moitiés finissent toujours par afficher le même chiffre.
function palette() {
  const el = document.createElement('span');
  el.className = 'sj-flap';
  el.innerHTML = '<span class="sj-flap-top"><b></b></span><span class="sj-flap-bottom"><b></b></span>'
               + '<span class="sj-flap-fold"><b></b></span><span class="sj-flap-unfold"><b></b></span>';
  return el;
}

function tourner(el, nouveau) {
  const ancien = el.dataset.v;
  if (ancien === nouveau) return;
  el.dataset.v = nouveau;
  const [haut, bas, plie, deplie] = $$('b', el);
  if (ancien === undefined || REDUIT) {             // premier affichage : sans animation
    haut.textContent = bas.textContent = plie.textContent = deplie.textContent = nouveau;
    return;
  }
  clearTimeout(el._fin);
  haut.textContent = nouveau;  bas.textContent = ancien;
  plie.textContent = ancien;   deplie.textContent = nouveau;
  el.classList.remove('is-flipping'); void el.offsetWidth; el.classList.add('is-flipping');
  el._fin = setTimeout(() => {                       // fin du mouvement : tout sur le nouveau chiffre
    bas.textContent = plie.textContent = nouveau;
    el.classList.remove('is-flipping');
  }, 560);
}

function compteARebours(cible) {
  const blocs = { j: $('[data-cd="j"]'), h: $('[data-cd="h"]'), m: $('[data-cd="m"]'), s: $('[data-cd="s"]') };
  const maj = () => {
    const reste = Math.max(cible - Date.now(), 0);
    const v = {
      j: Math.floor(reste / 864e5),
      h: Math.floor(reste / 36e5) % 24,
      m: Math.floor(reste / 6e4) % 60,
      s: Math.floor(reste / 1e3) % 60
    };
    Object.keys(v).forEach(k => {
      const txt = deux(v[k]);                        // 2 chiffres (3 si plus de 99 jours)
      while (blocs[k].children.length < txt.length) blocs[k].prepend(palette());
      while (blocs[k].children.length > txt.length) blocs[k].firstElementChild.remove();
      [...txt].forEach((c, i) => tourner(blocs[k].children[i], c));
    });
  };
  maj();
  setInterval(maj, 1000);
}

/* ── Agenda : fichier .ics + lien Google Agenda ─────────────── */
function agenda(r, arrivee, depart) {
  const utc = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const titre = 'Séjour au Refuge de Saintines';
  // Lien vers cette page (avec le jeton secret du voyageur), d'où il accède au reste
  const lienPage = location.href.split('#')[0];
  const details = [
    `Réservation réf. ${r.id}.`,
    'Arrivée dès 16 h, départ avant 11 h.',
    `Ma réservation : ${lienPage}`,
    'Contact en cas de besoin : +33 6 73 73 53 18'
  ].join('\n');
  // Format .ics : retours à la ligne, virgules et points-virgules doivent être « échappés »
  const echapper = t => t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Le Refuge de Saintines//Sejour//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${r.id}@gite-refugedesaintines.com`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(arrivee)}`,
    `DTEND:${utc(depart)}`,
    `SUMMARY:${titre}`,
    `LOCATION:${ADRESSE.replace(/,/g, '\\,')}`,
    `DESCRIPTION:${echapper(details)}`,
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${titre} demain`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  // Un seul bouton, qui s'adapte à l'appareil :
  // - Android : Google Agenda (l'appli par défaut ; un fichier .ics y est mal géré)
  // - iPhone / iPad : fichier .ics ouvert directement par Calendrier (« Ajouter »)
  // - ordinateur : fichier .ics téléchargé, qui s'ouvre dans Outlook, Calendrier…
  const bouton = $('#sj-agenda');
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) {
    bouton.href = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + `&text=${encodeURIComponent(titre)}&dates=${utc(arrivee)}/${utc(depart)}`
      + `&details=${encodeURIComponent(details)}&location=${encodeURIComponent(ADRESSE)}`;
    bouton.target = '_blank';
    bouton.rel = 'noopener';
  } else {
    bouton.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const iOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!iOS) bouton.download = 'sejour-refuge-de-saintines.ics';
  }
}

/* ── Titre : découpage en lettres ───────────────────────────── */
function decouperTitre() {
  let i = 0;
  $$('.sj-split').forEach(el => {
    const mots = el.textContent.split(' ');
    el.textContent = '';
    el.setAttribute('aria-label', mots.join(' '));
    mots.forEach((mot, m) => {
      const bloc = document.createElement('span');
      bloc.style.display = 'inline-block';
      bloc.setAttribute('aria-hidden', 'true');
      [...mot].forEach(ch => {
        const s = document.createElement('span');
        s.className = 'sj-char';
        s.textContent = ch;
        s.style.setProperty('--i', i++);
        bloc.appendChild(s);
      });
      el.appendChild(bloc);
      if (m < mots.length - 1) {
        const esp = document.createElement('span');
        esp.className = 'sj-space';
        el.appendChild(esp);
      }
    });
  });
}

/* ── Compteurs qui défilent ─────────────────────────────────── */
function compter(el) {
  const cible = parseFloat(el.dataset.target || '0');
  if (REDUIT) { el.textContent = cible; return; }
  const duree = 1400, debut = performance.now();
  const pas = t => {
    const p = Math.min((t - debut) / duree, 1);
    const v = cible * (1 - Math.pow(1 - p, 4));
    el.textContent = Math.round(v);
    if (p < 1) requestAnimationFrame(pas);
  };
  requestAnimationFrame(pas);
}

/* ── Apparitions au défilement ──────────────────────────────── */
function apparitions() {
  $$('.sj-col--details .sj-reveal').forEach((el, i) => el.style.setProperty('--d', i % 3));
  const obs = new IntersectionObserver(entrees => {
    entrees.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('visible');
      $$('[data-money]', e.target).forEach(el => compter(el));
      obs.unobserve(e.target);
    });
  }, { threshold: 0.18 });
  $$('.sj-reveal, .sj-timeline').forEach(el => obs.observe(el));
}

/* ── Cartes : inclinaison 3D + lumière qui suit la souris ───── */
function cartesInteractives() {
  if (!SOURIS || REDUIT) return;
  $$('.sj-card').forEach(carte => {
    carte.addEventListener('pointermove', e => {
      const r = carte.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      carte.style.setProperty('--spot-x', `${x * 100}%`);
      carte.style.setProperty('--spot-y', `${y * 100}%`);
      carte.style.setProperty('--tilt-x', `${(0.5 - y) * 5}deg`);
      carte.style.setProperty('--tilt-y', `${(x - 0.5) * 5}deg`);
    });
    carte.addEventListener('pointerleave', () => {
      carte.style.setProperty('--tilt-x', '0deg');
      carte.style.setProperty('--tilt-y', '0deg');
    });
  });
  // Halo de fond qui suit la souris
  const page = document.body;
  window.addEventListener('pointermove', e => {
    page.style.setProperty('--mx', `${(e.clientX / innerWidth) * 100}%`);
    page.style.setProperty('--my', `${(e.clientY / innerHeight) * 100}%`);
  }, { passive: true });
}

/* ── Parallaxe de la photo du hero ──────────────────────────── */
function parallaxe() {
  if (REDUIT) return;
  const hero = $('.sj-hero');
  let attente = false;
  window.addEventListener('scroll', () => {
    if (attente) return;
    attente = true;
    requestAnimationFrame(() => {
      hero.style.setProperty('--sj-parallax', `${Math.min(scrollY, 900) * 0.18}px`);
      attente = false;
    });
  }, { passive: true });
}

/* ── Renvoi du contrat par email ────────────────────────────── */
// Le script limite à 3 copies en 6 h. En cas d'échec, le bouton redevient cliquable.
function renvoiContrat(jeton) {
  const btn = $('#sj-renvoi');
  const label = $('.sj-btn-label', btn);
  btn.addEventListener('click', async () => {
    if (btn.dataset.state !== 'idle') return;
    btn.dataset.state = 'loading';
    label.textContent = 'Envoi en cours…';
    let rep;
    try { rep = await appeler('renvoyer_contrat', jeton); } catch { rep = {}; }
    if (rep.success) {
      btn.dataset.state = 'done';
      label.textContent = 'Copie envoyée';
      $('#sj-renvoi-note').hidden = false;
      return;
    }
    btn.dataset.state = 'idle';
    label.textContent = rep.limite ? 'Réessayez plus tard' : 'Échec, réessayer';
  });
}

/* ── Barre du bas + feuilles (bottom sheets) ────────────────── */
// Toucher un bouton : il prend toute la largeur (l'autre glisse dehors) et sa feuille monte.
// Le retoucher, toucher le fond ou Échap : la feuille redescend et la barre se reforme.
function feuilles() {
  const dock = $('.sj-dock');
  const boutons = $$('button', dock);
  let ouverte = null;

  const fermer = () => new Promise(fin => {
    if (!ouverte) { fin(); return; }
    const feuille = ouverte;
    ouverte = null;
    feuille.dispatchEvent(new Event('fermeture'));
    delete dock.dataset.ouvert;
    boutons.forEach(b => { b.classList.remove('is-actif'); b.setAttribute('aria-expanded', 'false'); });
    document.body.style.overflow = '';
    feuille.classList.remove('is-open');
    feuille.classList.add('is-closing');
    setTimeout(() => { feuille.hidden = true; feuille.classList.remove('is-closing'); fin(); }, REDUIT ? 0 : 680);
  });

  const ouvrir = nom => {
    const feuille = $(`#sj-${nom}`);
    const bouton = $(`[data-dock="${nom}"]`, dock);
    ouverte = feuille;
    dock.dataset.ouvert = nom;
    bouton.classList.add('is-actif');
    bouton.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    feuille.dispatchEvent(new Event('ouverture'));
    feuille.hidden = false;
    requestAnimationFrame(() => feuille.classList.add('is-open'));
  };

  boutons.forEach(b => b.addEventListener('click', () => {
    const nom = b.dataset.dock;
    if (dock.dataset.ouvert === nom) fermer();
    else fermer().then(() => ouvrir(nom));
  }));
  $$('.sj-sheet [data-close]').forEach(b => b.addEventListener('click', fermer));
  $$('.sj-sheet').forEach(f => glisserPourFermer(f, fermer));
  // Boutons qui ouvrent une autre feuille (dans une feuille, ou « contactez-moi » de la carte « Lien introuvable »)
  // (écoute sur la page entière : certains de ces boutons sont ajoutés après coup, ex. « me contacter » de la caution)
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-vers]');
    if (b) fermer().then(() => ouvrir(b.dataset.vers));
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fermer(); });
}

/* ── Glisser vers le bas pour fermer (comme sur iPhone) ─────────
   Le doigt peut se poser n'importe où sur la feuille (poignée comprise), sauf
   sur un bouton, tant que son contenu est remonté tout en haut. On ferme si le geste
   dépasse 110 px ou s'il est rapide ; sinon la feuille revient en place. */
function glisserPourFermer(feuille, fermer) {
  const panneau = $('.sj-sheet-panel', feuille);
  const fond = $('.sj-sheet-backdrop', feuille);
  let y0 = null, dy = 0, actif = false;
  let yPrec = 0, tPrec = 0, vitesse = 0;               // pour mesurer la vitesse du dernier mouvement

  const relacher = () => {
    feuille.classList.remove('is-touch');
    panneau.style.transition = fond.style.transition = '';
    panneau.style.transform = fond.style.opacity = '';
  };

  panneau.addEventListener('touchstart', e => {
    // Pas sur un bouton ou un lien (maintenir « SMS » ne doit pas animer la poignée)
    if (e.touches.length !== 1 || panneau.scrollTop > 0 || e.target.closest('a, button, input, label')) { y0 = null; return; }
    y0 = yPrec = e.touches[0].clientY; tPrec = performance.now(); dy = vitesse = 0; actif = false;
    feuille.classList.add('is-touch');                   // la poignée s'allume dès le contact
  }, { passive: true });

  panneau.addEventListener('touchmove', e => {
    if (y0 === null) return;
    const y = e.touches[0].clientY, t = performance.now();
    if (t > tPrec) { vitesse = (y - yPrec) / (t - tPrec); yPrec = y; tPrec = t; }   // px par ms
    dy = y - y0;
    if (!actif) {
      if (dy < -6) { y0 = null; feuille.classList.remove('is-touch'); return; }   // vers le haut : on laisse défiler
      if (dy < 8) return;
      actif = true;
      panneau.style.transition = fond.style.transition = 'none';
    }
    e.preventDefault();
    const d = Math.max(0, dy);
    panneau.style.transform = `translateY(${d}px)`;
    fond.style.opacity = String(Math.max(0, 1 - d / panneau.offsetHeight));
  }, { passive: false });

  const fin = () => {
    if (y0 === null) return;
    y0 = null;
    if (!actif) { feuille.classList.remove('is-touch'); return; }
    if (performance.now() - tPrec > 120) vitesse = 0;     // doigt resté immobile avant de lâcher
    relacher();
    if (dy > 110 || vitesse > 0.6) fermer();
  };
  panneau.addEventListener('touchend', fin);
  panneau.addEventListener('touchcancel', fin);
}

/* ── Annulation : étapes de la feuille + bouton à maintenir ─── */
function annulation(r, jeton) {
  const modal = $('#sj-annuler');
  const etape = nom => $$('.sj-sheet-step', modal).forEach(s => { s.hidden = s.dataset.step !== nom; });
  // À chaque ouverture, on repart de l'explication (qui contient le bouton à maintenir)
  modal.addEventListener('ouverture', () => { if (r.statut !== 'ANNULEE') etape('info'); });

  const hold = $('#sj-hold');
  const DUREE = 1600;
  let debut = 0, raf = 0, fini = false;
  const stop = () => {
    cancelAnimationFrame(raf);
    hold.classList.remove('is-holding');
    if (!fini) hold.style.setProperty('--hold', 0);
  };
  const boucle = t => {
    const p = Math.min((t - debut) / DUREE, 1);
    hold.style.setProperty('--hold', p);
    if (p < 1) { raf = requestAnimationFrame(boucle); return; }
    fini = true;
    if (navigator.vibrate) navigator.vibrate(40);
    confirmer();
  };
  const go = e => {
    if (fini) return;
    e.preventDefault();
    hold.classList.add('is-holding');
    debut = performance.now();
    raf = requestAnimationFrame(boucle);
  };
  hold.addEventListener('pointerdown', go);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => hold.addEventListener(ev, stop));
  // Clavier : Entrée ou Espace maintenus
  hold.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) go(e); });
  hold.addEventListener('keyup', stop);

  async function confirmer() {
    etape('loading');
    let rep;
    try { rep = await appeler('annuler_sejour', jeton); }
    catch { rep = { message: "Le service n'a pas répondu : votre séjour n'est pas annulé. Vérifiez votre connexion et réessayez, ou contactez-moi." }; }
    if (!rep.success) {
      remplir('annulErreur', rep.message || "Votre séjour n'est pas annulé. Réessayez dans un instant ou contactez-moi.");
      etape('erreur');
      fini = false;                                       // on pourra réessayer à la prochaine ouverture
      hold.style.setProperty('--hold', 0);
      return;
    }
    r.statut = 'ANNULEE';
    r.annuleLe = heureLocal(rep.annuleLe) || new Date();
    r.rembourse = rep.rembourse ?? r.montant;
    remplir('rembourseTexte', prixTexte(r.rembourse));
    etape('done');
    // Feuille déjà refermée pendant le chargement (glissé, Échap…) : on bascule tout de suite
    if (!modal.classList.contains('is-open')) basculer();
  }

  // La page s'efface et laisse place à la carte « Séjour annulé »
  function basculer() {
    if (document.body.classList.contains('is-annulee')) return;
    const page = $('.sj-layout');
    page.classList.add('is-leaving');
    setTimeout(() => {
      page.classList.remove('is-leaving');
      afficher(r);
      window.scrollTo({ top: 0 });
    }, REDUIT ? 0 : 600);
  }
  modal.addEventListener('fermeture', () => { if (r.statut === 'ANNULEE') basculer(); });
}

/* ── Pas de zoom (pincement, double tap) sur téléphone ──────── */
function sansZoom() {
  // Safari iPhone ignore « user-scalable=no » : on bloque le pincement ici
  ['gesturestart', 'gesturechange'].forEach(ev =>
    document.addEventListener(ev, e => e.preventDefault(), { passive: false }));
}

/* ── Billet : place l'arc pour que ses bouts tombent au milieu des dates ── */
function placerTrajet() {
  const zone = $('.sj-ticket-top'), jour = $('.sj-ticket-day'), trajet = $('.sj-ticket-path'), svg = $('svg', trajet);
  const caler = () => {
    const z = zone.getBoundingClientRect(), j = jour.getBoundingClientRect(), s = svg.getBoundingClientRect();
    const milieuDate = j.top + j.height / 2 - z.top;               // milieu du chiffre dans le billet
    trajet.style.top = `${milieuDate - s.height * (50 / 56)}px`;  // 50/56 = hauteur des bouts dans le dessin
  };
  caler();
  window.addEventListener('resize', caler);
  if (document.fonts) document.fonts.ready.then(caler);            // la police change la taille des chiffres
}

/* ── Logo de l'en-tête : remonte en haut (propre à cette page) ── */
function logoHautDePage() {
  $('.site-header .brand').addEventListener('click', e => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: REDUIT ? 'auto' : 'smooth' });
  });
}

/* ── Démarrage ──────────────────────────────────────────────── */
export async function initMaReservation() {
  const jeton = new URLSearchParams(location.search).get('r') || '';
  sansZoom();
  logoHautDePage();
  feuilles();

  // La photo du hero se charge pendant qu'on interroge le script
  const img = $('.sj-hero-img');
  const photo = new Promise(fin => {
    if (img.complete) { fin(); return; }
    img.addEventListener('load', fin, { once: true });
    setTimeout(fin, 2500);
  });
  const pret = () => requestAnimationFrame(() => document.body.classList.add('is-ready'));

  let d = null;
  if (jeton) {
    try { d = await charger(jeton); } catch { d = { statut: 'ERREUR' }; }
  }
  if (!d || d.statut === 'INCONNUE' || (d.statut !== 'CONFIRMEE' && d.statut !== 'ANNULEE')) {
    erreur(d && d.statut === 'ERREUR' ? 'connexion' : 'lien');
    pret();
    return;
  }

  const r = depuisScript(d);
  afficher(r);
  if (r.statut === 'CONFIRMEE') {
    decouperTitre();          // après afficher() : le prénom est déjà dans le titre
    apparitions();
    cartesInteractives();
    parallaxe();
    renvoiContrat(jeton);
    annulation(r, jeton);
    placerTrajet();
    const billet = $('.sj-ticket');
    billet.addEventListener('click', () => hocherLaTete(billet));
  }
  await photo;
  setTimeout(pret, 200);      // laisse la photo s'afficher avant le lever de rideau
}
