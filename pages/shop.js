// =====================================================================
// WOWMART shop page (pages/shop.html)
//
//   shop.html                      -> every product
//   shop.html?category=Men         -> one category
//   shop.html?q=shirt              -> search results (best match first)
//   shop.html?q=shirt&category=Men -> search inside a category
//
// FILTERS (built from the products on this page, so they always match what is for sale):
//   price range slider · brands (with search) · sizes · colours
//   Inside one filter the choices are OR (Nike OR Adidas); different filters are AND.
//   The number next to each choice is how many products you would get if you picked it.
// SORT: Popular · Price low-high · Price high-low · Newest · Customer rating (+ Best match for searches)
// The chosen filters + sort live in the URL (?sort=&min=&max=&brand=&size=&color=) so the
// page can be shared / bookmarked and survives a refresh.
//
// The header (menu, search bars) is rendered by ../header.js.
// =====================================================================
import { initSiteHeader } from '../header.js';
import { searchProducts } from '../search.js';
import { productUrl } from '../paths.js';
import { initCartButtons } from '../cart.js';
import { heartButtonHtml } from '../wishlist.js';
import { getRatingSummary } from '../reviews.js';
import { getBrand, getNewestRank } from './productMeta.js';

initSiteHeader();
initCartButtons();   // quick "Add to Cart" on the cards below

