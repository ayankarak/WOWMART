import { initSiteHeader } from '../header.js';
import { PRODUCTS } from './productData.js';
import { productUrl } from '../paths.js';
import { addToCart } from '../cart.js';
import { getWishlist, bindWishlist, wishlistButton, isWishlisted } from '../wishlist.js';

initSiteHeader();

const grid = document.getElementById('wishlistGrid');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
}[c]));

const money = n => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
}).format(n);

function render() {
    const ids = getWishlist();
    const items = ids.map(id => ({ id, p: PRODUCTS[id] })).filter(x => x.p);
    
    if (!items.length) {
        grid.innerHTML = '<p class="wishlist-empty">No favourites yet. Tap the heart on any product to save it here.</p>';
        return;
    }
    
    grid.innerHTML = items.map(({ id, p }) => `
        <article class="product-card" data-product-id="${esc(id)}">
            <div class="shop-card-image">
                <img src="${esc(p.images[0])}" alt="${esc(p.title)}">
                ${wishlistButton(id, isWishlisted(id))}
            </div>
            <h4>${esc(p.title)}</h4>
            <div class="price">${money(p.price)}</div>
            <div class="wishlist-actions">
                <button class="card-cart-btn" data-move-cart="${esc(id)}" ${p.stock > 0 ? '' : 'disabled'}>Move to cart</button>
                <a class="card-cart-btn" href="${productUrl(id)}">View product</a>
            </div>
        </article>
    `).join('');
}

grid.addEventListener('click', e => {
    const btn = e.target.closest('[data-move-cart]');
    if (btn) {
        e.preventDefault();
        e.stopPropagation();
        
        const id = btn.dataset.moveCart;
        const p = PRODUCTS[id];
        if (!p) return;
        
        const res = addToCart({
            id,
            qty: 1,
            color: p.colors?.[0]?.name,
            size: p.sizes?.[0]
        });
        
        if (res.ok) {
            btn.textContent = 'Added to cart ✓';
        } else {
            btn.textContent = res.reason || 'Unable to add';
        }
    } else {
        const card = e.target.closest('[data-product-id]');
        if (card && !e.target.closest('button,a')) {
            location.href = productUrl(card.dataset.productId);
        }
    }
});

bindWishlist(grid);

window.addEventListener('storage', e => {
    if (e.key === 'wowmartWishlist') render();
});

window.addEventListener('wowmart:wishlist', render);

render();