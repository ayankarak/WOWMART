import { initSiteHeader } from '../header.js';
import { searchProducts } from '../search.js';
import { productUrl } from '../paths.js';
import { initCartButtons } from '../cart.js';
import { bindWishlist, wishlistButton, isWishlisted } from '../wishlist.js';
import { PRODUCTS } from './productData.js';

initSiteHeader();
initCartButtons();   // quick "Add to Cart" on the cards below
bindWishlist(document.getElementById('shopGrid') || document);

(function () {
    'use strict';

    const grid = document.getElementById('shopGrid');
    const resultCount = document.getElementById('resultCount');
    const breadcrumbCategory = document.getElementById('breadcrumb-category');
    const sortSelect = document.getElementById('sortSelect');
    const priceRange = document.getElementById('priceRange');
    const brandList = document.getElementById('brandFilterList');
    const sizeList = document.querySelector('.size-grid');
    const colorList = document.getElementById('colorFilterList');
    const minPriceLabel = document.getElementById('minPriceLabel');
    const maxPriceLabel = document.getElementById('maxPriceLabel');

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
    const productsWithMeta = baseResults.map((p, index) => ({ 
        ...p, 
        _index: index, 
        brand: p.brand || inferBrand(p), 
        createdAt: p.createdAt || index, 
        popularity: p.popularity || (Number(p.rating || 0) * 100 + Number(p.reviews || 0)) 
    }));
    
    let filteredProducts = [...productsWithMeta];
    let activeSort = 'popular';
    const maxAvailablePrice = Math.max(1000, ...productsWithMeta.map(p => Number(p.price) || 0));
    
    if (priceRange) { 
        priceRange.max = String(Math.ceil(maxAvailablePrice / 100) * 100); 
        priceRange.value = priceRange.max; 
    }

    function inferBrand(p) { 
        const t = `${p.title || ''} ${p.category || ''}`.toLowerCase(); 
        for (const b of ['Nike', 'Adidas', 'Apple', 'Uniqlo', 'Samsung', 'Oppo', 'Puma', 'Zara', 'Sony']) {
            if (t.includes(b.toLowerCase())) return b;
        }
        if (/shoe|sneaker|running|loafers|sandals|slippers|footwear/.test(t)) return 'Nike'; 
        if (/phone|mobile|laptop|electronics/.test(t)) return /oppo/.test(t) ? 'Oppo' : 'Apple'; 
        if (/women|woman|men|kids|shirt|dress|jeans|hoodie|kurti/.test(t)) return 'Uniqlo'; 
        return 'Other'; 
    }

    if (brandList) {
        const brands = [...new Set(productsWithMeta.map(p => p.brand))].sort();
        brandList.innerHTML = brands.map(brand => `<li><label><input type="checkbox" value="${escapeHtml(brand)}"> ${escapeHtml(brand)}</label></li>`).join('');
    }

    if (colorList) {
        const colors = [...new Set(productsWithMeta.flatMap(p => (p.colors || []).map(c => c.name)))].sort();
        if (colors.length) {
            colorList.innerHTML = colors.map(color => `<label><input type="checkbox" value="${escapeHtml(color)}"> ${escapeHtml(color)}</label>`).join('');
        }
    }

    function checkedValues(root) { 
        return root ? [...root.querySelectorAll('input[type=checkbox]:checked')].map(x => x.value) : []; 
    }

    function applyFilters() {
        const brands = checkedValues(brandList);
        const sizes = checkedValues(sizeList);
        const colors = checkedValues(colorList);
        const maxPrice = priceRange ? Number(priceRange.value) : Infinity;

        filteredProducts = productsWithMeta.filter(p => 
            Number(p.price) <= maxPrice && 
            (!brands.length || brands.includes(p.brand)) && 
            (!sizes.length || (p.sizes || []).some(x => sizes.includes(x))) && 
            (!colors.length || (p.colors || []).some(x => colors.includes(x.name)))
        );

        if (activeSort === 'low-high') filteredProducts.sort((a, b) => a.price - b.price);
        else if (activeSort === 'high-low') filteredProducts.sort((a, b) => b.price - a.price);
        else if (activeSort === 'newest') filteredProducts.sort((a, b) => a._index - b._index);
        else filteredProducts.sort((a, b) => b.popularity - a.popularity);

        if (maxPriceLabel) maxPriceLabel.textContent = formatPrice(maxPrice);
        if (minPriceLabel) minPriceLabel.textContent = formatPrice(0);
        resultCount.textContent = `${filteredProducts.length} product${filteredProducts.length === 1 ? '' : 's'} found`;
        
        renderProducts(filteredProducts);
    }

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
                <div class="shop-card-image"><img src="${escapeHtml(p.images[0])}" alt="${escapeHtml(p.title)}">${wishlistButton(p.id, isWishlisted(p.id))}</div>
                <h4>${escapeHtml(p.title)}</h4>
                <div class="price">${formatPrice(p.price)}</div>
                <button type="button" class="card-cart-btn" data-add-to-cart data-id="${escapeHtml(p.id)}"${p.stock > 0 ? '' : ' disabled'}>${p.stock > 0 ? (p.sizes && p.sizes.length ? 'Choose size' : 'Add to Cart') : 'Out of stock'}</button>
            </div>
        `).join('');
    }

    // ----- Live filters + sorting -----
    if (sortSelect) {
        sortSelect.addEventListener('change', e => {
            activeSort = e.target.value; 
            applyFilters();
        });
    }

    [brandList, sizeList, colorList].forEach(root => {
        if (root) root.addEventListener('change', applyFilters);
    });

    if (priceRange) {
        priceRange.addEventListener('input', applyFilters);
    }

    const brandSearch = document.querySelector('.search-brand input');
    if (brandSearch && brandList) {
        brandSearch.addEventListener('input', () => {
            const q = brandSearch.value.toLowerCase();
            brandList.querySelectorAll('li').forEach(li => {
                li.hidden = !li.textContent.toLowerCase().includes(q);
            });
        });
    }

    applyFilters();

    // ----- Product card click -> product page -----
    grid.addEventListener('click', (e) => {
        const card = e.target.closest('.product-card');
        if (card && card.dataset.id && !e.target.closest('button')) {
            window.location.href = productUrl(card.dataset.id);
        }
    });
})();