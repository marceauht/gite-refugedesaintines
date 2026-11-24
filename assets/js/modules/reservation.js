/* ============================================================
   RESERVATION.JS — Formulaire de réservation en ligne
   Le Refuge de Saintines
   ============================================================ */

import { initTelephone } from './resaTelephone.js';
import { initAdresse }   from './resaAdresse.js';
import { initContrat }   from './resaContrat.js';
import { initVoile, encadreErreur, appeler, occuper, cercle, fantomeCalendrier, bandeau,
         messagerie, messageSaison, sejourCourt, pause } from './resaAttente.js';

// Déploiement « en ligne » (utilisé par le vrai site) et déploiement « Test » (utilisé
// seulement quand le site est ouvert en local ou via ngrok, pour tester sans risque)
const SCRIPT_URL_PROD = 'https://script.google.com/macros/s/AKfycbw6aFGeNvbqPr7RLyp4zthNr0xUPTOJdnPDed1HFZWOOk2HGvMyat_mHn4hUDTHSClAMA/exec';
const SCRIPT_URL_TEST = 'https://script.google.com/macros/s/AKfycbw2lk2rph45wG62U2ZB-VnhE0GhrGUPHsfjOGUxxX5RzNpyfJ4HDm-EHj4hmvFeVXdxTQ/exec';
// Test : localhost, adresse du réseau local (192.168…, 10…), ngrok, ou « ?test » ajouté à l'adresse
const EN_TEST         = /^(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)$|ngrok/.test(location.hostname)
                        || new URLSearchParams(location.search).has('test');
export const SCRIPT_URL = EN_TEST ? SCRIPT_URL_TEST : SCRIPT_URL_PROD;   // aussi utilisé par maReservation.js
const HEURE_LIMITE_JOUR_MEME = 11;   // réservation pour le soir même possible jusqu'à 11 h (heure de Paris)
const TARIF_NUIT     = 58;
const FRAIS_MENAGE   = 30;
const FRAIS_LINGE    = 10;   // une fois par séjour dès 3 voyageurs (adultes + enfants ; bébés de moins de 2 ans non comptés)
// Taxe de séjour, comprise dans le prix (mêmes réglages que l'onglet Paramètres du Sheet) :
// % du prix de la nuit par personne, payée par les adultes seulement, plafond par personne et par nuit (0 = aucun)
const TAXE_TAUX          = 5;
const TAXE_PLAFOND       = 4;
const TAXE_ADDITIONNELLE = 0;   // taxe additionnelle départementale, en %

