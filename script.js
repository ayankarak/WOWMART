import { initSearch } from './search.js';

(function () {
    'use strict';

    // ===== Mobile Menu Toggle =====
    const hamburgerToggle = document.getElementById('hamburgerToggle');
    const navMenu = document.getElementById('navMenu');

    if (hamburgerToggle && navMenu) {
        hamburgerToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            
            if (navMenu.classList.contains('active')) {
                hamburgerToggle.innerHTML = '&#10005;';
            } else {
                hamburgerToggle.innerHTML = '&#9776;';
            }
        });
    }

    // ===== Mobile Search Toggle & Smart Search Logic =====
    const searchToggle = document.getElementById('mobileSearchToggle');
    const searchPanel  = document.getElementById('mobileSearchPanel');
    const searchInput  = document.getElementById('mobileSearchInput');
    const searchClose  = document.getElementById('mobileSearchClose');
    const searchForm   = document.getElementById('mobileSearchForm');

    if (searchPanel && searchInput && searchForm) {
        function openSearch() {
            searchPanel.classList.add('open');
            searchPanel.setAttribute('aria-hidden', 'false');
            if (searchToggle) {
                searchToggle.classList.add('active');
                searchToggle.setAttribute('aria-expanded', 'true');
            }
            searchInput.tabIndex = 0;
            if (searchClose) searchClose.tabIndex = 0;
            setTimeout(() => searchInput.focus({ preventScroll: true }), 150);
        }

        function closeSearch() {
            searchPanel.classList.remove('open');
            searchPanel.setAttribute('aria-hidden', 'true');
            if (searchToggle) {
                searchToggle.classList.remove('active');
                searchToggle.setAttribute('aria-expanded', 'false');
            }
            searchInput.tabIndex = -1;
            if (searchClose) searchClose.tabIndex = -1;
            searchInput.blur();
        }

        if (searchToggle) {
            searchToggle.addEventListener('click', (e) => {
                e.preventDefault();
                searchPanel.classList.contains('open') ? closeSearch() : openSearch();
            });
        }

        if (searchClose) {
            searchClose.addEventListener('click', closeSearch);
        }

        // Escape key closes the search panel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && searchPanel.classList.contains('open')) {
                closeSearch();
                if (searchToggle) searchToggle.focus();
            }
        });

        // Live suggestions + submit handling for the mobile panel
        const mobileSearch = initSearch({
            form: searchForm,
            input: searchInput,
            mount: searchPanel,
            // let the panel grow while suggestions are showing
            onChange: (open) => searchPanel.classList.toggle('has-results', open)
        });
        searchClose && searchClose.addEventListener('click', () => mobileSearch && mobileSearch.close());

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && searchPanel.classList.contains('open')) {
                closeSearch();
            }
        });
    }

    // ===== Desktop Search Bar (category filter, live suggestions, submit) =====
    initSearch({
        form: document.getElementById('searchForm'),
        input: document.getElementById('searchInput'),
        select: document.getElementById('searchCategory')
    });

    // ===== Global Product Card Click Redirection =====
    document.addEventListener('click', (e) => {
        const item = e.target.closest('.launch-item, .trending-item, .product-card');
        if (!item) return;
        const productId = item.dataset.id;
        if (productId) {
            window.location.href = `pages/product.html?id=${productId}`;
        }
    });

    // ===== Category Navigation Redirection =====
    document.addEventListener('click', (e) => {
        const categoryLink = e.target.closest('.category-link');
        if (!categoryLink) return;

        e.preventDefault();
        const categoryName = categoryLink.dataset.category;
        if (categoryName) {
            window.location.href = `pages/shop.html?category=${encodeURIComponent(categoryName)}`;
        }
    });

})();