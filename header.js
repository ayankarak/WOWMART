// =====================================================================
// WOWMART shared site header
//
// ONE place that defines the header markup (top bar, main header with search,
// mobile action bar, mobile search panel, category nav + hamburger) and
// ONE place that wires its behaviour. Every page just does:
//
//     <div id="site-header"></div>            <- in the HTML
//     import { initSiteHeader } from '.../header.js';
//     initSiteHeader();                       <- in the page script
//
// All links are built with paths.js, so they are correct from any folder.
// Styles live in header.css (scoped to #site-header).
// =====================================================================
import { initSearch } from './search.js';
import { homeUrl, accountUrl, shopUrl, cartUrl, wishlistUrl, trackingUrl } from './paths.js';
import { initCartBadge } from './cart.js';
import { initWishlistBadge } from './wishlist.js';
import { getTheme, toggleTheme, THEME_EVENT } from './theme.js';

const MOBILE_BREAKPOINT = 768; // keep in sync with header.css

// Category nav: label shown + Font Awesome icon. The label is also the
// `category` value that shop.html filters on (see productData.js).
const NAV_CATEGORIES = [
    { name: 'Women',         icon: 'fa-person-dress' },
    { name: 'Men',           icon: 'fa-shirt' },
    { name: 'Kids',          icon: 'fa-baby-carriage' },
    { name: 'Footwear',      icon: 'fa-shoe-prints' },
    { name: 'Electronics',   icon: 'fa-laptop' },
    { name: 'Mobiles',       icon: 'fa-mobile-screen' },
    { name: 'Home & Living', icon: 'fa-house' },
    { name: 'Grocery',       icon: 'fa-basket-shopping' },
    { name: 'Beauty',        icon: 'fa-spa' }
];

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// ---------------------------------------------------------------------
// Markup
// ---------------------------------------------------------------------
function headerTemplate() {
    const account = accountUrl();
    const searchPlaceholder = 'Search for products, brands and more';

    const navLinks = NAV_CATEGORIES.map((c) => `
            <a href="${shopUrl('', c.name)}" class="category-link" data-category="${escapeHtml(c.name)}"><i class="fa-solid ${c.icon}"></i>${escapeHtml(c.name)}</a>`
    ).join('');

    return `
    <div class="top-bar">
        <div class="container top-bar-flex">
            <div class="top-left">
                <span><i class="fa-solid id-badge"></i> My City: Bengaluru</span>
                <span><i class="fa-solid fa-phone"></i> +91-0000000000</span>
            </div>
            <div class="top-right">
                <a href="#">Wholesale</a>
                <a href="#">Blog</a>
                <a href="#">Community</a>
                <a href="${trackingUrl()}">Track Order</a>
                <a href="${account}">My Account</a>
                <button type="button" class="theme-toggle" data-theme-toggle></button>
            </div>
        </div>
    </div>

    <header class="main-header">
        <div class="container header-flex">
            <a class="logo" href="${homeUrl()}" aria-label="WOWMART home">
                <i class="fa-solid fa-cart-shopping logo-icon"></i>
                <span class="logo-text">WOWMART</span>
            </a>
            <form class="search-bar" id="searchForm" role="search">
                <select class="category-select" id="searchCategory" aria-label="Search category">
                    <option value="">All Categories</option>
                </select>
                <input type="text" id="searchInput" placeholder="${searchPlaceholder}" aria-label="Search products">
                <button type="submit" class="search-btn" aria-label="Search"><i class="fa-solid fa-magnifying-glass"></i></button>
            </form>
            <div class="cart-action">
                <a class="cart-btn" href="${cartUrl()}" data-cart-label><i class="fa-solid fa-cart-shopping"></i> My Cart (<span data-cart-count>0</span>)</a>
            </div>
            <div class="cart-action">
                <a class="cart-btn" href="${wishlistUrl()}" data-wishlist-label><i class="fa-solid fa-heart"></i> Wishlist (<span data-wishlist-count>0</span>)</a>
            </div>
            <div class="cart-action">
                <a href="${account}" class="cart-btn" data-account-link>
                    <i class="fa-solid fa-user"></i> <span data-account-label>Account</span>
                </a>
            </div>
        </div>
    </header>

    <div class="mobile-header-actions">
        <a href="#categories" class="mobile-action-item" id="mobileCategoriesToggle">
            <i class="fa fa-th-large"></i>
            <span>Categories</span>
        </a>
        <a href="#search" class="mobile-action-item" id="mobileSearchToggle" role="button" aria-controls="mobileSearchPanel" aria-expanded="false">
            <i class="fa fa-search"></i>
            <span>Search</span>
        </a>
        <a href="${account}" class="mobile-action-item" data-account-link>
            <i class="fa fa-user"></i>
            <span data-account-label>Account</span>
        </a>
        <a href="${wishlistUrl()}" class="mobile-action-item" data-wishlist-label>
            <i class="fa fa-heart"></i>
            <span>Wishlist (<span data-wishlist-count>0</span>)</span>
        </a>
        <a href="${cartUrl()}" class="mobile-action-item" data-cart-label>
            <i class="fa fa-shopping-cart"></i>
            <span>Cart (<span data-cart-count>0</span>)</span>
        </a>
        <button type="button" class="mobile-action-item theme-toggle-mobile" data-theme-toggle></button>
    </div>

    <div class="mobile-search-panel" id="mobileSearchPanel" aria-hidden="true">
        <form class="mobile-search-form" id="mobileSearchForm" role="search">
            <i class="fa-solid fa-magnifying-glass mobile-search-icon"></i>
            <input type="search" id="mobileSearchInput" placeholder="${searchPlaceholder}" aria-label="Search" tabindex="-1">
            <button type="button" class="mobile-search-close" id="mobileSearchClose" aria-label="Close search" tabindex="-1">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </form>
    </div>

    <nav class="nav-bar" aria-label="Product categories">
        <button class="hamburger-btn" id="hamburgerToggle" type="button" aria-label="Toggle navigation" aria-controls="navMenu" aria-expanded="false">&#9776;</button>
        <div class="container nav-flex" id="navMenu">${navLinks}
        </div>
    </nav>`;
}

