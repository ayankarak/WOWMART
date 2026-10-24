// =====================================================================
// WOWMART home page (index.html)
// The header (menu, mobile search panel, desktop search, category links)
// is rendered and wired by header.js.
// =====================================================================
import { initSiteHeader } from './header.js';
import { productUrl } from './paths.js';

initSiteHeader();

// ===== Product card click -> product page =====
// Cards carry their product id in data-id (must exist in pages/productData.js)
document.addEventListener('click', (e) => {
    const item = e.target.closest('.launch-item, .trending-item, .product-card');
    if (!item) return;
    const productId = item.dataset.id;
    if (productId) window.location.href = productUrl(productId);
});
