/* WOWMART: runs in <head> BEFORE the page paints, so a saved dark theme never flashes light.
   Keep this a plain (non-module) script; the full API is in theme.js. */
(function () {
    var theme = null;
    try { theme = localStorage.getItem('wowmart_theme'); } catch (e) { /* storage blocked */ }
    if (theme !== 'dark' && theme !== 'light') {
        theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
})();
