// =====================================================================
// WOWMART search feature (shared by index.html and pages/shop.html)
//
//  - searchProducts(): ranked, multi-word search over the product catalogue
//  - initSearch():     wires a search form with live suggestions, keyboard
//                      navigation, category filter and recent searches
// =====================================================================
import { PRODUCTS } from './pages/productData.js';

const RECENT_KEY = 'recentSearches';
const MAX_SUGGESTIONS = 6;
const MAX_RECENT = 5;

// ---------- Paths (this file is used from "/" and from "/pages/") ----------
const inPagesDir = window.location.pathname.includes('/pages/');
const PAGES_BASE = inPagesDir ? '' : 'pages/';
// productData.js image paths are written relative to /pages/, so fix them for index.html
const imgSrc = (p) => (inPagesDir ? p : p.replace(/^\.\.\//, ''));
const productUrl = (id) => `${PAGES_BASE}product.html?id=${encodeURIComponent(id)}`;

export function shopUrl(query, category) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    const qs = params.toString();
    return `${PAGES_BASE}shop.html${qs ? '?' + qs : ''}`;
}

// ---------- Helpers ----------
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const formatPrice = (n) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0
}).format(n);

const tokenize = (q) => q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** Wrap each matched term in <mark>, escaping everything else. */
function highlight(text, terms) {
    if (!terms.length) return escapeHtml(text);
    const re = new RegExp(`(${terms.map(escapeRegex).join('|')})`, 'gi');
    return text.split(re)
        .map((part, i) => (i % 2 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)))
        .join('');
}

export function getCategories() {
    return [...new Set(Object.values(PRODUCTS).map((p) => p.category))].sort();
}

// ---------- Core search ----------
/**
 * Returns products matching `query` (every word must match somewhere),
 * best matches first. With an empty query it returns everything in the
 * category. `category` is optional and case-insensitive.
 */
export function searchProducts(query = '', category = '') {
    const terms = tokenize(query);
    const cat = category.trim().toLowerCase();

    const results = [];
    for (const [id, p] of Object.entries(PRODUCTS)) {
        if (cat && p.category.toLowerCase() !== cat) continue;

        const title = p.title.toLowerCase();
        const categoryText = p.category.toLowerCase();
        const desc = (p.description || '').toLowerCase();
        let score = 0;
        let allMatch = true;

        for (const t of terms) {
            if (title.startsWith(t)) score += 100;
            else if (new RegExp(`\\b${escapeRegex(t)}`).test(title)) score += 60;
            else if (title.includes(t)) score += 30;
            else if (categoryText.includes(t)) score += 20;
            else if (desc.includes(t)) score += 5;
            else if (id.toLowerCase().includes(t)) score += 2;
            else { allMatch = false; break; }
        }
        if (!allMatch) continue;
        results.push({ id, ...p, score });
    }
    // Best score first; ties go to the more-reviewed product
    return results.sort((a, b) => b.score - a.score || (b.reviews || 0) - (a.reviews || 0));
}

