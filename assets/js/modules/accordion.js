export function initAccordions() {
  document.querySelectorAll('.acc-item').forEach(item => {
    const panel = item.querySelector('.acc-panel');
    const toggle = item.querySelector('.acc-toggle');
    if (!panel || !toggle) return;

    toggle.addEventListener('click', () => {
      const expanded = item.classList.toggle('expanded');
      panel.style.maxHeight = expanded ? panel.scrollHeight + 'px' : '0';
      panel.style.opacity = expanded ? '1' : '0';
    });
  });
}

export function initAccordionDeepLinks() {
  document.querySelectorAll('a[data-open]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();

      const targetId = link.dataset.open;
      const targetPanel = document.getElementById(targetId);
      if (!targetPanel) return;

      const targetItem = targetPanel.closest('.acc-item');
      if (!targetItem) return;

      const infosSection = document.getElementById('infos');
      infosSection?.scrollIntoView({ behavior: 'smooth' });

      document.querySelectorAll('.acc-item').forEach(item => {
        if (item !== targetItem && item.classList.contains('expanded')) {
          item.classList.remove('expanded');
          const panel = item.querySelector('.acc-panel');
          if (panel) {
            panel.style.maxHeight = '0';
            panel.style.opacity = '0';
          }
        }
      });

      if (!targetItem.classList.contains('expanded')) {
        targetItem.classList.add('expanded');
        targetPanel.style.maxHeight = targetPanel.scrollHeight + 'px';
        targetPanel.style.opacity = '1';
      }
    });
  });
}