// ---------------------------------------------------------------------
// Behaviour
// ---------------------------------------------------------------------

/** Show the signed-in username (auth.js stores it under `loggedInUser`). */
function initAccountLabel(root) {
    let user = null;
    try { user = localStorage.getItem('loggedInUser'); } catch { /* storage unavailable */ }
    if (!user) return;
    root.querySelectorAll('[data-account-label]').forEach((el) => { el.textContent = user; });
}

/** Light / dark toggle: every [data-theme-toggle] button (top bar + mobile bar) shows the theme you would switch TO. */
function initThemeToggle(root) {
    const buttons = root.querySelectorAll('[data-theme-toggle]');
    const paint = () => {
        const dark = getTheme() === 'dark';
        buttons.forEach((b) => {
            b.innerHTML = dark
                ? '<i class="fa-solid fa-sun" aria-hidden="true"></i><span>Light</span>'
                : '<i class="fa-solid fa-moon" aria-hidden="true"></i><span>Dark</span>';
            b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
            b.setAttribute('aria-pressed', String(dark));
            b.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
        });
    };
    buttons.forEach((b) => b.addEventListener('click', () => toggleTheme()));
    window.addEventListener(THEME_EVENT, paint);      // also fires when another tab changes the theme
    paint();
}

/** Highlight the nav link matching ?category=... in the URL (e.g. shop.html?category=Kids). */
function initActiveCategory(root) {
    const current = new URLSearchParams(window.location.search).get('category');
    const links = root.querySelectorAll('.category-link');

    links.forEach((link) => {
        const isMatch = !!current &&
            link.dataset.category.toLowerCase() === current.trim().toLowerCase();
        link.classList.toggle('active-category', isMatch);
        if (isMatch) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });
}