// ---------- Recent searches ----------
function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
}
function saveRecent(q) {
    q = q.trim();
    if (!q) return;
    const list = [q, ...getRecent().filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
}
function clearRecent() {
    try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
}

// ---------- UI wiring ----------
/**
 * @param {object} o
 * @param {HTMLElement} o.form       element that wraps the input (a <form> or the bar)
 * @param {HTMLInputElement} o.input
 * @param {HTMLSelectElement} [o.select]  optional category dropdown
 * @param {HTMLElement} [o.mount]    where to put the dropdown (defaults to form)
 * @param {Function} [o.onChange]    called when the dropdown opens/closes (open: boolean)
 */
export function initSearch({ form, input, select, mount, onChange }) {
    if (!form || !input) return null;

    const box = document.createElement('div');
    const boxId = `suggest-${Math.random().toString(36).slice(2, 8)}`;
    box.className = 'search-suggest';
    box.id = boxId;
    box.setAttribute('role', 'listbox');
    box.hidden = true;
    (mount || form).appendChild(box);

    input.setAttribute('autocomplete', 'off');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', boxId);
    input.setAttribute('aria-autocomplete', 'list');

    let items = [];     // focusable <a> rows
    let active = -1;

    // Fill the category dropdown (keeps any value already selected)
    if (select) {
        const current = select.value;
        select.innerHTML = '<option value="">All Categories</option>' +
            getCategories().map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        select.value = current;
    }
    const category = () => (select ? select.value : '');

    function setOpen(open) {
        box.hidden = !open;
        input.setAttribute('aria-expanded', String(open));
        if (!open) { active = -1; input.removeAttribute('aria-activedescendant'); }
        if (onChange) onChange(open);
    }

    function setActive(i) {
        items.forEach((el, n) => el.classList.toggle('active', n === i));
        active = i;
        if (items[i]) {
            input.setAttribute('aria-activedescendant', items[i].id);
            items[i].scrollIntoView({ block: 'nearest' });
        } else {
            input.removeAttribute('aria-activedescendant');
        }
    }

    function render() {
        const q = input.value.trim();
        let html = '';

        if (!q) {
            // Empty box: offer recent searches
            const recent = getRecent();
            if (!recent.length) return setOpen(false);
            html = `<div class="suggest-head"><span>Recent searches</span>
                        <button type="button" class="suggest-clear">Clear</button></div>` +
                recent.map((r, i) => `
                    <a class="suggest-row suggest-recent" role="option" id="${boxId}-${i}"
                       href="${shopUrl(r, category())}" data-recent="${escapeHtml(r)}">
                        <i class="fa-solid fa-clock-rotate-left"></i><span>${escapeHtml(r)}</span>
                    </a>`).join('');
        } else {
            const terms = tokenize(q);
            const results = searchProducts(q, category());
            if (!results.length) {
                html = `<div class="suggest-empty">No products found for “${escapeHtml(q)}”.<br>
                        <small>Try a different spelling or a more general word.</small></div>`;
            } else {
                html = results.slice(0, MAX_SUGGESTIONS).map((p, i) => `
                    <a class="suggest-row" role="option" id="${boxId}-${i}" href="${productUrl(p.id)}" data-query="${escapeHtml(q)}">
                        <img src="${escapeHtml(imgSrc(p.images[0]))}" alt="" loading="lazy">
                        <span class="suggest-text">
                            <span class="suggest-title">${highlight(p.title, terms)}</span>
                            <span class="suggest-meta">in ${escapeHtml(p.category)}</span>
                        </span>
                        <span class="suggest-price">${formatPrice(p.price)}</span>
                    </a>`).join('');
                const n = results.length;
                html += `<a class="suggest-row suggest-all" role="option" id="${boxId}-all"
                            href="${shopUrl(q, category())}" data-query="${escapeHtml(q)}">
                            <i class="fa-solid fa-magnifying-glass"></i>
                            <span>See all ${n} result${n === 1 ? '' : 's'} for “${escapeHtml(q)}”</span>
                         </a>`;
            }
        }

        box.innerHTML = html;
        items = [...box.querySelectorAll('.suggest-row')];
        active = -1;
        setOpen(true);
    }

    // ----- Events -----
    input.addEventListener('input', render);
    input.addEventListener('focus', render);
    if (select) select.addEventListener('change', () => { if (document.activeElement === input || !box.hidden) render(); });

    input.addEventListener('keydown', (e) => {
        if (box.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { render(); return; }
        if (box.hidden || !items.length) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive((active + 1) % items.length); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((active - 1 + items.length) % items.length); }
        else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); items[active].click(); }
        else if (e.key === 'Escape') { setOpen(false); }
    });

    // Keep focus in the input while clicking a row, so blur doesn't fire first
    box.addEventListener('mousedown', (e) => e.preventDefault());

    box.addEventListener('click', (e) => {
        if (e.target.closest('.suggest-clear')) {
            clearRecent();
            setOpen(false);
            return;
        }
        const row = e.target.closest('.suggest-row');
        if (!row) return;
        const q = row.dataset.recent || row.dataset.query;
        if (q) saveRecent(q);
        // the <a href> then navigates natively
    });

    // Click/tap anywhere else closes the dropdown
    document.addEventListener('click', (e) => {
        if (!form.contains(e.target) && !box.contains(e.target)) setOpen(false);
    });

    // Submit (Enter or the magnifier button) -> results page
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = input.value.trim();
        const cat = category();
        if (!q && !cat) { input.focus(); return; }
        saveRecent(q);
        window.location.href = shopUrl(q, cat);
    });

    return { close: () => setOpen(false), refresh: render };
}
