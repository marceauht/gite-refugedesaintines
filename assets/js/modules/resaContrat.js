/* ============================================================
   RESACONTRAT.JS — Case « J'ai lu et j'accepte le contrat »
   La case ne se coche pas directement : elle ouvre le contrat (texte de contrat.html)
   pré-rempli avec la réservation en cours. Le bouton « J'accepte le contrat » s'active
   une fois le texte lu jusqu'en bas, et coche la case.
   Si une information du contrat change ensuite (dates, voyageurs, coordonnées),
   la case se décoche : le voyageur doit relire le contrat à jour.
   Le Refuge de Saintines
   ============================================================ */

const $ = id => document.getElementById(id);

const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * donnees() renvoie soit { erreur: 'message' } (coordonnées incomplètes),
 * soit les informations du contrat (voir remplir() plus bas).
 * Renvoie { accepte(), restaurer(), reinitialiser() }.
 */
export function initContrat({ donnees, signalerErreur, surAcceptation }) {
  const fenetre  = $('resa-contrat');
  const texte    = $('resa-contrat-texte');
  const progres  = $('resa-contrat-progres');
  const bouton   = $('resa-contrat-ok');
  const caseOk   = $('consent-contrat');
  const aide     = $('consent-contrat-aide');
  let modele = null, retourFocus = null, signature = '';

  // Le panneau est déplacé directement dans <body> pour passer au-dessus de l'en-tête du site
  document.body.append(fenetre);

  // La case et le lien ouvrent le contrat tant qu'il n'est pas accepté
  caseOk.addEventListener('click', e => {
    if (caseOk.checked) { e.preventDefault(); ouvrir(); }      // tentative de cocher → on ouvre
    else { signature = ''; aide.hidden = true; surAcceptation(); }
  });
  $('ouvrir-contrat').addEventListener('click', ouvrir);

  async function ouvrir() {
    const d = donnees();
    if (d.erreur) { signalerErreur(d.erreur); return; }
    retourFocus = document.activeElement;
    try {
      modele = modele || await chargerModele();
    } catch {
      signalerErreur('Le contrat n\'a pas pu être chargé. Vérifiez votre connexion et réessayez.');
      return;
    }
    texte.innerHTML = remplir(modele, d);
    signature = JSON.stringify(d);
    fenetre.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    texte.scrollTop = 0;
    bouton.disabled = true;
    bouton.textContent = 'Faites défiler jusqu\'en bas';
    texte.focus({ preventScroll: true });
    requestAnimationFrame(suivreLecture);
  }

  function fermer() {
    fenetre.hidden = true;
    document.documentElement.style.overflow = '';
    retourFocus?.focus?.({ preventScroll: true });
  }

  // Lecture : barre de progression, bouton actif une fois en bas
  function suivreLecture() {
    const max = texte.scrollHeight - texte.clientHeight;
    const part = max <= 0 ? 1 : Math.min(texte.scrollTop / max, 1);
    progres.style.width = (part * 100) + '%';
    if (part > 0.98 && bouton.disabled) {
      bouton.disabled = false;
      bouton.textContent = 'J\'accepte le contrat';
    }
  }
  texte.addEventListener('scroll', suivreLecture, { passive: true });

  bouton.addEventListener('click', () => {
    caseOk.checked = true;
    caseOk.dispatchEvent(new Event('change'));   // efface un éventuel « Champ obligatoire »
    aide.hidden = true;
    fermer();
    surAcceptation();
  });

  fenetre.querySelectorAll('[data-fermer]').forEach(el => el.addEventListener('click', fermer));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !fenetre.hidden) fermer(); });

  // Texte du contrat : les sections de contrat.html, sans l'encadré d'explication du début
  async function chargerModele() {
    const r = await fetch('contrat.html');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
    doc.querySelectorAll('.legal-body .legal-card').forEach(el => el.remove());
    return [...doc.querySelectorAll('.legal-body .legal-section')].map(s => s.outerHTML).join('');
  }

  // Remplace les [passages entre crochets] par les informations de la réservation
  function remplir(html, d) {
    // Moins de 3 voyageurs : pas de frais de linge, la ligne disparaît (comme dans le contrat PDF)
    if (!d.linge) html = html.replace(/<li class="ligne-linge">[\s\S]*?<\/li>\s*/, '');
    const champs = {
      '[nom et prénom, adresse postale, email et téléphone saisis dans le formulaire]':
        `${d.prenom} ${d.nom}, ${d.adresse}, ${d.email}, ${d.telephone}`,
      '[nombre de nuits]': d.nuits + (d.nuits > 1 ? ' nuits' : ' nuit'),
      "[date d'arrivée]": d.arrivee,
      '[date de départ]': d.depart,
      "[nombre d'adultes, d'enfants de 2 ans et plus et de bébés de moins de 2 ans]": d.occupants,
      '[oui ou non]': d.lit ? 'oui' : 'non',
      '[montant affiché dans le formulaire]': d.total,
      '[montant]': d.taxe,
      '[date limite]': d.dateLimite,
      "[date et heure d'acceptation]": 'date et heure de votre validation, juste avant le paiement',
      '[email du locataire]': d.email,
      "[date d'acceptation]": d.aujourdhui
    };
    for (const [cle, val] of Object.entries(champs)) {
      html = html.split(esc(cle)).join(`<span class="rempli">${esc(val)}</span>`);
      html = html.split(cle).join(`<span class="rempli">${esc(val)}</span>`);
    }
    return html;
  }

  return {
    accepte: () => caseOk.checked,
    // Retour de la page de paiement : le formulaire est remis à l'identique, le contrat déjà accepté le reste
    restaurer() {
      const d = donnees();
      if (d.erreur) return;
      caseOk.checked = true;
      signature = JSON.stringify(d);
      aide.hidden = true;
      surAcceptation();
    },
    // Appelé à chaque changement du formulaire : si le contrat accepté ne correspond plus, on décoche
    reinitialiser() {
      if (!caseOk.checked) return;
      const d = donnees();
      if (!d.erreur && JSON.stringify(d) === signature) return;
      caseOk.checked = false;
      signature = '';
      aide.hidden = false;
      aide.textContent = 'Vos informations ont changé : rouvrez le contrat pour accepter la version à jour.';
    }
  };
}
