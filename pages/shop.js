// =====================================================================
// WOWMART shop page (pages/shop.html)
//
//   shop.html                     -> every product
//   shop.html?category=Men        -> one category
//   shop.html?q=shirt             -> search results (same ranking as the dropdown)
//   shop.html?q=shirt&category=Men -> search inside a category
//
// The header (menu, search bars) is rendered by ../header.js.
// =====================================================================
import { initSiteHeader } from '../header.js';
import { searchProducts } from '../search.js';
import { productUrl } from '../paths.js';
import { initCartButtons } from '../cart.js';

initSiteHeader();
initCartButtons();   // quick "Add to Cart" on the cards below

(function () {
    'use strict';

    const grid = document.getElementById('shopGrid');
    const resultCount = document.getElementById('resultCount');
    const breadcrumbCategory = document.getElementById('breadcrumb-category');
    const sortSelect = document.getElementById('sortSelect');

    if (!grid) return;

    const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));

    const formatPrice = (n) => new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(n);

    // ----- Read the URL -----
    const urlParams = new URLSearchParams(window.location.search);
    const categoryQuery = (urlParams.get('category') || '').trim();
    const searchQuery = (urlParams.get('q') || '').trim();

    // ----- Find products: ranked search (best match first), optionally limited to a category -----
    const baseResults = searchProducts(searchQuery, categoryQuery);
    let filteredProducts = [...baseResults];

    // ----- Headings -----
    const count = filteredProducts.length;
    const plural = count === 1 ? '' : 's';
    if (searchQuery) {
        const inCategory = categoryQuery ? ` in ${categoryQuery}` : '';
        breadcrumbCategory.textContent = `Search: "${searchQuery}"${inCategory}`;
        resultCount.textContent = `${count} result${plural} for "${searchQuery}"${inCategory}`;
    } else if (categoryQuery) {
        breadcrumbCategory.textContent = categoryQuery;
        resultCount.textContent = `${count} result${plural} for ${categoryQuery}`;
    } else {
        breadcrumbCategory.textContent = 'All Products';
        resultCount.textContent = `${count} result${plural}`;
    }
    document.title = `${searchQuery || categoryQuery || 'Shop'} - WOWMART`;

    // ----- Render -----
    function renderProducts(items) {
        if (items.length === 0) {
            grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; padding: 40px; color:#666;">No products found.</p>`;
            return;
        }

        grid.innerHTML = items.map((p) => `
            <div class="product-card" data-id="${escapeHtml(p.id)}">
                <img src="${escapeHtml(p.images[0])}" alt="${escapeHtml(p.title)}">
                <h4>${escapeHtml(p.title)}</h4>
                <div class="price">${formatPrice(p.price)}</div>
                <button type="button" class="card-cart-btn" data-add-to-cart data-id="${escapeHtml(p.id)}"${p.stock > 0 ? '' : ' disabled'}>${p.stock > 0 ? (p.sizes && p.sizes.length ? 'Choose size' : 'Add to Cart') : 'Out of stock'}</button>
            </div>
        `).join('');
    }

    // ----- Sorting -----
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'low-high') {
                filteredProducts.sort((a, b) => a.price - b.price);
            } else if (val === 'high-low') {
                filteredProducts.sort((a, b) => b.price - a.price);
            } else {
                // Popular = the search ranking (best match, then most reviewed)
                filteredProducts = [...baseResults];
            }
            renderProducts(filteredProducts);
        });
    }

    renderProducts(filteredProducts);

    // ----- Product card click -> product page -----
    grid.addEventListener('click', (e) => {
        const card = e.target.closest('.product-card');
        if (card && card.dataset.id) window.location.href = productUrl(card.dataset.id);
    });
})();
