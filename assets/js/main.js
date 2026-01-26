import { initMap } from './modules/map.js';
import { initNavigation } from './modules/navigation.js';
import { initExpandableCards } from './modules/expandable.js';
import { initPopups } from './modules/popups.js';
import { initAccordions, initAccordionDeepLinks } from './modules/accordion.js';
import { initGalleries } from './modules/gallery.js';
import { initContactForm } from './modules/form.js';

window.initMap = initMap;

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initExpandableCards();
  initPopups();
  initAccordions();
  initAccordionDeepLinks();
  initGalleries();
  initContactForm();
});
