const hamburgerToggle = document.getElementById('hamburgerToggle');
    const navMenu = document.getElementById('navMenu');

    hamburgerToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
                    
    // Optional: Animate hamburger icon between ☰ and ✕
    if (navMenu.classList.contains('active')) {
        hamburgerToggle.innerHTML = '&#10005;'; // Close cross icon
        } else {
            hamburgerToggle.innerHTML = '&#9776;'; // Hamburger icon
        }
    });


            // ===== Mobile Search toggle =====
    const searchToggle = document.getElementById('mobileSearchToggle');
    const searchPanel  = document.getElementById('mobileSearchPanel');
    const searchInput  = document.getElementById('mobileSearchInput');
    const searchClose  = document.getElementById('mobileSearchClose');
    const searchForm   = document.getElementById('mobileSearchForm');

    function openSearch() {
        searchPanel.classList.add('open');
        searchPanel.setAttribute('aria-hidden', 'false');
        searchToggle.classList.add('active');
        searchToggle.setAttribute('aria-expanded', 'true');
        searchInput.tabIndex = 0;
        searchClose.tabIndex = 0;
        // focus after the slide animation starts so the keyboard opens smoothly
        setTimeout(() => searchInput.focus({ preventScroll: true }), 150);
    }

    function closeSearch() {
        searchPanel.classList.remove('open');
        searchPanel.setAttribute('aria-hidden', 'true');
        searchToggle.classList.remove('active');
        searchToggle.setAttribute('aria-expanded', 'false');
        searchInput.tabIndex = -1;
        searchClose.tabIndex = -1;
        searchInput.blur();
    }

            searchToggle.addEventListener('click', (e) => {
                e.preventDefault(); // stop the #search anchor from jumping
                searchPanel.classList.contains('open') ? closeSearch() : openSearch();
            });

            searchClose.addEventListener('click', closeSearch);

            // Escape key closes the panel
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && searchPanel.classList.contains('open')) {
                    closeSearch();
                    searchToggle.focus();
                }
            });

            // Handle submit (replace the alert with your real search / redirect)
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = searchInput.value.trim();
                if (query) {
                    console.log('Searching for:', query);
                    // window.location.href = 'search.html?q=' + encodeURIComponent(query);
                }
            });

            // If the window grows back to desktop size, reset the panel
            window.addEventListener('resize', () => {
                if (window.innerWidth > 768 && searchPanel.classList.contains('open')) {
                    closeSearch();
                }
            });

            document.addEventListener('click', (e) => {
    const item = e.target.closest('.launch-item, .trending-item');
    if (!item) return;
    const productId = item.dataset.id;
    if (productId) {
        window.location.href = `pages/product.html?id=${productId}`;
    }
});