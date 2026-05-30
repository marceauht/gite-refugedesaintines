/* ============================================================
   INFO SHEET — Bottom sheet infos pratiques (mobile only)
   ============================================================ */

export function initInfoSheet() {
  if (window.innerWidth > 768) return;

  const cards = document.querySelectorAll('.infos-grid .info-card');
  if (!cards.length) return;

  /* Injecter le label mobile dans chaque carte */
  cards.forEach(card => {
    const icon  = card.querySelector('.info-card-icon');
    const title = card.querySelector('.info-card-title');
    if (!icon || !title) return;

    const label = document.createElement('span');
    label.className = 'info-card-label-mobile';
    label.textContent = title.textContent;
    icon.insertAdjacentElement('afterend', label);
  });

  /* Créer le backdrop */
  const backdrop = document.createElement('div');
  backdrop.className = 'info-sheet-backdrop';
  document.body.appendChild(backdrop);

  /* Créer la sheet */
  const sheet = document.createElement('div');
  sheet.className = 'info-sheet';
  sheet.innerHTML = `
    <div class="info-sheet-handle"></div>
    <button class="info-sheet-close" aria-label="Fermer">✕</button>
    <div class="info-sheet-header">
      <span class="info-sheet-icon"></span>
      <span class="info-sheet-title"></span>
    </div>
    <div class="info-sheet-body"></div>
  `;
  document.body.appendChild(sheet);

  const closeBtn    = sheet.querySelector('.info-sheet-close');
  const sheetIcon   = sheet.querySelector('.info-sheet-icon');
  const sheetTitle  = sheet.querySelector('.info-sheet-title');
  const sheetBody   = sheet.querySelector('.info-sheet-body');

  function openSheet(card) {
    const icon  = card.querySelector('.info-card-icon');
    const title = card.querySelector('.info-card-title');

    sheetIcon.textContent  = icon  ? icon.textContent  : '';
    sheetTitle.textContent = title ? title.textContent : '';

    /* Cloner le contenu détaillé */
    sheetBody.innerHTML = '';
    card.querySelectorAll(
      '.info-card-highlight, .info-time-row, .info-row, .info-card-cta'
    ).forEach(el => {
      sheetBody.appendChild(el.cloneNode(true));
    });

    backdrop.classList.add('open');
    sheet.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
    sheet.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  cards.forEach(card => {
    card.addEventListener('click', () => openSheet(card));
  });

  closeBtn.addEventListener('click', closeSheet);
  backdrop.addEventListener('click', closeSheet);

  /* Swipe vers le bas pour fermer */
  let startY = 0;
  sheet.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
  }, { passive: true });

  sheet.addEventListener('touchend', e => {
    if (e.changedTouches[0].clientY - startY > 80) closeSheet();
  }, { passive: true });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSheet();
  });

  sheet.addEventListener('click', e => {
    if (e.target.closest('.info-card-cta')) {
        closeSheet();
    }
});
}