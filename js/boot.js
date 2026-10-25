/*
 * Little Hafiz Quest: start-up (runs first, before the page draws)
 * ===============================================================
 * The classic version (v1) was retired in v2.5.0. Phones that had chosen it still have that choice saved
 * ("lhq_channel"); it is cleared here, so everyone opens the current version. (The v1/ folder sends any old
 * link or bookmark here too.)
 */
(function () {
  'use strict';
  try {
    localStorage.removeItem('lhq_channel');
  } catch (e) {}
})();
