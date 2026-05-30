/* ============================================================
   MAIN.JS — Point d'entrée
   Le Refuge de Saintines
   ============================================================ */

import { initNavigation }    from './modules/navigation.js';
import { initReveal, initCursor, initParallax, initCounters } from './modules/animations.js';
import { initReservation }   from './modules/reservation.js';
import { initGallery }       from './modules/gallery.js';
import { initEquipExpand, initReco, initWheel } from './modules/accordion.js';
import { initInfoSheet } from './modules/infoSheet.js';

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initReveal();
  initCursor();
  initParallax();
  initCounters();
  initGallery();
  initReservation();
  initWheel();
  initEquipExpand();
  initReco();
  initInfoSheet();
});
