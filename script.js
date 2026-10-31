// =====================================================================
// WOWMART home page (index.html)
// The header (menu, mobile search panel, desktop search, category links,
// cart badge) is rendered and wired by header.js.
// =====================================================================
import { initSiteHeader } from './header.js';
import { initCartButtons } from './cart.js';
import { productUrl } from './paths.js';
import { decorateCards } from './wishlist.js';

initSiteHeader();
initCartButtons();
decorateCards();     // heart (wishlist) button on every product card that has a data-id   // any [data-add-to-cart] button on a card adds to the cart (and updates the header badge)

// ===== Product card click -> product page =====
// Cards carry their product id in data-id (must exist in pages/productData.js)
document.addEventListener('click', (e) => {
    if (e.target.closest('[data-add-to-cart], [data-wishlist]')) return;   // handled by cart.js / wishlist.js
    const item = e.target.closest('.launch-item, .trending-item, .product-card');
    if (!item) return;
    const productId = item.dataset.id;
    if (productId) window.location.href = productUrl(productId);
});
