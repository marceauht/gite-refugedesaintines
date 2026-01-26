export function initExpandableCards() {
  document.querySelectorAll('.expandable-card').forEach(card => {
    const title = card.querySelector('.expandable-title');
    if (!title) return;

    title.addEventListener('click', () => {
      card.classList.toggle('expanded');
    });
  });
}
