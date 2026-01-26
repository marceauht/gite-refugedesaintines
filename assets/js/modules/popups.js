export function initPopups() {
  document.querySelectorAll('[data-popup-target]').forEach(btn => {
    const targetId = btn.getAttribute('data-popup-target');
    if (!targetId) return;

    const popup = document.getElementById(targetId);
    if (!popup) return;

    btn.addEventListener('click', event => {
      event.preventDefault();
      popup.style.display = 'flex';
    });

    const closeBtn = popup.querySelector('.popup-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        popup.style.display = 'none';
      });
    }

    popup.addEventListener('click', event => {
      if (event.target === popup) {
        popup.style.display = 'none';
      }
    });
  });
}