(function () {
    'use strict';

    const grid = document.getElementById('shopGrid');
    if (!grid) return;
    const $ = (id) => document.getElementById(id);
    const resultCount = $('resultCount'), breadcrumbCategory = $('breadcrumb-category'), sortSelect = $('sortSelect');
    const filterBody = $('filterBody'), clearAllBtn = $('clearFilters'), chips = $('activeChips');
    const panel = $('filterPanel'), filterToggle = $('filterToggle'), filterBadge = $('filterBadge');

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
    function starsHTML(rating) {
        let h = '';
        for (let i = 1; i <= 5; i++) h += rating >= i ? '<i class="fa-solid fa-star"></i>' : rating >= i - 0.5 ? '<i class="fa-solid fa-star-half-stroke"></i>' : '<i class="fa-regular fa-star"></i>';
        return h;
    }

    // ----- Read the URL -----
    const params = new URLSearchParams(window.location.search);
    const categoryQuery = (params.get('category') || '').trim();
    const searchQuery = (params.get('q') || '').trim();

    // ----- Products on this page: ranked search, optionally inside a category -----
    const rows = searchProducts(searchQuery, categoryQuery).map((p, i) => {
        const r = getRatingSummary(p.id);              // catalogue rating blended with reviews written on this site
        return { ...p, brand: getBrand(p.id), relevance: i, newest: getNewestRank(p.id), avg: r.average, count: r.count };
    });

    // ----- Filter bounds -----
    const prices = rows.map((r) => r.price);
    const span = prices.length ? Math.max(...prices) - Math.min(...prices) : 0;
    const STEP = span > 20000 ? 500 : span > 5000 ? 100 : span > 500 ? 10 : 1;
    const LOW = prices.length ? Math.floor(Math.min(...prices) / STEP) * STEP : 0;
    const HIGH = prices.length ? Math.ceil(Math.max(...prices) / STEP) * STEP : 0;

    const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    const sizeRank = (s) => { const i = SIZE_ORDER.indexOf(s); return i >= 0 ? [0, i, ''] : !isNaN(parseFloat(s)) ? [1, parseFloat(s), ''] : [2, 0, s]; };
    const cmpSize = (a, b) => { const x = sizeRank(a), y = sizeRank(b); return x[0] - y[0] || x[1] - y[1] || x[2].localeCompare(y[2]); };

    const brandNames = [...new Set(rows.map((r) => r.brand))];
    const sizeNames = [...new Set(rows.flatMap((r) => r.sizes || []))].sort(cmpSize);
    const colorMap = new Map();                         // name -> hex
    rows.forEach((r) => (r.colors || []).forEach((c) => { if (!colorMap.has(c.name)) colorMap.set(c.name, c.hex); }));

    // ----- State (from the URL, validated against what exists) -----
    const num = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
    const list = (k, allowed) => new Set((params.get(k) || '').split(',').map((x) => x.trim()).filter((x) => allowed.includes(x)));
    const SORTS = [['popular', 'Popular'], ['low-high', 'Price: Low to High'], ['high-low', 'Price: High to Low'], ['newest', 'Newest'], ['rating', 'Customer Rating']];
    if (searchQuery) SORTS.unshift(['relevance', 'Best Match']);
    const state = {
        sort: SORTS.some(([v]) => v === params.get('sort')) ? params.get('sort') : SORTS[0][0],
        min: Math.max(LOW, Math.min(HIGH, num(params.get('min'), LOW))),
        max: Math.max(LOW, Math.min(HIGH, num(params.get('max'), HIGH))),
        brands: list('brand', brandNames), sizes: list('size', sizeNames), colors: list('color', [...colorMap.keys()])
    };
    if (state.min > state.max) [state.min, state.max] = [state.max, state.min];

    // ----- Matching (skip = ignore one filter, used to count "what if I pick this") -----
    function matches(r, skip) {
        if (skip !== 'price' && (r.price < state.min || r.price > state.max)) return false;
        if (skip !== 'brand' && state.brands.size && !state.brands.has(r.brand)) return false;
        if (skip !== 'size' && state.sizes.size && !(r.sizes || []).some((s) => state.sizes.has(s))) return false;
        if (skip !== 'color' && state.colors.size && !(r.colors || []).some((c) => state.colors.has(c.name))) return false;
        return true;
    }
    const priceActive = () => state.min > LOW || state.max < HIGH;
    const activeCount = () => (priceActive() ? 1 : 0) + state.brands.size + state.sizes.size + state.colors.size;

    // ----- Sorting -----
    const SORT_FN = {
        relevance: (a, b) => a.relevance - b.relevance,
        popular: (a, b) => b.count - a.count || b.avg - a.avg || a.relevance - b.relevance,
        'low-high': (a, b) => a.price - b.price || a.relevance - b.relevance,
        'high-low': (a, b) => b.price - a.price || a.relevance - b.relevance,
        newest: (a, b) => b.newest - a.newest,
        rating: (a, b) => b.avg - a.avg || b.count - a.count || a.relevance - b.relevance
    };

    // =================================================================
    // Sidebar (built once; later changes only update counts / values in place so sliders keep focus)
    // =================================================================
    function buildFilters() {
        if (!rows.length) { filterBody.innerHTML = '<p class="filter-empty">No filters available.</p>'; return; }
        const group = (title, id, inner) => `<div class="filter-group" id="${id}"><h4>${title}</h4>${inner}</div>`;

        const priceHtml = HIGH > LOW ? group('Price', 'fgPrice', `
            <div class="range-dual">
                <div class="range-track"></div><div class="range-fill" id="rangeFill"></div>
                <input type="range" id="priceMin" min="${LOW}" max="${HIGH}" step="${STEP}" aria-label="Minimum price">
                <input type="range" id="priceMax" min="${LOW}" max="${HIGH}" step="${STEP}" aria-label="Maximum price">
            </div>
            <div class="price-readout"><span id="priceMinText"></span><span>to</span><span id="priceMaxText"></span></div>`) : '';

        const brandHtml = brandNames.length > 1 ? group('Brand', 'fgBrand', `
            ${brandNames.length > 6 ? '<div class="search-brand"><input type="text" id="brandSearch" placeholder="Search brand..." aria-label="Search brands"></div>' : ''}
            <ul class="brand-list" id="brandList">${brandNames.slice().sort((a, b) => a.localeCompare(b)).map((b) =>
                `<li data-name="${esc(b.toLowerCase())}"><label><span class="brand-name"><input type="checkbox" value="${esc(b)}"${state.brands.has(b) ? ' checked' : ''}> ${esc(b)}</span><span class="facet-count" data-count-brand="${esc(b)}"></span></label></li>`).join('')}</ul>`) : '';

        const sizeHtml = sizeNames.length ? group('Size', 'fgSize', `
            <div class="size-grid" id="sizeGrid">${sizeNames.map((s) =>
                `<button type="button" class="size-pill${state.sizes.has(s) ? ' active' : ''}" data-size="${esc(s)}" aria-pressed="${state.sizes.has(s)}">${esc(s)}</button>`).join('')}</div>`) : '';

        const colorHtml = colorMap.size > 1 ? group('Colour', 'fgColor', `
            <div class="color-grid" id="colorGrid">${[...colorMap].map(([name, hex]) =>
                `<button type="button" class="color-dot${state.colors.has(name) ? ' active' : ''}" style="background:${esc(hex)}" data-color="${esc(name)}" aria-pressed="${state.colors.has(name)}" aria-label="${esc(name)}" title="${esc(name)}"></button>`).join('')}</div>`) : '';

        filterBody.innerHTML = priceHtml + brandHtml + sizeHtml + colorHtml;
    }

    function syncPriceUI() {
        const mn = $('priceMin'), mx = $('priceMax');
        if (!mn || !mx) return;
        mn.value = state.min; mx.value = state.max;
        const span = HIGH - LOW || 1;
        const fill = $('rangeFill');
        fill.style.left = ((state.min - LOW) / span) * 100 + '%';
        fill.style.right = (100 - ((state.max - LOW) / span) * 100) + '%';
        $('priceMinText').textContent = money(state.min);
        $('priceMaxText').textContent = money(state.max);
        mn.style.zIndex = state.min > HIGH - STEP * 2 ? 5 : 3;      // keep the left thumb reachable when both sit at the right edge
    }

    function updateCounts() {
        document.querySelectorAll('[data-count-brand]').forEach((el) => {
            const n = rows.filter((r) => r.brand === el.dataset.countBrand && matches(r, 'brand')).length;
            el.textContent = n;
            el.closest('li').classList.toggle('zero', n === 0 && !state.brands.has(el.dataset.countBrand));
        });
        document.querySelectorAll('#sizeGrid .size-pill').forEach((b) => {
            const n = rows.filter((r) => (r.sizes || []).includes(b.dataset.size) && matches(r, 'size')).length;
            b.classList.toggle('zero', n === 0 && !state.sizes.has(b.dataset.size));
            b.title = `${n} product${n === 1 ? '' : 's'}`;
        });
        document.querySelectorAll('#colorGrid .color-dot').forEach((b) => {
            const n = rows.filter((r) => (r.colors || []).some((c) => c.name === b.dataset.color) && matches(r, 'color')).length;
            b.classList.toggle('zero', n === 0 && !state.colors.has(b.dataset.color));
            b.title = `${b.dataset.color} (${n})`;
        });
    }

    // =================================================================
    // Results
    // =================================================================
    function headline(n) {
        const plural = n === 1 ? '' : 's';
        const inCat = categoryQuery ? ` in ${categoryQuery}` : '';
        const base = searchQuery ? `${n} result${plural} for "${searchQuery}"${inCat}` : categoryQuery ? `${n} result${plural} for ${categoryQuery}` : `${n} result${plural}`;
        return activeCount() ? `${base} (filtered from ${rows.length})` : base;
    }

    function cardHtml(p) {
        const out = !(p.stock > 0);
        return `
            <div class="product-card" data-id="${esc(p.id)}">
                ${heartButtonHtml(p.id)}
                <img src="${esc(p.images[0])}" alt="${esc(p.title)}" loading="lazy">
                <div class="card-brand">${esc(p.brand)}</div>
                <h4>${esc(p.title)}</h4>
                <div class="card-rating" aria-label="Rated ${p.avg} out of 5 from ${p.count} reviews"><span class="stars">${starsHTML(p.avg)}</span><span class="card-reviews">(${p.count})</span></div>
                <div class="price">${money(p.price)}</div>
                <button type="button" class="card-cart-btn" data-add-to-cart data-id="${esc(p.id)}"${out ? ' disabled' : ''}>${out ? 'Out of stock' : (p.sizes && p.sizes.length ? 'Choose size' : 'Add to Cart')}</button>
            </div>`;
    }

    function renderChips() {
        const c = [];
        if (priceActive()) c.push(['price', '', `${money(state.min)} – ${money(state.max)}`]);
        state.brands.forEach((v) => c.push(['brand', v, v]));
        state.sizes.forEach((v) => c.push(['size', v, `Size ${v}`]));
        state.colors.forEach((v) => c.push(['color', v, v]));
        chips.innerHTML = c.map(([k, v, label]) =>
            `<button type="button" class="chip" data-kind="${k}" data-value="${esc(v)}" aria-label="Remove filter ${esc(label)}">${esc(label)} <i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`).join('');
        const n = activeCount();
        clearAllBtn.hidden = n === 0;
        filterBadge.hidden = n === 0;
        filterBadge.textContent = n;
    }

    function syncUrl() {
        const q = new URLSearchParams(window.location.search);
        ['sort', 'min', 'max', 'brand', 'size', 'color'].forEach((k) => q.delete(k));
        if (state.sort !== SORTS[0][0]) q.set('sort', state.sort);
        if (state.min > LOW) q.set('min', state.min);
        if (state.max < HIGH) q.set('max', state.max);
        if (state.brands.size) q.set('brand', [...state.brands].join(','));
        if (state.sizes.size) q.set('size', [...state.sizes].join(','));
        if (state.colors.size) q.set('color', [...state.colors].join(','));
        const qs = q.toString();
        try { history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '')); } catch { /* file:// or sandbox */ }
    }

    function update() {
        const shown = rows.filter((r) => matches(r)).sort(SORT_FN[state.sort]);
        resultCount.textContent = headline(shown.length);
        grid.innerHTML = shown.length ? shown.map(cardHtml).join('') : `
            <div class="no-results">
                <p><strong>No products match these filters.</strong></p>
                ${activeCount() ? '<button type="button" class="btn-clear" data-clear-all>Clear all filters</button>' : '<p>Try a different search.</p>'}
            </div>`;
        renderChips(); updateCounts(); syncUrl();
    }

    function clearAll() {
        state.min = LOW; state.max = HIGH;
        state.brands.clear(); state.sizes.clear(); state.colors.clear();
        document.querySelectorAll('#brandList input').forEach((i) => { i.checked = false; });
        document.querySelectorAll('#sizeGrid .size-pill, #colorGrid .color-dot').forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
        syncPriceUI(); update();
    }

    // =================================================================
    // Wiring
    // =================================================================
    // Headings
    breadcrumbCategory.textContent = searchQuery ? `Search: "${searchQuery}"${categoryQuery ? ` in ${categoryQuery}` : ''}` : (categoryQuery || 'All Products');
    document.title = `${searchQuery || categoryQuery || 'Shop'} - WOWMART`;

    // Sort dropdown
    sortSelect.innerHTML = SORTS.map(([v, l]) => `<option value="${v}"${v === state.sort ? ' selected' : ''}>${l}</option>`).join('');
    sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; update(); });

    buildFilters(); syncPriceUI();

    // Price sliders: clamp so min never passes max; results follow the thumb live
    const onPrice = (which) => () => {
        let mn = Number($('priceMin').value), mx = Number($('priceMax').value);
        if (which === 'min') mn = Math.min(mn, mx); else mx = Math.max(mx, mn);   // the handles may touch, never cross
        state.min = mn; state.max = mx; syncPriceUI(); update();
    };
    if ($('priceMin')) { $('priceMin').addEventListener('input', onPrice('min')); $('priceMax').addEventListener('input', onPrice('max')); }

    filterBody.addEventListener('change', (e) => {                   // brand checkboxes
        const cb = e.target.closest('#brandList input[type=checkbox]');
        if (!cb) return;
        cb.checked ? state.brands.add(cb.value) : state.brands.delete(cb.value);
        update();
    });
    filterBody.addEventListener('input', (e) => {                    // brand search box
        if (e.target.id !== 'brandSearch') return;
        const t = e.target.value.trim().toLowerCase();
        document.querySelectorAll('#brandList li').forEach((li) => { li.hidden = !!t && !li.dataset.name.includes(t); });
    });
    filterBody.addEventListener('click', (e) => {                    // size pills + colour dots
        const pill = e.target.closest('.size-pill'), dot = e.target.closest('.color-dot');
        const btn = pill || dot;
        if (!btn) return;
        const set = pill ? state.sizes : state.colors, val = pill ? btn.dataset.size : btn.dataset.color;
        const on = !set.has(val);
        on ? set.add(val) : set.delete(val);
        btn.classList.toggle('active', on); btn.setAttribute('aria-pressed', String(on));
        update();
    });

    chips.addEventListener('click', (e) => {                         // "x" on an active filter chip
        const chip = e.target.closest('.chip');
        if (!chip) return;
        const { kind, value } = chip.dataset;
        if (kind === 'price') { state.min = LOW; state.max = HIGH; syncPriceUI(); }
        else if (kind === 'brand') { state.brands.delete(value); const cb = [...document.querySelectorAll('#brandList input')].find((i) => i.value === value); if (cb) cb.checked = false; }
        else { const set = kind === 'size' ? state.sizes : state.colors; set.delete(value); const b = [...document.querySelectorAll(kind === 'size' ? '#sizeGrid .size-pill' : '#colorGrid .color-dot')].find((x) => (x.dataset.size || x.dataset.color) === value); if (b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); } }
        update();
    });
    clearAllBtn.addEventListener('click', clearAll);
    grid.addEventListener('click', (e) => { if (e.target.closest('[data-clear-all]')) clearAll(); });

    // Mobile: filters slide open from a button
    filterToggle.addEventListener('click', () => {
        const open = panel.classList.toggle('open');
        filterToggle.setAttribute('aria-expanded', String(open));
    });

    update();

    // ----- Product card click -> product page (hearts / Add to Cart stop their own clicks) -----
    grid.addEventListener('click', (e) => {
        const card = e.target.closest('.product-card');
        if (card && card.dataset.id && !e.target.closest('[data-clear-all]')) window.location.href = productUrl(card.dataset.id);
    });
})();
