function setupGalleryScroll(gallerySelector, btnLeftSelector, btnRightSelector, imagesPerScrollDesktop = 2, mode = 'fixed') {
  const gallery = document.querySelector(gallerySelector);
  const btnLeft = document.querySelector(btnLeftSelector);
  const btnRight = document.querySelector(btnRightSelector);

  if (!gallery || !btnLeft || !btnRight) return;

  const gap = parseInt(getComputedStyle(gallery).gap, 10) || 20;

  const getScrollAmount = () => {
    if (mode === 'dynamic') {
      return gallery.clientWidth;
    }

    const items = gallery.querySelectorAll('img, .avis-card');
    if (!items.length) return 0;

    if (window.innerWidth <= 768) {
      return items[0].offsetWidth + gap;
    }

    let width = 0;
    for (let i = 0; i < imagesPerScrollDesktop; i++) {
      if (items[i]) {
        width += items[i].offsetWidth + gap;
      }
    }

    return width;
  };

  btnRight.addEventListener('click', () => {
    gallery.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
  });

  btnLeft.addEventListener('click', () => {
    gallery.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
  });
}

export function initGalleries() {
  setupGalleryScroll('.gallery-images', '.scroll-left-images', '.scroll-right-images', 2, 'fixed');
  setupGalleryScroll('.gallery-avis', '.scroll-left-avis', '.scroll-right-avis', 1, 'dynamic');
}
