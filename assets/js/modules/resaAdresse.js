/* ============================================================
   RESAADRESSE.JS — Champ « Adresse postale » du formulaire de réservation
   Pendant la saisie, une liste de 5 adresses est proposée :
   - France   : Base Adresse Nationale (IGN, Géoplateforme), gratuite et sans clé
   - Étranger : Photon (OpenStreetMap), gratuit et sans clé
   L'adresse choisie est toujours écrite pareil : « 12 Rue de la Gare, 60410 Saintines, France ».
   Adresse introuvable : « Je ne trouve pas mon adresse » ouvre des champs séparés
   (rue, code postal, ville, pays), assemblés au même format.
   Le Refuge de Saintines
   ============================================================ */

const URL_FRANCE   = 'https://data.geopf.fr/geocodage/search';
const URL_ETRANGER = 'https://photon.komoot.io/api/';
const NB_MAX = 5;

const $ = id => document.getElementById(id);

/**
 * Prépare le champ. Renvoie { valeur(), manque(), surChangement(fn), restaurer(valeur) } :
 * - valeur() : adresse complète formatée, ou '' si aucune adresse n'est choisie ou complète
 * - manque() : null si l'adresse est complète, sinon { champ, message } à signaler
 */
export function initAdresse() {
  const champ    = $('resa-adresse');
  const liste    = $('resa-adresse-liste');
  const zone     = $('resa-adresse-zone');
  const choisie  = $('resa-adresse-ok');
  const texte    = $('resa-adresse-texte');
  const manuelle = $('resa-adresse-manuelle');
  const cache    = $('resa-adresse-valeur');
  const m = { rue: $('resa-adr-rue'), cp: $('resa-adr-cp'), ville: $('resa-adr-ville'), pays: $('resa-adr-pays') };

  let resultats = [], actif = -1, minuterie = null, requete = null, ecouteur = () => {};

  // ── Recherche pendant la saisie ──
  // Attend une courte pause dans la frappe (150 ms), affiche les adresses françaises dès qu'elles
  // arrivent (service rapide), puis ajoute celles de l'étranger (service plus lent).
  // Les réponses déjà reçues sont gardées : revenir en arrière dans la saisie est instantané.
  const memoire = new Map();
  champ.addEventListener('input', () => {
    clearTimeout(minuterie);
    const q = champ.value.trim();
    if (q.length < 3) { requete?.abort(); fermer(); return; }
    minuterie = setTimeout(() => chercher(q), 150);
  });

  function chercher(q) {
    requete?.abort();
    requete = new AbortController();
    const signal = requete.signal;
    const deja = memoire.get(q.toLowerCase());
    if (deja) { resultats = deja; afficher(false); return; }
    let fr, monde, recus = 0;
    const fusionner = () => {
      if (signal.aborted) return;
      recus++;
      // Les meilleures correspondances d'abord (score de 0 à 1)
      resultats = [...(fr || []), ...(monde || [])].sort((a, b) => b.score - a.score).slice(0, NB_MAX);
      if (recus === 2) {
        if (fr !== null || monde !== null) memoire.set(q.toLowerCase(), resultats);
        afficher(fr === null && monde === null);
      } else if (resultats.length) {
        afficher(false);                       // premiers résultats sans attendre l'autre service
      }
    };
    chercherFrance(q, signal).catch(() => null).then(r => { fr = r; fusionner(); });
    chercherEtranger(q, signal).catch(() => null).then(r => { monde = r; fusionner(); });
  }

  async function chercherFrance(q, signal) {
    const url = `${URL_FRANCE}?q=${encodeURIComponent(q)}&index=address&autocomplete=1&limit=${NB_MAX}`;
    const r = await fetch(url, { signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const json = await r.json();
    return (json.features || []).map(f => {
      const p = f.properties || {};
      const ligne1 = p.type === 'municipality' ? '' : p.name;
      return {
        score: Number(p.score) || 0,
        ligne1: ligne1 || `${p.postcode} ${p.city}`,
        ligne2: ligne1 ? `${p.postcode} ${p.city}, France` : 'France',
        valeur: [ligne1, `${p.postcode} ${p.city}`, 'France'].filter(Boolean).join(', ')
      };
    });
  }

  async function chercherEtranger(q, signal) {
    const url = `${URL_ETRANGER}?q=${encodeURIComponent(q)}&limit=${NB_MAX}&lang=fr`;
    const r = await fetch(url, { signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const json = await r.json();
    return (json.features || [])
      .map(f => f.properties || {})
      .filter(p => p.countrycode && p.countrycode !== 'FR' && p.country && (p.street || p.name))
      .map((p, i) => {
        const rue = p.street ? [p.housenumber, p.street].filter(Boolean).join(' ') : p.name;
        const ville = [p.postcode, p.city || p.town || p.village || p.county].filter(Boolean).join(' ');
        return {
          score: 0.6 - i * 0.05,          // Photon ne donne pas de score : on garde son ordre
          ligne1: rue,
          ligne2: [ville, p.country].filter(Boolean).join(', '),
          valeur: [rue, ville, p.country].filter(Boolean).join(', ')
        };
      });
  }

  // ── Liste des suggestions ──
  function afficher(horsLigne) {
    actif = -1;
    liste.innerHTML = '';
    if (horsLigne) {
      const info = document.createElement('p');
      info.className = 'resa-adresse-info';
      info.textContent = 'La recherche d\'adresse ne répond pas. Saisissez-la à la main :';
      liste.append(info);
    }
    resultats.forEach((res, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'option');
      b.id = 'resa-adresse-opt-' + i;
      b.textContent = res.ligne1;
      const small = document.createElement('small');
      small.textContent = res.ligne2;
      b.append(small);
      b.addEventListener('mousedown', e => e.preventDefault());   // garde le focus dans le champ
      b.addEventListener('click', () => choisir(res.valeur));
      liste.append(b);
    });
    const manuel = document.createElement('button');
    manuel.type = 'button';
    manuel.className = 'resa-adresse-manuel';
    manuel.textContent = 'Je ne trouve pas mon adresse';
    manuel.addEventListener('mousedown', e => e.preventDefault());
    manuel.addEventListener('click', ouvrirManuelle);
    liste.append(manuel);
    liste.hidden = false;
    champ.setAttribute('aria-expanded', 'true');
  }

  function fermer() {
    liste.hidden = true;
    champ.setAttribute('aria-expanded', 'false');
    champ.removeAttribute('aria-activedescendant');
  }

  // Clavier : flèches pour parcourir, Entrée pour choisir, Échap pour fermer
  champ.addEventListener('keydown', e => {
    const boutons = [...liste.querySelectorAll('button')];
    if (liste.hidden || !boutons.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      actif = (actif + (e.key === 'ArrowDown' ? 1 : -1) + boutons.length) % boutons.length;
      boutons.forEach((b, i) => b.classList.toggle('is-actif', i === actif));
      champ.setAttribute('aria-activedescendant', boutons[actif].id || '');
    } else if (e.key === 'Enter' && actif >= 0) {
      e.preventDefault();
      boutons[actif].click();
    } else if (e.key === 'Escape') {
      fermer();
    }
  });
  champ.addEventListener('blur', () => setTimeout(fermer, 150));

  // ── Adresse choisie dans la liste ──
  function choisir(valeur) {
    fermer();
    cache.value = valeur;
    texte.textContent = valeur;
    zone.hidden = true;
    manuelle.hidden = true;
    choisie.hidden = false;
    champ.dispatchEvent(new Event('change'));     // efface un éventuel « Champ obligatoire »
    ecouteur();
  }

  $('resa-adresse-modifier').addEventListener('click', () => {
    cache.value = '';
    choisie.hidden = true;
    zone.hidden = false;
    champ.value = '';
    champ.focus();
    ecouteur();
  });

  // ── Saisie manuelle ──
  function ouvrirManuelle() {
    fermer();
    if (!m.rue.value) m.rue.value = champ.value.trim();
    zone.hidden = true;
    choisie.hidden = true;
    manuelle.hidden = false;
    m.rue.focus();
    majManuelle();
  }

  $('resa-adresse-recherche').addEventListener('click', () => {
    manuelle.hidden = true;
    zone.hidden = false;
    cache.value = '';
    champ.focus();
    ecouteur();
  });

  // Majuscule au début de la ville et du pays, code postal en majuscules (ex. « SW1A 2AA »)
  const majuscule = t => t.trim().replace(/^\p{L}/u, c => c.toLocaleUpperCase('fr'));
  function majManuelle() {
    const rue = majuscule(m.rue.value), cp = m.cp.value.trim().toUpperCase();
    const ville = majuscule(m.ville.value), pays = majuscule(m.pays.value);
    cache.value = rue && cp && ville && pays ? `${rue}, ${cp} ${ville}, ${pays}` : '';
    ecouteur();
  }
  Object.values(m).forEach(i => i.addEventListener('input', majManuelle));

  // Renvoie null si l'adresse est complète, sinon le champ à signaler et son message :
  // l'adresse doit être choisie dans la liste (ou saisie entièrement à la main)
  function manque() {
    if (cache.value) return null;
    if (!manuelle.hidden) {
      const vide = Object.values(m).find(i => !i.value.trim()) || m.rue;
      return { champ: vide, message: 'Champ obligatoire' };
    }
    zone.hidden = false;
    choisie.hidden = true;
    return {
      champ,
      message: champ.value.trim() ? 'Choisissez votre adresse dans la liste' : 'Champ obligatoire'
    };
  }

  return {
    valeur: () => cache.value,
    manque,
    surChangement: fn => { ecouteur = fn; },
    restaurer: valeur => { if (valeur) choisir(valeur); }   // adresse déjà choisie (retour de la page de paiement)
  };
}