export function initReservation() {
  const form      = document.getElementById('reservation-form');
  if (!form) return;

  const prixBox   = document.getElementById('resa-price');
  const contactBox= document.getElementById('resa-contact');
  const submitWrap= document.getElementById('resa-submit-wrap');
  const submitBtn = document.getElementById('resa-submit-btn');
  const status    = document.getElementById('resa-status');

  let nbAdultes = 1, nbEnfants = 0, nbBebes = 0;
  let fpArrivee = null, fpDepart = null;
  let selectedArrivee = null, selectedDepart = null;

  // ── Chargement des dates bloquées puis init Flatpickr ──
  // nuitsBloquees : ensemble des nuits prises, au format AAAA-MM-JJ (la nuit du 10 = du 10 au 11)
  let nuitsBloquees = new Set();
  const inputArrivee = document.getElementById('date-arrivee');
  const inputDepart  = document.getElementById('date-depart');
  const datesGrid    = document.querySelector('.resa-dates-grid');
  const calStatus    = document.createElement('p');
  calStatus.className = 'form-status resa-cal-status att-cal-msg';
  calStatus.setAttribute('aria-live', 'polite');
  datesGrid.after(calStatus);
  const voile      = initVoile();                              // voile pleine page (paiement, retour de Stripe)
  const zoneErreur = document.getElementById('resa-erreur');   // encadré d'erreur au-dessus du bouton « Payer »
  let fantome = null, calErreur = null, chargementEnCours = null;

  initPickers();
  chargerDisponibilites();

  // ── Coordonnées et contrat ──────────────────────────────
  const champPrenom = document.getElementById('resa-prenom');
  const champNom    = document.getElementById('resa-nom');
  const champEmail  = document.getElementById('resa-email');
  const champTel    = document.getElementById('resa-tel');
  const aideTel     = document.getElementById('resa-tel-aide');
  const caseCgv     = document.getElementById('consent-cgv');
  const telephone   = initTelephone(champTel, aideTel);
  const EMAIL_OK    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const adresse     = initAdresse();
  let prix = null;   // dernier prix calculé (affiché, et repris dans le contrat)

  // Prénom : majuscule au début de chaque partie (« jean-pierre » → « Jean-Pierre ») ; nom en majuscules
  const majusculesPrenom = t => t.toLocaleLowerCase('fr').replace(/(^|[\s'’-])(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase('fr'));
  mettreEnForme(champPrenom, majusculesPrenom);
  mettreEnForme(champNom, t => t.toLocaleUpperCase('fr'));
  function mettreEnForme(champ, regle) {
    champ.addEventListener('input', () => {
      const pos = champ.selectionStart;
      champ.value = regle(champ.value);
      champ.setSelectionRange(pos, pos);
    });
  }

  const contrat = initContrat({
    donnees: donneesContrat,
    // Coordonnées incomplètes : les champs manquants sont signalés ; sinon (contrat non chargé) message
    signalerErreur: msg => { if (verifierChamps({ cases: false })) showStatus(msg, 'error'); },
    surAcceptation: majBouton
  });
  // Une information du contrat qui change → le contrat accepté n'est plus à jour
  [champPrenom, champNom, champEmail, champTel, document.getElementById('resa-lit')].forEach(c => c.addEventListener('input', () => contrat.reinitialiser()));
  adresse.surChangement(() => contrat.reinitialiser());
  caseCgv.addEventListener('change', majBouton);
  majBouton();

  // Email et téléphone mal saisis : signalés dès que le voyageur quitte le champ
  // (contour rouge + message, sans tremblement : il est réservé au clic sur « Payer »)
  champEmail.addEventListener('blur', () => {
    const v = champEmail.value.trim();
    if (v && !EMAIL_OK.test(v)) signalerChamp(champEmail, 'Adresse email invalide', null, false);
  });
  const verifierTel = () => {
    const t = telephone.manque();
    if (!champTel.value.trim()) return;
    if (t) signalerChamp(champTel, t.message, aideTel, false);
    else champTel.dispatchEvent(new Event('change'));          // numéro bon : efface l'erreur
  };
  champTel.addEventListener('blur', () => setTimeout(verifierTel));   // après la remise en forme du numéro
  champTel.addEventListener('countrychange', () => { if (champTel.classList.contains('champ-invalide')) verifierTel(); });

  // Le bouton de paiement paraît inactif tant que les deux cases ne sont pas cochées
  function majBouton() {
    contrat.reinitialiser();
    submitBtn.classList.toggle('is-inactif', !(contrat.accepte() && caseCgv.checked));
    if (contrat.accepte() && caseCgv.checked) showStatus('', '');
  }

  // Informations reprises dans le contrat pré-rempli
  function donneesContrat() {
    const manque = [];
    if (!champPrenom.value.trim()) manque.push('votre prénom');
    if (!champNom.value.trim()) manque.push('votre nom');
    if (!EMAIL_OK.test(champEmail.value.trim())) manque.push('votre email');
    if (!telephone.valeur()) manque.push('votre téléphone');
    if (!adresse.valeur()) manque.push('votre adresse');
    if (!prix) return { erreur: 'Choisissez d\'abord vos dates de séjour.' };
    if (manque.length) return { erreur: 'Pour lire votre contrat pré-rempli, indiquez d\'abord ' + manque.join(', ').replace(/, ([^,]*)$/, ' et $1') + '.' };
    const limite = new Date(selectedArrivee); limite.setDate(limite.getDate() - 7);
    return {
      prenom: champPrenom.value.trim(), nom: champNom.value.trim(), email: champEmail.value.trim(),
      telephone: telephone.valeur(), adresse: adresse.valeur(),
      nuits: prix.nbNuits, arrivee: formatDate(selectedArrivee), depart: formatDate(selectedDepart),
      occupants: libelleOccupants(), lit: document.getElementById('resa-lit').checked,
      linge: prix.linge > 0, total: euros(prix.total), taxe: euros(prix.taxe),
      dateLimite: formatDate(limite), aujourdhui: formatDate(new Date())
    };
  }

  function libelleOccupants() {
    const pl = (n, mot) => n + ' ' + mot + (n > 1 ? 's' : '');
    return [pl(nbAdultes, 'adulte'), pl(nbEnfants, 'enfant') + ' de 2 ans et plus', pl(nbBebes, 'bébé') + ' de moins de 2 ans'].join(', ');
  }

  // ── Disponibilités ──────────────────────────────────────
  // Pendant le chargement : reflet sur les champs de date, calendrier fantôme qui clignote et
  // phrase avec un cercle qui tourne. Échec : nouvel essai 3 s plus tard, puis encadré
  // « Le calendrier ne répond pas » (le calendrier reste bloqué : jamais de dates libres par erreur).
  // Renvoie une promesse (true si chargé), réutilisée au retour de Stripe.
  function chargerDisponibilites(opts = {}) {
    chargementEnCours = chargerDisponibilitesInterne(opts);
    return chargementEnCours;
  }
  async function chargerDisponibilitesInterne({ depuisEncadre = false } = {}) {
    if (!depuisEncadre) etatCalendrier('chargement');
    const essais = depuisEncadre ? 1 : 2;
    for (let essai = 1; essai <= essais; essai++) {
      try {
        const ctrl  = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 20000);
        const resp  = await fetch(SCRIPT_URL + '?action=blocked_dates', { redirect: 'follow', signal: ctrl.signal });
        clearTimeout(timer);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const json = await resp.json();
        if (!Array.isArray(json.blocked)) throw new Error('Réponse inattendue');

        nuitsBloquees = new Set();
        json.blocked.forEach(b => {
          // Chaque nuit de l'arrivée (incluse) au départ (exclu) est prise
          const d   = new Date(b.from + 'T00:00:00');
          const fin = new Date(b.to + 'T00:00:00');
          while (d < fin) { nuitsBloquees.add(isoDate(d)); d.setDate(d.getDate() + 1); }
        });
        etatCalendrier('pret');
        return true;
      } catch (err) {
        console.error('Erreur chargement des disponibilités :', err);
        if (essai < essais) await pause(3000);
      }
    }
    etatCalendrier('erreur');
    return false;
  }

  // État du calendrier : chargement | pret | erreur
  function etatCalendrier(etat) {
    [inputArrivee, inputDepart].forEach(i => { i.disabled = etat !== 'pret'; });
    datesGrid.classList.toggle('is-chargement', etat === 'chargement');
    calErreur?.remove();
    calErreur = null;
    if (etat === 'chargement') {
      calStatus.innerHTML = cercle() + '<span>On ouvre le carnet de réservations…</span>';
      if (!fantome) { fantome = fantomeCalendrier(); calStatus.after(fantome); }
      return;
    }
    // Le calendrier fantôme se replie en douceur
    if (fantome) { const f = fantome; fantome = null; f.classList.add('is-fini'); setTimeout(() => f.remove(), 700); }
    if (etat === 'pret') {
      calStatus.innerHTML = '<span>Choisissez vos dates : les nuits barrées sont déjà prises.</span>'
        + (EN_TEST ? '<span class="att-cal-test">Mode test : script de test utilisé</span>' : '');
      fpArrivee.redraw(); fpDepart.redraw();
      return;
    }
    calStatus.innerHTML = '';
    calErreur = encadreErreur({
      icone: 'calendrier',
      titre: 'Le calendrier ne répond pas',
      texte: 'Ce n’est pas vous, c’est lui. Les disponibilités n’ont pas pu être chargées.',
      actions: [
        { texte: 'Réessayer', primaire: true, clic: (e, b) => { occuper(b, 'Nouvel essai'); chargerDisponibilites({ depuisEncadre: true }); } },
        appeler()
      ]
    });
    calErreur.classList.add('resa-cal-erreur');
    calStatus.after(calErreur);
  }

  // Premier jour d'arrivée possible : aujourd'hui avant 11 h (heure de Paris), sinon demain
  function premiereArrivee() {
    const heureParis = Number(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
    const d = new Date(); d.setHours(0, 0, 0, 0);
    if (heureParis >= HEURE_LIMITE_JOUR_MEME) d.setDate(d.getDate() + 1);
    return d;
  }

  // Départ possible jusqu'à la première nuit prise après l'arrivée (ce jour-là inclus :
  // on peut partir le matin où un autre voyageur arrive l'après-midi)
  function departMax(arrivee) {
    const d = new Date(arrivee);
    for (let i = 0; i < 400; i++) {
      d.setDate(d.getDate() + 1);
      if (nuitsBloquees.has(isoDate(d))) return d;
    }
    return d;
  }

  function initPickers() {
    const commonOpts = {
      locale:     'fr',
      dateFormat: 'd/m/Y',
      disableMobile: true,
      position:   placerCalendrier,
      // Année choisie dans une liste (5 ans) au lieu des petites flèches
      onReady(sel, str, fp) { ajouterListeAnnees(fp); },
      onMonthChange(sel, str, fp) { majListeAnnees(fp); },
      onYearChange(sel, str, fp) { majListeAnnees(fp); }
    };

    fpArrivee = flatpickr(inputArrivee, {
      ...commonOpts,
      minDate: premiereArrivee(),
      // Arrivée impossible un soir où la nuit est déjà prise
      disable: [date => nuitsBloquees.has(isoDate(date))],
      onOpen() { fpArrivee.set('minDate', premiereArrivee()); },
      onChange(selected) {
        selectedArrivee = selected[0] || null;
        if (selectedArrivee) {
          const nextDay = new Date(selectedArrivee);
          nextDay.setDate(nextDay.getDate() + 1);
          fpDepart.set('minDate', nextDay);
          fpDepart.set('maxDate', departMax(selectedArrivee));
          // Départ déjà choisi devenu impossible : on l'efface
          if (selectedDepart && (selectedDepart <= selectedArrivee || selectedDepart > departMax(selectedArrivee))) {
            fpDepart.clear();
            selectedDepart = null;
          }
          if (!selectedDepart) setTimeout(() => fpDepart.open(), 0);
        }
        updateForm();
      }
    });

    fpDepart = flatpickr(inputDepart, {
      ...commonOpts,
      minDate: premiereArrivee(),
      // Tant que l'arrivée n'est pas choisie, on ouvre d'abord le calendrier d'arrivée
      onOpen() {
        if (!selectedArrivee) { fpDepart.close(); fpArrivee.open(); }
      },
      onChange(selected) {
        selectedDepart = selected[0] || null;
        updateForm();
      }
    });

    [fpArrivee, fpDepart].forEach(fp => fp.config.onOpen.push(() => majListeAnnees(fp)));
    fpDepart.config.onOpen.push(majLimiteDepart);
  }

  // Liste des années : de l'année minimale à 4 ans plus tard (ou jusqu'à la date maximale)
  function ajouterListeAnnees(fp) {
    const zone = fp.calendarContainer.querySelector('.numInputWrapper');
    if (!zone) return;
    const liste = document.createElement('select');
    liste.className = 'resa-cal-annee';
    liste.setAttribute('aria-label', 'Année');
    liste.addEventListener('change', () => fp.changeYear(Number(liste.value)));
    zone.hidden = true;
    zone.after(liste);
    fp.listeAnnees = liste;
    majListeAnnees(fp);
  }
  function majListeAnnees(fp) {
    const liste = fp.listeAnnees;
    if (!liste) return;
    const debut = (fp.config.minDate || new Date()).getFullYear();
    let fin = debut + 4;
    if (fp.config.maxDate) fin = Math.min(fin, fp.config.maxDate.getFullYear());
    const voulu = [];
    for (let a = debut; a <= fin; a++) voulu.push(a);
    if (liste.options.length !== voulu.length || Number(liste.options[0]?.value) !== debut) {
      liste.innerHTML = voulu.map(a => `<option value="${a}">${a}</option>`).join('');
    }
    liste.value = fp.currentYear;
  }

  // Sous le calendrier de départ : date de départ la plus tardive quand le logement est réservé ensuite
  function majLimiteDepart() {
    let note = fpDepart.calendarContainer.querySelector('.resa-cal-limite');
    if (!note) {
      note = document.createElement('p');
      note.className = 'resa-cal-limite';
      fpDepart.calendarContainer.append(note);
    }
    const max = selectedArrivee ? departMax(selectedArrivee) : null;
    const proche = max && (max - selectedArrivee) / 86400000 <= 62;
    note.hidden = !proche;
    if (proche) {
      const jour = max.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      note.textContent = `Départ au plus tard le ${jour} : le logement est déjà réservé ensuite.`;
    }
  }

  // Calendrier toujours centré sous son champ, sans dépasser du bord de l'écran.
  // S'il n'y a pas la place en bas de l'écran, la page descend un peu pour le montrer en entier.
  function placerCalendrier(fp) {
    const cal = fp.calendarContainer;
    if (!cal) return;
    const champ = fp._positionElement || fp.input;
    const r = champ.getBoundingClientRect();
    const largeur = cal.offsetWidth, hauteur = cal.offsetHeight;
    const marge = 8;
    let gauche = r.left + (r.width - largeur) / 2;
    gauche = Math.max(marge, Math.min(gauche, document.documentElement.clientWidth - largeur - marge));
    cal.style.left  = (window.pageXOffset + gauche) + 'px';
    cal.style.right = 'auto';
    cal.style.top   = (window.pageYOffset + r.bottom + 6) + 'px';
    const depasse = r.bottom + 6 + hauteur + 12 - window.innerHeight;
    if (depasse > 0) window.scrollBy({ top: Math.min(depasse, r.top - 90), behavior: 'smooth' });
  }

  // ── Compteurs voyageurs ─────────────────────────────────
  // compteDansMax = false : le compteur n'est pas limité par les 4 voyageurs max (bébés)
  function makeCounter(minusId, plusId, countId, get, set, min, compteDansMax = true) {
    document.getElementById(minusId).addEventListener('click', () => {
      if (get() > min) {
        set(get() - 1);
        document.getElementById(countId).textContent = get();
        updateForm();
      }
    });
    document.getElementById(plusId).addEventListener('click', () => {
      if (!compteDansMax || nbAdultes + nbEnfants < 4) {
        set(get() + 1);
        document.getElementById(countId).textContent = get();
        updateForm();
      }
    });
  }

  makeCounter('adulte-minus','adulte-plus','adulte-count', ()=>nbAdultes, v=>nbAdultes=v, 1);
  makeCounter('enfant-minus','enfant-plus','enfant-count', ()=>nbEnfants, v=>nbEnfants=v, 0);
  makeCounter('bebe-minus',  'bebe-plus',  'bebe-count',   ()=>nbBebes,   v=>nbBebes=v,   0, false);

  // ── Calcul prix et affichage ────────────────────────────
  function updateForm() {
    // Le lit parapluie n'est proposé que s'il y a un bébé
    const litRow = document.getElementById('resa-lit-row');
    litRow.hidden = nbBebes === 0;
    if (nbBebes === 0) document.getElementById('resa-lit').checked = false;

    if (!selectedArrivee || !selectedDepart || selectedDepart <= selectedArrivee) {
      prixBox.hidden = contactBox.hidden = submitWrap.hidden = true;
      prix = null;
      contrat.reinitialiser();
      return;
    }

    const nbNuits        = Math.round((selectedDepart - selectedArrivee) / 86400000);
    const prixNuits      = nbNuits * TARIF_NUIT;
    const nbPayants      = nbAdultes + nbEnfants;
    // Linge du canapé-lit : 10 € une fois par séjour dès 3 voyageurs (adultes + enfants)
    const linge          = nbPayants >= 3 ? FRAIS_LINGE : 0;
    const total          = prixNuits + FRAIS_MENAGE + linge;

    document.getElementById('price-nuits').textContent     = nbNuits + ' nuit' + (nbNuits > 1 ? 's' : '') + ' × ' + TARIF_NUIT + ' €';
    document.getElementById('price-nuits-val').textContent = prixNuits + ' €';

    document.getElementById('price-row-linge').hidden = linge === 0;
    document.getElementById('price-linge-val').textContent = linge + ' €';

    const rowBebes = document.getElementById('price-row-bebes');
    rowBebes.hidden = nbBebes === 0;
    if (nbBebes > 0) document.getElementById('price-bebes').textContent = nbBebes + (nbBebes > 1 ? ' bébés' : ' bébé') + ' (- 2 ans)';

    document.getElementById('price-total-val').textContent = total + ' €';
    // Comme le ménage, le linge n'entre pas dans le calcul de la taxe (même calcul que le script)
    const taxe = taxeSejour(TARIF_NUIT, nbNuits, nbAdultes, nbPayants + nbBebes);
    document.getElementById('price-taxe').textContent = 'dont taxe de séjour ' + euros(taxe);
    prix = { nbNuits, total, taxe, linge };

    document.getElementById('hidden-nuits').value     = nbNuits;
    document.getElementById('hidden-arrivee').value   = formatDate(selectedArrivee);
    document.getElementById('hidden-depart').value    = formatDate(selectedDepart);

    prixBox.hidden = contactBox.hidden = submitWrap.hidden = false;
    contrat.reinitialiser();
  }

  // ── Champs manquants ────────────────────────────────────
  // Chaque champ manquant : contour rouge, petit tremblement, « Champ obligatoire » en dessous.
  // La page remonte jusqu'au premier. Renvoie true si tout est rempli.
  function verifierChamps({ cases }) {
    const erreurs = [];
    const ajouter = (champ, message = 'Champ obligatoire', zone = null) => erreurs.push({ champ, message, zone });
    if (!selectedArrivee) ajouter(inputArrivee);
    if (!selectedDepart)  ajouter(inputDepart);
    if (!champPrenom.value.trim()) ajouter(champPrenom);
    if (!champNom.value.trim())    ajouter(champNom);
    const email = champEmail.value.trim();
    if (!email) ajouter(champEmail);
    else if (!EMAIL_OK.test(email)) ajouter(champEmail, 'Adresse email invalide');
    const tel = telephone.manque();
    if (tel) ajouter(champTel, tel.message, aideTel);
    const adr = adresse.manque();
    if (adr) ajouter(adr.champ, adr.message);
    if (cases) {
      contrat.reinitialiser();
      // Cases : seulement le contour rouge, sans message
      if (!contrat.accepte()) ajouter(document.getElementById('consent-contrat'), null);
      if (!caseCgv.checked)   ajouter(caseCgv, null);
    }
    erreurs.forEach(e => signalerChamp(e.champ, e.message, e.zone));
    if (erreurs.length) {
      showStatus('', '');
      const premier = erreurs[0].champ.closest('.form-group, .consent-row, .resa-section') || erreurs[0].champ;
      premier.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return !erreurs.length;
  }

  function signalerChamp(champ, message, zone, trembler = true) {
    const cadre = champ.closest('.iti') || champ;
    const ligne = champ.closest('.consent-row');
    let msg = zone;
    if (!msg && message !== null) {
      const apres = ligne || cadre;
      msg = apres.nextElementSibling?.classList.contains('champ-erreur') ? apres.nextElementSibling : null;
      if (!msg) {
        msg = document.createElement('p');
        msg.className = 'champ-erreur';
        msg.setAttribute('role', 'alert');
        apres.after(msg);
      }
    }
    if (msg) {
      msg.textContent = message;
      msg.classList.add('is-erreur');
      msg.hidden = false;
    }
    champ.classList.add('champ-invalide');
    champ.setAttribute('aria-invalid', 'true');
    // Le tremblement repart à chaque clic sur « Payer »
    cadre.classList.remove('champ-tremble');
    if (trembler) { void cadre.offsetWidth; cadre.classList.add('champ-tremble'); }
    // Dès que le voyageur corrige le champ, l'erreur disparaît
    const effacer = () => {
      champ.classList.remove('champ-invalide');
      champ.removeAttribute('aria-invalid');
      if (zone) { zone.textContent = ''; zone.classList.remove('is-erreur'); } else msg?.remove();
      champ.removeEventListener('input', effacer);
      champ.removeEventListener('change', effacer);
    };
    champ.addEventListener('input', effacer);
    champ.addEventListener('change', effacer);
  }

  // ── Soumission ──────────────────────────────────────────
  // Le bouton tourne une fraction de seconde, puis un voile pleine page prend le relais pendant
  // que le script prépare la page Stripe (3 à 8 s). Le voile reste au moins 1,5 s pour ne pas clignoter.
  const MESSAGES_PREPARATION = [
    'On vérifie que personne n’a pris vos dates entre-temps…',
    'On fait le lit au carré…',
    'On glisse votre contrat sous la porte…'
  ];
  const TEXTE_BOUTON = 'Payer et réserver →';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const honey = form.querySelector('input[name="website"]');
    if (honey && honey.value) return;

    if (!verifierChamps({ cases: true })) return;

    effacerErreurEnvoi();
    showStatus('', '');
    occuper(submitBtn, 'Payer et réserver');

    const data = new FormData();
    data.append('prenom',       champPrenom.value.trim());
    data.append('nom',          champNom.value.trim());
    data.append('email',        champEmail.value.trim());
    data.append('telephone',    telephone.valeur());   // ex. +33 6 73 73 53 18
    data.append('adresse',      adresse.valeur());     // ex. 12 Rue de la Gare, 60410 Saintines, France
    data.append('date_arrivee', document.getElementById('hidden-arrivee').value);
    data.append('date_depart',  document.getElementById('hidden-depart').value);
    data.append('nb_nuits',     document.getElementById('hidden-nuits').value);
    data.append('nb_adultes',   nbAdultes);
    data.append('nb_enfants',   nbEnfants);
    data.append('nb_bebes',     nbBebes);
    data.append('lit_parapluie', document.getElementById('resa-lit').checked ? 'oui' : 'non');
    data.append('consentement', 'oui');
    data.append('notes',        '');
    // Le script choisit Stripe test ou réel, et renvoie le voyageur sur cette page après paiement
    data.append('mode',         EN_TEST ? 'test' : 'reel');
    data.append('retour',       location.origin + location.pathname);

    await pause(400);
    const debut = Date.now();
    voile.afficher(ecranPreparation());

    let json = null, horsLigne = false;
    try {
      const resp = await fetch(SCRIPT_URL, { method: 'POST', body: data });
      json = await resp.json();
    } catch {
      horsLigne = true;
    }
    const reste = 1500 - (Date.now() - debut);
    if (reste > 0) await pause(reste);

    if (json && json.success && json.url) {
      memoriser(json.ref);             // pour remplir à nouveau le formulaire si le paiement est annulé
      await voile.afficher(ecranRedirection());
      await pause(900);
      location.href = json.url;        // page de paiement Stripe (les dates sont bloquées 30 min)
      return;
    }
    await voile.fermer();
    reinitBouton();
    erreurEnvoi(horsLigne ? 'connexion' : typeErreur(json && json.message));
  });

  function ecranPreparation() {
    return { icone: 'maison', titre: 'Un instant', points: true, messages: MESSAGES_PREPARATION,
             note: { icone: 'cadenas', texte: 'Rien n’est prélevé pour l’instant' } };
  }
  function ecranRedirection() {
    return { icone: 'maison', titre: 'C’est presque prêt', points: true,
             message: 'Votre page de paiement se fait belle, encore une seconde…',
             note: { icone: 'cadenas', texte: 'Paiement sécurisé par Stripe' } };
  }

  function reinitBouton() {
    submitBtn.classList.remove('is-occupe');
    submitBtn.textContent = TEXTE_BOUTON;
  }

  // ── Erreur après le clic sur « Payer » ──────────────────
  // Encadré centré juste au-dessus du bouton ; le titre et les boutons dépendent du cas.
  function typeErreur(message) {
    const m = String(message || '');
    if (/déjà réservées/i.test(m)) return 'dates';
    if (/jour même/i.test(m))      return 'jourMeme';
    return 'autre';
  }

  function erreurEnvoi(type) {
    const choisirDates = {
      texte: 'Choisir d’autres dates', primaire: true,
      clic: () => {
        effacerErreurEnvoi();
        fpArrivee.clear(); fpDepart.clear();
        selectedArrivee = selectedDepart = null;
        updateForm();
        datesGrid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => { if (!inputArrivee.disabled) fpArrivee.open(); }, 600);
      }
    };
    const reessayer = { texte: 'Réessayer', primaire: true, clic: () => { effacerErreurEnvoi(); form.requestSubmit(); } };
    const ecrans = {
      dates:     { icone: 'calendrier', titre: 'Ces dates viennent d’être réservées',
                   texte: 'Quelqu’un a été plus rapide. Pas d’inquiétude, vous n’avez rien payé.', actions: [choisirDates] },
      jourMeme:  { icone: 'calendrier', titre: 'Trop tard pour ce soir',
                   texte: 'Les arrivées le jour même sont possibles jusqu’à 11 h. Choisissez une autre date d’arrivée. Pas d’inquiétude, vous n’avez rien payé.', actions: [choisirDates] },
      connexion: { icone: 'connexion', titre: 'La connexion a été coupée',
                   texte: 'Votre réservation n’est pas partie et rien n’a été prélevé. Vérifiez votre connexion puis réessayez.', actions: [reessayer, appeler()] },
      autre:     { icone: 'alerte', titre: 'Une erreur est survenue',
                   texte: 'Votre réservation n’est pas partie et vous n’avez rien payé. Réessayez dans un instant ou appelez-moi.', actions: [reessayer, appeler()] }
    };
    if (type === 'dates') chargerDisponibilites();      // les nuits prises entre-temps apparaissent barrées
    zoneErreur.replaceChildren(encadreErreur(ecrans[type] || ecrans.autre));
    zoneErreur.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function effacerErreurEnvoi() { zoneErreur.replaceChildren(); }

  // ── Mémoire du formulaire pendant le paiement ───────────
  // Avant de partir chez Stripe, le formulaire est gardé dans l'onglet (sessionStorage) :
  // s'il revient sans payer, il retrouve tout rempli. Effacé dès que la réservation est confirmée.
  const CLE_MEMOIRE = 'lrds-resa-en-cours';
  function memoriser(ref) {
    const d = {
      ref: ref || '', arrivee: isoDate(selectedArrivee), depart: isoDate(selectedDepart),
      adultes: nbAdultes, enfants: nbEnfants, bebes: nbBebes, lit: document.getElementById('resa-lit').checked,
      prenom: champPrenom.value.trim(), nom: champNom.value.trim(), email: champEmail.value.trim(),
      telephone: telephone.valeur(), adresse: adresse.valeur(), cgv: caseCgv.checked, contrat: contrat.accepte()
    };
    try { sessionStorage.setItem(CLE_MEMOIRE, JSON.stringify(d)); } catch {}
  }
  function relire() {
    try { return JSON.parse(sessionStorage.getItem(CLE_MEMOIRE) || 'null'); } catch { return null; }
  }
  function oublierRef() {
    const d = relire();
    if (!d || !d.ref) return;
    d.ref = '';
    try { sessionStorage.setItem(CLE_MEMOIRE, JSON.stringify(d)); } catch {}
  }
  function oublier() { try { sessionStorage.removeItem(CLE_MEMOIRE); } catch {} }

  // Remet le formulaire comme avant le paiement. Renvoie true si les dates sont toujours libres.
  async function restaurer(d) {
    nbAdultes = d.adultes || 1; nbEnfants = d.enfants || 0; nbBebes = d.bebes || 0;
    document.getElementById('adulte-count').textContent = nbAdultes;
    document.getElementById('enfant-count').textContent = nbEnfants;
    document.getElementById('bebe-count').textContent   = nbBebes;
    updateForm();
    document.getElementById('resa-lit').checked = !!d.lit;

    const a = new Date(d.arrivee + 'T00:00:00'), dep = new Date(d.depart + 'T00:00:00');
    let datesOk = !isNaN(a) && !isNaN(dep) && a >= premiereArrivee() && dep > a;
    for (const x = new Date(a); datesOk && x < dep; x.setDate(x.getDate() + 1)) {
      if (nuitsBloquees.has(isoDate(x))) datesOk = false;
    }
    if (datesOk) {
      fpArrivee.setDate(a, false);
      selectedArrivee = a;
      const lendemain = new Date(a); lendemain.setDate(lendemain.getDate() + 1);
      fpDepart.set('minDate', lendemain);
      fpDepart.set('maxDate', departMax(a));
      fpDepart.setDate(dep, false);
      selectedDepart = dep;
    }
    champPrenom.value = d.prenom || '';
    champNom.value    = d.nom || '';
    champEmail.value  = d.email || '';
    await telephone.restaurer(d.telephone);
    adresse.restaurer(d.adresse);
    updateForm();
    caseCgv.checked = !!d.cgv;
    if (datesOk && d.contrat) contrat.restaurer();
    majBouton();
    return datesOk;
  }

  // Le voile s'efface et le formulaire réapparaît rempli, avec un bandeau qui le dit
  async function reprendre(d) {
    await chargementEnCours;
    await voile.fermer();
    reinitBouton();
    form.querySelector('.att-bandeau')?.remove();
    if (d) {
      const datesOk = await restaurer(d);
      form.prepend(bandeau(datesOk ? 'Vos informations ont été conservées'
                                   : 'Vos informations ont été conservées, mais vos dates ne sont plus libres'));
      form.querySelectorAll('input:not([type="checkbox"]):not([type="hidden"]):not(.honey-field)').forEach(i => {
        if (i.value && i.offsetParent) { i.classList.remove('att-flash'); void i.offsetWidth; i.classList.add('att-flash'); }
      });
    }
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  }

  // ── Retour de la page de paiement Stripe ────────────────
  // ?paiement=ok&session_id=…  : on vérifie auprès du script que le paiement est bien reçu
  // ?paiement=annule&ref=…     : le voyageur a abandonné, le script libère les dates
  // Sans paramètre mais avec un paiement en cours : retour par le bouton « précédent » du navigateur
  function retourDePaiement() {
    const q = new URLSearchParams(location.search);
    const paiement = q.get('paiement');
    const memoire = relire();
    if (!paiement) {
      if (memoire && memoire.ref) paiementAnnule(memoire.ref);
      return;
    }
    // On nettoie l'adresse (garde « ?test » si besoin) pour qu'un rechargement ne refasse rien
    history.replaceState(null, '', location.pathname + (q.has('test') ? '?test' : '') + '#contact');
    if (paiement === 'annule') paiementAnnule(q.get('ref') || (memoire && memoire.ref));
    else verifierPaiement(q.get('session_id'));
  }
  // Page remise telle quelle par le navigateur (bouton « précédent ») : on ne laisse pas le voile affiché
  window.addEventListener('pageshow', e => {
    if (!e.persisted) return;
    reinitBouton();
    const memoire = relire();
    if (memoire && memoire.ref) paiementAnnule(memoire.ref);
    else voile.fermer();
  });

  function paiementAnnule(ref) {
    const memoire = relire();
    oublierRef();
    const pret = (async () => {
      let rep = null;
      if (ref) {
        try { rep = await (await fetch(SCRIPT_URL + '?action=annuler&ref=' + encodeURIComponent(ref))).json(); } catch {}
      }
      if (rep && rep.statut === 'CONFIRMEE') { afficherConfirmation(rep); return false; }   // payé juste avant
      await chargerDisponibilites();      // les dates libérées redeviennent réservables
      return true;
    })();
    voile.afficher({
      icone: 'annule', titre: 'Paiement annulé',
      message: 'Aucune somme n’a été prélevée. Vos dates restent libres pour l’instant, profitez-en.',
      actions: [{ texte: 'Reprendre ma réservation', primaire: true, clic: async (e, b) => {
        occuper(b, 'Reprendre ma réservation');
        if (await pret) reprendre(memoire);
      } }]
    });
  }

  // Paiement reçu : le script confirme (en général en quelques secondes, il redemande toutes les 5 s).
  // simulation : réponse imposée par le panneau de démonstration (mode test)
  async function verifierPaiement(sessionId, simulation) {
    const memoire = relire();
    const arrivee = memoire && memoire.arrivee ? new Date(memoire.arrivee + 'T00:00:00') : null;
    voile.afficher({ icone: 'maison', titre: 'Paiement reçu, on vérifie', points: true,
                     messages: ['Stripe nous confirme votre paiement…', 'On prépare vos clés…', messageSaison(arrivee)] });
    const debut = Date.now();
    let rep = null;
    if (simulation) {
      rep = simulation;
    } else {
      for (let essai = 1; essai <= 6; essai++) {
        try { rep = await (await fetch(SCRIPT_URL + '?action=statut&session_id=' + encodeURIComponent(sessionId || ''))).json(); }
        catch { rep = null; }
        if (rep && rep.statut !== 'PAIEMENT EN COURS') break;
        if (essai < 6) await pause(5000);
      }
    }
    // Les trois messages ont le temps de passer
    const reste = 5400 - (Date.now() - debut);
    if (reste > 0) await pause(reste);
    const statut = rep && rep.statut;
    if (statut === 'CONFIRMEE') return afficherConfirmation(rep);
    if (statut === 'EXPIREE' || statut === 'ANNULEE') return paiementNonAbouti(memoire);
    return confirmationLente();
  }

  function afficherConfirmation(r) {
    oublier();
    const m = messagerie(r.email);
    const actions = [];
    if (r.jeton) actions.push({ texte: 'Voir ma réservation', primaire: true,
                                href: 'ma-reservation?r=' + encodeURIComponent(r.jeton) + (EN_TEST ? '&test' : '') });
    if (m) actions.push({ texte: 'Ouvrir ' + m.nom, href: m.url, cible: '_blank', primaire: !actions.length });
    const retour = { texte: 'Retour au site', clic: retourAuSite };
    voile.afficher({
      icone: 'maison-allumee', titre: `C’est réservé, ${r.prenom} !`,
      message: `Votre contrat et tous les détails partent à ${r.email}. Pensez à vérifier vos spams.`,
      carte: [['Séjour', sejourCourt(r.arrivee, r.depart)], ['Référence', r.id]],
      actions: actions.length ? actions : [{ ...retour, primaire: true }],
      lien: actions.length ? retour : null
    });
    chargerDisponibilites();      // les nuits réservées apparaissent barrées derrière le voile
  }

  function confirmationLente() {
    oublier();
    voile.afficher({
      icone: 'maison-calme', titre: 'Votre paiement est bien parti',
      message: 'La confirmation prend un peu plus de temps que d’habitude. Inutile de repayer : vous recevrez l’email d’ici quelques minutes (pensez à vérifier vos spams).',
      actions: [{ texte: 'Retour au site', primaire: true, clic: retourAuSite }, appeler()]
    });
  }

  function paiementNonAbouti(memoire) {
    voile.afficher({
      icone: 'echec', titre: 'Le paiement n’a pas abouti',
      message: 'Aucune somme n’a été prélevée. Vos informations ont été conservées, vous pouvez réessayer.',
      actions: [{ texte: 'Reprendre ma réservation', primaire: true, clic: async (e, b) => {
        occuper(b, 'Reprendre ma réservation');
        await chargerDisponibilites();
        reprendre(memoire);
      } }, appeler()]
    });
  }

  // Après une confirmation : le voile s'efface, le formulaire est remis à zéro
  async function retourAuSite() {
    await voile.fermer();
    reinitBouton();
    fpArrivee.clear(); fpDepart.clear();
    selectedArrivee = selectedDepart = null;
    updateForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Panneau de démonstration (mode test seulement) ──────
  // Affiche chaque écran d'un clic, avec de fausses données, sans réservation ni appel au script.
  if (EN_TEST) {
    import('./resaDemo.js').then(m => m.initDemo({
      calendrierChargement: () => { etatCalendrier('chargement'); setTimeout(() => etatCalendrier('pret'), 4000); },
      calendrierPanne:      () => { etatCalendrier('erreur'); datesGrid.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
      paiement: async () => {
        await remplirDemo();
        submitWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await pause(700);
        occuper(submitBtn, 'Payer et réserver');
        await pause(400);
        voile.afficher(ecranPreparation());
        await pause(7400);
        await voile.afficher(ecranRedirection());
        await pause(2600);
        await voile.fermer();
        reinitBouton();
      },
      erreur: async type => { await remplirDemo(); erreurEnvoi(type); },
      annule: donnees => { memoriserDemo(donnees); paiementAnnule(''); },
      confirmee: donnees => { memoriserDemo(donnees); verifierPaiement('', { statut: 'CONFIRMEE', prenom: donnees.prenom, email: donnees.email,
        id: 'LRDS-0042', arrivee: formatDate(new Date(donnees.arrivee + 'T00:00:00')), depart: formatDate(new Date(donnees.depart + 'T00:00:00')), jeton: 'demo' }); },   // faux jeton : affiche le bouton (le lien mène à « lien inconnu »)
      lente:  donnees => { memoriserDemo(donnees); verifierPaiement('', { statut: 'PAIEMENT EN COURS' }); },
      echec:  donnees => { memoriserDemo(donnees); verifierPaiement('', { statut: 'EXPIREE' }); },
      nuitsBloquees: () => nuitsBloquees,
      premiereArrivee
    }));
  }
  let donneesDemo = null;

  // Retour de Stripe : appelé en dernier, une fois toutes les constantes du module prêtes
  // (appelé plus haut, la mémoire du formulaire n'était pas encore lisible : formulaire vide après « Retour »)
  retourDePaiement();
  function memoriserDemo(d) {
    donneesDemo = d;
    try { sessionStorage.setItem(CLE_MEMOIRE, JSON.stringify(d)); } catch {}
  }
  // Formulaire rempli avec les données de démonstration (pour voir les écrans du bas du formulaire)
  async function remplirDemo() {
    if (!submitWrap.hidden) return;
    const d = donneesDemo || (await import('./resaDemo.js')).donneesParDefaut({ nuitsBloquees: () => nuitsBloquees, premiereArrivee });
    await chargementEnCours;
    await restaurer(d);
  }

  // Même calcul que le script : la taxe est comprise dans le prix de la nuit
  function taxeSejour(prixNuit, nbNuits, adultes, occupants) {
    let t = 0;
    for (let i = 0; i < 30; i++) {
      let parPersonne = (prixNuit - t) / Math.max(occupants, 1) * TAXE_TAUX / 100;
      if (TAXE_PLAFOND > 0) parPersonne = Math.min(parPersonne, TAXE_PLAFOND);
      t = parPersonne * (1 + TAXE_ADDITIONNELLE / 100) * adultes;
    }
    return Math.round(t * nbNuits * 100) / 100;
  }

  function euros(n) {
    return n.toFixed(2).replace('.', ',') + ' €';
  }

  function showStatus(msg, type) {
    status.textContent = msg;
    status.style.color = type === 'error' ? '#f44336' : 'var(--sage)';
  }

  function isoDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  function formatDate(d) {
    if (!d) return '';
    return String(d.getDate()).padStart(2,'0') + '/'
         + String(d.getMonth()+1).padStart(2,'0') + '/'
         + d.getFullYear();
  }
}
