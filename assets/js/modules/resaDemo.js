/* ============================================================
   RESADEMO.JS — Panneau « Démo » du formulaire de réservation
   Chargé seulement en mode test (localhost, réseau local, ngrok ou « ?test »).
   Affiche chaque attente ou message d'un clic, avec de fausses données :
   aucune réservation, aucun paiement, aucun email.
   Le Refuge de Saintines
   ============================================================ */

const ADRESSES = {
  gmail:   'camille.martin@gmail.com',
  outlook: 'camille.martin@hotmail.fr',
  orange:  'camille.martin@orange.fr',
  autre:   'camille@monentreprise.fr'
};

// Fausse réservation de 3 nuits, sur des nuits libres du calendrier.
// mois (1-12) : arrivée dans ce mois-là (pour voir le message chauffage / clim / température idéale)
export function donneesParDefaut({ nuitsBloquees, premiereArrivee }, { mois = 0, mail = 'gmail' } = {}) {
  const prises = nuitsBloquees();
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const debut = new Date(premiereArrivee());
  if (mois) {
    debut.setDate(1);
    while (debut.getMonth() + 1 !== mois || debut < premiereArrivee()) debut.setMonth(debut.getMonth() + 1);
    if (debut < premiereArrivee()) debut.setTime(premiereArrivee().getTime());
  } else {
    debut.setDate(debut.getDate() + 14);
  }
  // Première série de 3 nuits libres à partir de là (au plus 1 an plus loin)
  const a = new Date(debut);
  for (let i = 0; i < 365; i++) {
    const libres = [0, 1, 2].every(n => { const x = new Date(a); x.setDate(x.getDate() + n); return !prises.has(iso(x)); });
    if (libres) break;
    a.setDate(a.getDate() + 1);
  }
  const d = new Date(a); d.setDate(d.getDate() + 3);
  return {
    ref: '', arrivee: iso(a), depart: iso(d), adultes: 2, enfants: 0, bebes: 0, lit: false,
    prenom: 'Camille', nom: 'MARTIN', email: ADRESSES[mail] || ADRESSES.gmail,
    telephone: '+33 6 12 34 56 78', adresse: '12 Rue de la Gare, 60410 Saintines, France', cgv: true, contrat: true
  };
}

export function initDemo(ecrans) {
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'att-demo-btn';
  bouton.textContent = 'Démo';
  bouton.setAttribute('aria-expanded', 'false');

  const panneau = document.createElement('div');
  panneau.className = 'att-demo';
  panneau.hidden = true;
  panneau.innerHTML = `
    <h3>Réglages</h3>
    <div class="att-demo-reglages">
      <label>Adresse du voyageur
        <select id="att-demo-mail">
          <option value="gmail">Gmail</option>
          <option value="outlook">Hotmail</option>
          <option value="orange">Orange</option>
          <option value="autre">Autre</option>
        </select>
      </label>
      <label>Mois d'arrivée
        <select id="att-demo-mois">
          <option value="12">Décembre (chauffage)</option>
          <option value="7">Juillet (clim)</option>
          <option value="5">Mai (température idéale)</option>
        </select>
      </label>
    </div>
    <h3>Dans le formulaire</h3>
    <div class="att-demo-liste">
      <button type="button" class="att-demo-item" data-e="calendrierChargement">1. Chargement du calendrier</button>
      <button type="button" class="att-demo-item" data-e="calendrierPanne">2. Calendrier en panne</button>
      <button type="button" class="att-demo-item" data-e="erreur" data-t="dates">5. Erreur : dates prises</button>
      <button type="button" class="att-demo-item" data-e="erreur" data-t="jourMeme">5. Erreur : trop tard pour ce soir</button>
      <button type="button" class="att-demo-item" data-e="erreur" data-t="connexion">5. Erreur : connexion coupée</button>
      <button type="button" class="att-demo-item" data-e="erreur" data-t="autre">5. Erreur générale</button>
    </div>
    <h3>Pleine page</h3>
    <div class="att-demo-liste">
      <button type="button" class="att-demo-item" data-e="paiement">3-4. Préparation du paiement</button>
      <button type="button" class="att-demo-item" data-e="annule">6. Paiement annulé</button>
      <button type="button" class="att-demo-item" data-e="confirmee">7-8. Vérification puis confirmé</button>
      <button type="button" class="att-demo-item" data-e="lente">9. Confirmation lente</button>
      <button type="button" class="att-demo-item" data-e="echec">9. Paiement non abouti</button>
    </div>
    <p>Fausses données seulement : aucune réservation, aucun paiement, aucun email. Ce panneau n'apparaît jamais sur le vrai site.</p>`;

  document.body.append(bouton, panneau);
  const ouvrir = oui => { panneau.hidden = !oui; bouton.setAttribute('aria-expanded', String(oui)); };
  bouton.addEventListener('click', () => ouvrir(panneau.hidden));

  panneau.addEventListener('click', e => {
    const b = e.target.closest('[data-e]');
    if (!b) return;
    ouvrir(false);
    const reglages = { mail: panneau.querySelector('#att-demo-mail').value, mois: Number(panneau.querySelector('#att-demo-mois').value) };
    const donnees = donneesParDefaut(ecrans, reglages);
    const nom = b.dataset.e;
    if (nom === 'erreur') ecrans.erreur(b.dataset.t);
    else if (['annule', 'confirmee', 'lente', 'echec'].includes(nom)) ecrans[nom](donnees);
    else ecrans[nom]();
  });
}
