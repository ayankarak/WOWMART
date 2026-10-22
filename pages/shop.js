import { PRODUCTS } from './productData.js';

(function () {
    'use strict';

    const grid = document.getElementById('shopGrid');
    const resultCount = document.getElementById('resultCount');
    const breadcrumbCategory = document.getElementById('breadcrumb-category');
    const sortSelect = document.getElementById('sortSelect');

    if (!grid) return;

    // Utility to format price in INR
    const formatPrice = (n) => new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(n);

    // Read URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const categoryQuery = urlParams.get('category');
    const searchQuery = urlParams.get('q');

    // Convert PRODUCTS object to an array with keys as IDs
    let productsList = Object.keys(PRODUCTS).map(id => ({
        id: id,
        ...PRODUCTS[id]
    }));

    // Filter products based on category or search query
    let filteredProducts = productsList.filter(p => {
        if (categoryQuery) {
            return p.category.toLowerCase() === categoryQuery.toLowerCase();
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
        }
        return true; // If no filter, show all
    });

    // Update breadcrumb and heading
    if (categoryQuery) {
        breadcrumbCategory.textContent = categoryQuery;
        resultCount.textContent = `${filteredProducts.length} result${filteredProducts.length === 1 ? '' : 's'} for ${categoryQuery}`;
    } else if (searchQuery) {
        breadcrumbCategory.textContent = `Search: "${searchQuery}"`;
        resultCount.textContent = `${filteredProducts.length} result${filteredProducts.length === 1 ? '' : 's'} for "${searchQuery}"`;
    } else {
        breadcrumbCategory.textContent = 'All Products';
        resultCount.textContent = `${filteredProducts.length} results`;
    }

    // Render products function
    function renderProducts(items) {
        if (items.length === 0) {
            grid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; padding: 40px; color:#666;">No products found.</p>`;
            return;
        }

        grid.innerHTML = items.map(p => `
            <div class="product-card" data-id="${p.id}">
                <img src="${p.images[0]}" alt="${p.title}">
                <h4>${p.title}</h4>
                <div class="price">${formatPrice(p.price)}</div>
            </div>
        `).join('');
    }

    // Sorting functionality
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'low-high') {
                filteredProducts.sort((a, b) => a.price - b.price);
            } else if (val === 'high-low') {
                filteredProducts.sort((a, b) => b.price - a.price);
            } else {
                // Default / Popular (sort by reviews or original order)
                filteredProducts.sort((a, b) => b.reviews - a.reviews);
            }
            renderProducts(filteredProducts);
        });
    }

    // Initial render
    renderProducts(filteredProducts);

    // Click handler for product cards to redirect to product detail page
    grid.addEventListener('click', (e) => {
        const card = e.target.closest('.product-card');
        if (!card) return;
        const productId = card.dataset.id;
        if (productId) {
            window.location.href = `product.html?id=${productId}`;
        }
    });

})();