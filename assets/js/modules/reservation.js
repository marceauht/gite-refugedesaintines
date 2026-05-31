/* ============================================================
   RESERVATION.JS — Formulaire de réservation en ligne
   Le Refuge de Saintines
   ============================================================ */

const SCRIPT_URL     = 'https://script.google.com/macros/s/AKfycbw6aFGeNvbqPr7RLyp4zthNr0xUPTOJdnPDed1HFZWOOk2HGvMyat_mHn4hUDTHSClAMA/exec';
const TARIF_NUIT     = 58;
const FRAIS_MENAGE   = 30;
const SUPPL_VOYAGEUR = 10;
const SUPPL_ANIMAL   = 10;

export function initReservation() {
  const form      = document.getElementById('reservation-form');
  if (!form) return;

  const prixBox   = document.getElementById('resa-price');
  const contactBox= document.getElementById('resa-contact');
  const submitWrap= document.getElementById('resa-submit-wrap');
  const submitBtn = document.getElementById('resa-submit-btn');
  const status    = document.getElementById('resa-status');

  let nbAdultes = 1, nbEnfants = 0, nbBebes = 0, animaux = false;
  let fpArrivee = null, fpDepart = null;
  let selectedArrivee = null, selectedDepart = null;

  // ── Chargement des dates bloquées puis init Flatpickr ──
  fetchBlockedDates()
    .then(dates => {
      console.log('Dates bloquées reçues :', dates.length, dates);
      initPickers(dates);
    })
    .catch(() => initPickers([]));

  async function fetchBlockedDates() {
    try {
      const resp = await fetch(SCRIPT_URL + '?action=blocked_dates', {
        redirect: 'follow'
      });
      if (!resp.ok) return [];
      const json = await resp.json();
      const raw = Array.isArray(json.blocked) ? json.blocked : [];

      // Le jour de départ (to) est exclusif → on le recule d'un jour
      // pour ne pas bloquer une arrivée possible ce jour-là
      return raw.map(b => {
        const to = new Date(b.to + 'T00:00:00');
        to.setDate(to.getDate() - 1);
        const toStr = to.getFullYear() + '-'
          + String(to.getMonth() + 1).padStart(2, '0') + '-'
          + String(to.getDate()).padStart(2, '0');
        return { from: b.from, to: toStr };
      });
    } catch (err) {
      console.error('Erreur fetch dates bloquées :', err);
      return [];
    }
  }

  function initPickers(blockedDates = []) {
    const commonOpts = {
      locale:     'fr',
      dateFormat: 'd/m/Y',
      minDate:    'today',
      disable:    blockedDates,
      disableMobile: true
    };

    fpArrivee = flatpickr('#date-arrivee', {
      ...commonOpts,
      onChange(selected) {
        selectedArrivee = selected[0] || null;
        if (selectedArrivee) {
          const nextDay = new Date(selectedArrivee);
          nextDay.setDate(nextDay.getDate() + 1);
          fpDepart.set('minDate', nextDay);
          if (selectedDepart && selectedDepart <= selectedArrivee) {
            fpDepart.clear();
            selectedDepart = null;
          }
        }
        updateForm();
      }
    });

    fpDepart = flatpickr('#date-depart', {
      ...commonOpts,
      onChange(selected) {
        selectedDepart = selected[0] || null;
        updateForm();
      }
    });
  }

  // ── Compteurs voyageurs ─────────────────────────────────
  function makeCounter(minusId, plusId, countId, get, set, min) {
    document.getElementById(minusId).addEventListener('click', () => {
      if (get() > min) {
        set(get() - 1);
        document.getElementById(countId).textContent = get();
        updateForm();
      }
    });
    document.getElementById(plusId).addEventListener('click', () => {
      if (nbAdultes + nbEnfants < 4) {
        set(get() + 1);
        document.getElementById(countId).textContent = get();
        updateForm();
      }
    });
  }

  makeCounter('adulte-minus','adulte-plus','adulte-count', ()=>nbAdultes, v=>nbAdultes=v, 1);
  makeCounter('enfant-minus','enfant-plus','enfant-count', ()=>nbEnfants, v=>nbEnfants=v, 0);
  makeCounter('bebe-minus',  'bebe-plus',  'bebe-count',   ()=>nbBebes,   v=>nbBebes=v,   0);

  // ── Toggle animaux ──────────────────────────────────────
  document.getElementById('animal-toggle').addEventListener('click', () => {
    animaux = !animaux;
    document.getElementById('animal-toggle').textContent = animaux ? 'Oui' : 'Non';
    document.getElementById('animal-toggle').classList.toggle('active', animaux);
    updateForm();
  });

  // ── Calcul prix et affichage ────────────────────────────
  function updateForm() {
    if (!selectedArrivee || !selectedDepart || selectedDepart <= selectedArrivee) {
      prixBox.hidden = contactBox.hidden = submitWrap.hidden = true;
      return;
    }

    const nbNuits        = Math.round((selectedDepart - selectedArrivee) / 86400000);
    const prixNuits      = nbNuits * TARIF_NUIT;
    const supplVoyageurs = nbAdultes > 2 ? (nbAdultes - 2) * SUPPL_VOYAGEUR : 0;
    const supplAnimaux   = animaux ? SUPPL_ANIMAL : 0;
    const total          = prixNuits + FRAIS_MENAGE + supplVoyageurs + supplAnimaux;

    document.getElementById('price-nuits').textContent     = nbNuits + ' nuit' + (nbNuits > 1 ? 's' : '') + ' × ' + TARIF_NUIT + ' €';
    document.getElementById('price-nuits-val').textContent = prixNuits + ' €';

    const rowVoy = document.getElementById('price-row-voy');
    rowVoy.hidden = supplVoyageurs === 0;
    if (supplVoyageurs > 0) document.getElementById('price-voy-val').textContent = '+' + supplVoyageurs + ' €';

    const rowAni = document.getElementById('price-row-ani');
    rowAni.hidden = !animaux;
    if (animaux) document.getElementById('price-ani-val').textContent = '+' + supplAnimaux + ' €';

    document.getElementById('price-total-val').textContent = total + ' €';

    document.getElementById('hidden-nuits').value     = nbNuits;
    document.getElementById('hidden-voyageurs').value = nbAdultes + nbEnfants + nbBebes;
    document.getElementById('hidden-animaux').value   = animaux ? 'oui' : 'non';
    document.getElementById('hidden-arrivee').value   = formatDate(selectedArrivee);
    document.getElementById('hidden-depart').value    = formatDate(selectedDepart);

    prixBox.hidden = contactBox.hidden = submitWrap.hidden = false;
  }

  // ── Soumission ──────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const honey = form.querySelector('input[name="website"]');
    if (honey && honey.value) return;

    const prenom    = form.querySelector('[name="prenom"]').value.trim();
    const email     = form.querySelector('[name="email"]').value.trim();
    const telephone = form.querySelector('[name="telephone"]').value.trim();
    const adresse   = form.querySelector('[name="adresse"]').value.trim();
    const consent   = form.querySelector('#consent-resa').checked;

    if (!selectedArrivee || !selectedDepart) {
      showStatus('Veuillez sélectionner vos dates de séjour.', 'error'); return;
    }
    if (!prenom || !email || !telephone || !adresse) {
      showStatus('Merci de remplir tous les champs de coordonnées.', 'error'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showStatus('Adresse email invalide.', 'error'); return;
    }
    if (!consent) {
      showStatus("Veuillez accepter le règlement et la politique d'annulation.", 'error'); return;
    }

    submitBtn.disabled    = true;
    submitBtn.textContent = '⏳ Vérification des disponibilités…';
    showStatus('', '');

    const data = new FormData();
    data.append('prenom',       prenom);
    data.append('email',        email);
    data.append('telephone',    telephone);
    data.append('adresse',      adresse);
    data.append('date_arrivee', document.getElementById('hidden-arrivee').value);
    data.append('date_depart',  document.getElementById('hidden-depart').value);
    data.append('nb_nuits',     document.getElementById('hidden-nuits').value);
    data.append('nb_voyageurs', document.getElementById('hidden-voyageurs').value);
    data.append('animaux',      animaux ? 'oui' : 'non');
    data.append('notes',        '');

    try {
      const resp = await fetch(SCRIPT_URL, { method: 'POST', body: data });
      const json = await resp.json();
      json.success ? showSuccess(prenom, email)
                   : showStatus('❌ ' + (json.message || 'Erreur. Contactez le 06.73.73.53.18'), 'error');
    } catch {
      showStatus('❌ Problème de connexion. Contactez Marceau au 06.73.73.53.18', 'error');
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Confirmer la réservation →';
    }
  });

  // ── Messages ────────────────────────────────────────────
  function showSuccess(prenom, email) {
    form.innerHTML = `
      <div class="resa-success">
        <div class="resa-success-icon">✅</div>
        <h3>Demande envoyée, ${prenom} !</h3>
        <p>Vous allez recevoir deux emails à <strong>${email}</strong> :</p>
        <ol>
          <li>Un récapitulatif avec le RIB pour le virement et le lien Swikly pour la caution</li>
          <li>Votre contrat de bail en pièce jointe, à signer et à retourner par email</li>
        </ol>
        <p class="resa-success-note">⚠️ Votre réservation sera confirmée à réception du virement, du contrat signé ainsi que du dépôt de caution via Swikly. Pensez à vérifier vos spams.</p>
        <p>Une question ? <a href="tel:+33673735318">06.73.73.53.18</a></p>
      </div>`;
  }

  function showStatus(msg, type) {
    status.textContent = msg;
    status.style.color = type === 'error' ? '#f44336' : 'var(--sage)';
  }

  function formatDate(d) {
    if (!d) return '';
    return String(d.getDate()).padStart(2,'0') + '/'
         + String(d.getMonth()+1).padStart(2,'0') + '/'
         + d.getFullYear();
  }
}