/** Hamburger button <-> category menu (mobile). */
function initNavMenu(root) {
    const toggle = root.querySelector('#hamburgerToggle');
    const menu = root.querySelector('#navMenu');
    const categoriesBtn = root.querySelector('#mobileCategoriesToggle');
    if (!toggle || !menu) return { close() {} };

    const setOpen = (open) => {
        menu.classList.toggle('active', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.innerHTML = open ? '&#10005;' : '&#9776;';
    };
    const isOpen = () => menu.classList.contains('active');

    toggle.addEventListener('click', () => setOpen(!isOpen()));

    // The "Categories" shortcut in the mobile action bar opens the same menu
    if (categoriesBtn) {
        categoriesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            setOpen(true);
            menu.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
    }

    return { close: () => setOpen(false) };
}

/** Slide-down search panel on mobile + its live suggestions. */
function initMobileSearch(root) {
    const toggle = root.querySelector('#mobileSearchToggle');
    const panel  = root.querySelector('#mobileSearchPanel');
    const input  = root.querySelector('#mobileSearchInput');
    const close  = root.querySelector('#mobileSearchClose');
    const form   = root.querySelector('#mobileSearchForm');
    if (!panel || !input || !form) return;

    const isOpen = () => panel.classList.contains('open');

    function openPanel() {
        panel.classList.add('open');
        panel.setAttribute('aria-hidden', 'false');
        if (toggle) {
            toggle.classList.add('active');
            toggle.setAttribute('aria-expanded', 'true');
        }
        input.tabIndex = 0;
        if (close) close.tabIndex = 0;
        setTimeout(() => input.focus({ preventScroll: true }), 150);
    }

    function closePanel() {
        panel.classList.remove('open', 'has-results');
        panel.setAttribute('aria-hidden', 'true');
        if (toggle) {
            toggle.classList.remove('active');
            toggle.setAttribute('aria-expanded', 'false');
        }
        input.tabIndex = -1;
        if (close) close.tabIndex = -1;
        input.blur();
        search && search.close();
    }

    // Live suggestions + submit handling. The panel grows while suggestions show.
    const search = initSearch({
        form,
        input,
        mount: panel,
        onChange: (open) => panel.classList.toggle('has-results', open)
    });

    if (toggle) {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            isOpen() ? closePanel() : openPanel();
        });
    }
    if (close) close.addEventListener('click', closePanel);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen()) {
            closePanel();
            if (toggle) toggle.focus();
        }
    });

    // Rotating a phone / resizing to desktop: the panel is hidden by CSS, reset its state
    window.addEventListener('resize', () => {
        if (window.innerWidth > MOBILE_BREAKPOINT && isOpen()) closePanel();
    });
}

/** Desktop search bar: category filter, live suggestions, submit -> shop page. */
function initDesktopSearch(root) {
    initSearch({
        form:   root.querySelector('#searchForm'),
        input:  root.querySelector('#searchInput'),
        select: root.querySelector('#searchCategory')
    });
}

// ---------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------

/**
 * Render the header into #site-header (created at the top of <body> if the
 * page forgot the placeholder) and wire every feature. Safe to call once per page.
 */
export function initSiteHeader() {
    let root = document.getElementById('site-header');
    if (!root) {
        root = document.createElement('div');
        root.id = 'site-header';
        document.body.prepend(root);
    }
    if (root.dataset.ready) return root;       // already initialised
    root.innerHTML = headerTemplate();
    root.dataset.ready = 'true';

    initAccountLabel(root);
    initCartBadge();               // fills the My Cart (X) badge and keeps it live
    initWishlistBadge();           // Wishlist (X) badge + every heart button on the page
    initThemeToggle(root);         // dark / light switch
    initActiveCategory(root);
    initNavMenu(root);
    initMobileSearch(root);
    initDesktopSearch(root);
    return root;
}
