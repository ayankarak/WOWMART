// =====================================================================
// WOWMART light / dark theme
//
//   <html data-theme="light|dark">  is what dark.css reacts to.
//   The choice is saved in localStorage['wowmart_theme'] and applies on every page.
//   Until the shopper picks one, the device setting (prefers-color-scheme) decides.
//
// theme-init.js (a tiny non-module script in every page's <head>) sets the attribute
// before the page paints, so there is no light-theme flash. This module is the API
// the header toggle uses; it also re-applies the theme on import as a safety net.
// =====================================================================
const KEY = 'wowmart_theme';
export const THEME_EVENT = 'wowmart:theme-changed';

function stored() {
    try { const t = localStorage.getItem(KEY); return t === 'dark' || t === 'light' ? t : null; } catch { return null; }
}

/** Current theme: the saved choice, else the device preference, else light. */
export function getTheme() {
    return stored() || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#121820' : '#0071ce');
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { theme } }));
}

export function setTheme(theme) {
    if (theme !== 'dark' && theme !== 'light') return;
    try { localStorage.setItem(KEY, theme); } catch { /* storage blocked: the theme still changes for this page */ }
    applyTheme(theme);
}

export const toggleTheme = () => { const next = getTheme() === 'dark' ? 'light' : 'dark'; setTheme(next); return next; };

applyTheme(getTheme());

// Another tab changed the theme
window.addEventListener('storage', (e) => { if (e.key === KEY) applyTheme(getTheme()); });
