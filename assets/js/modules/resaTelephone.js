/* ============================================================
   RESATELEPHONE.JS — Champ « Téléphone » du formulaire de réservation
   - Indicatif choisi tout seul d'après la langue du navigateur (France par défaut),
     modifiable en touchant le drapeau ; un numéro collé avec « +44… » change le pays.
   - Le numéro se met en forme pendant la saisie, au format du pays choisi.
   - Il est envoyé au script au format international : +33 6 73 73 53 18
   Bibliothèque intl-tel-input (jsDelivr), téléchargée seulement quand le champ s'affiche.
   Le Refuge de Saintines
   ============================================================ */

const ITI_URL = 'https://cdn.jsdelivr.net/npm/intl-tel-input@29.5.10/dist';

// Pays proposés en tête de liste (les plus fréquents pour le gîte)
const PAYS_EN_TETE = ['fr', 'be', 'ch', 'lu', 'gb', 'de', 'nl', 'es', 'it', 'pt', 'us'];

// Textes de la liste des pays, en français
const TEXTES = {
  selectedCountryAriaLabel: 'Changer le pays du numéro de téléphone, sélectionné ${countryName} (${dialCode})',
  noCountrySelected: 'Sélectionnez le pays du numéro de téléphone',
  countryListAriaLabel: 'Liste des pays',
  searchPlaceholder: 'Rechercher un pays',
  clearSearchAriaLabel: 'Effacer la recherche',
  closeCountrySelectorAriaLabel: 'Fermer',
  searchEmptyState: 'Aucun pays trouvé',
  searchSummaryAria: n => n === 0 ? 'Aucun pays trouvé' : n === 1 ? '1 pays trouvé' : n + ' pays trouvés'
};

let chargement = null;
function chargerBibliotheque() {
  if (!chargement) {
    chargement = new Promise((ok, ko) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = ITI_URL + '/css/intlTelInput.min.css';
      document.head.append(css);
      const js = document.createElement('script');
      js.src = ITI_URL + '/js/intlTelInput.min.js';
      js.onload = () => ok(window.intlTelInput);
      js.onerror = () => { chargement = null; ko(new Error('intl-tel-input indisponible')); };
      document.head.append(js);
    });
  }
  return chargement;
}

// Pays deviné depuis la langue du navigateur : « fr-BE » → be, « de » → de, sinon France
function paysDuNavigateur() {
  const parDefaut = { fr: 'fr', de: 'de', nl: 'nl', es: 'es', it: 'it', pt: 'pt', en: 'gb' };
  for (const langue of navigator.languages || [navigator.language || 'fr']) {
    const [l, region] = String(langue).toLowerCase().split('-');
    if (region && /^[a-z]{2}$/.test(region)) return region;
    if (parDefaut[l]) return parDefaut[l];
  }
  return 'fr';
}

/**
 * Prépare le champ. Renvoie { valeur(), manque(), restaurer(numero) } :
 * - valeur()   : numéro au format international, ou '' s'il est absent ou invalide
 * - manque()   : null si le numéro est bon, sinon { message } (utilisé à l'envoi du formulaire)
 */
export function initTelephone(input, aide) {
  let iti = null;

  // Si la bibliothèque ne se charge pas (réseau), le champ reste un champ texte simple.
  // Sinon, l'exemple affiché dans le champ suit le pays choisi (« 6 12 34 56 78 » pour la France).
  chargerBibliotheque().then(intlTelInput => {
    iti = intlTelInput(input, {
      initialCountry: paysDuNavigateur(),
      countryOrder: PAYS_EN_TETE,
      separateDialCode: true,          // « 🇫🇷 +33 » affiché devant le champ
      formatAsYouType: false,          // la mise en forme est faite par reformater() ci-dessous
      strictMode: false,
      countryNameLocale: 'fr',
      uiTranslations: TEXTES,
      loadUtils: () => import(ITI_URL + '/js/utils.js')
    });
    // Numéro tapé avant la fin du chargement : remis au bon format dès que possible
    iti.promise?.then(reformater);
  }).catch(() => { input.placeholder = '+33 6 12 34 56 78'; });

  // Mise en forme : dès que le numéro est complet, il s'affiche au format international du pays
  // sans l'indicatif (déjà affiché à côté du drapeau) : « 06.73.73.53.18 » → « 6 73 73 53 18 ».
  // Un numéro collé avec « +44… » ou « 0044… » choisit le bon pays.
  function reformater() {
    if (!iti || !window.intlTelInput?.utils) return;
    const auBout = input.selectionStart >= input.value.length;   // ne bouge pas le curseur au milieu
    const txt = input.value.trim();
    if (/^(\+|00)/.test(txt)) {
      if (txt.replace(/\D/g, '').length < 8) return;              // indicatif en cours de saisie
      iti.setNumber('+' + txt.replace(/^00/, '').replace(/\D/g, ''));
    }
    if (!iti.isValidNumber()) return;
    const affiche = iti.getNumber('INTERNATIONAL').replace(/^\+\d+\s*/, '');
    if (auBout && affiche !== input.value) input.value = affiche;
  }
  input.addEventListener('input', reformater);
  input.addEventListener('blur', reformater);
  input.addEventListener('input', () => { if (aide.classList.contains('is-erreur')) effacerMessage(); });

  function effacerMessage() { aide.textContent = ''; aide.classList.remove('is-erreur'); }

  function valeur() {
    const brut = input.value.trim();
    if (!brut) return '';
    if (iti && window.intlTelInput?.utils) {
      if (!iti.isValidNumber()) return '';
      return iti.getNumber('INTERNATIONAL');
    }
    // Secours sans la bibliothèque : on garde ce qui a été tapé s'il y a assez de chiffres
    return brut.replace(/\D/g, '').length >= 8 ? brut : '';
  }

  // null si le numéro est bon, sinon le message à afficher sous le champ
  function manque() {
    if (valeur()) { effacerMessage(); return null; }
    return { message: input.value.trim() ? 'Numéro incomplet ou invalide pour ce pays' : 'Champ obligatoire' };
  }

  // Remet un numéro enregistré (format international) au retour de la page de paiement
  async function restaurer(numero) {
    if (!numero) return;
    try { await chargerBibliotheque(); } catch {}
    for (let i = 0; i < 40 && !iti; i++) await new Promise(r => setTimeout(r, 50));
    if (!iti) { input.value = numero; return; }
    try { await iti.promise; } catch {}
    iti.setNumber(numero.replace(/[^\d+]/g, ''));
    if (window.intlTelInput?.utils && iti.isValidNumber()) input.value = iti.getNumber('INTERNATIONAL').replace(/^\+\d+\s*/, '');
    effacerMessage();
  }

  return { valeur, manque, restaurer };
}
