// =====================================================================
// WOWMART wishlist PAGE (pages/wishlist.html)
//
// The store (localStorage['wowmart_wishlist'], heart buttons) is ../wishlist.js.
// This file only draws the saved items and offers "Move to Cart":
//   - products with sizes need a size picked first (same rule as the product page)
//   - products with several colours get a colour picker
//   - a successful move adds the item to the cart AND removes it from the wishlist
// =====================================================================
import { initSiteHeader } from '../header.js';
import { getWishlist, removeFromWishlist, clearWishlist, WISHLIST_EVENT } from '../wishlist.js';
import { addToCart, showToast } from '../cart.js';
import { PRODUCTS } from './productData.js';
import { getBrand } from './productMeta.js';
import { productUrl, assetUrl, shopUrl } from '../paths.js';

initSiteHeader();

const root = document.getElementById('wlRoot');
const countPill = document.getElementById('wlCount');
const clearBtn = document.getElementById('wlClear');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n);

// Size / colour picked on each card survives a re-draw (e.g. after another item is removed)
const choices = new Map();   // id -> { size, color }

function render() {
    const list = getWishlist();
    countPill.textContent = list.length ? `${list.length} item${list.length === 1 ? '' : 's'}` : '';
    clearBtn.hidden = !list.length;

    if (!list.length) {
        root.innerHTML = `
            <section class="card wl-empty">
                <i class="fa-regular fa-heart" aria-hidden="true"></i>
                <h2>Your wishlist is empty</h2>
                <p>Tap the heart on any product to save it here for later.</p>
                <a class="btn btn-primary" href="${esc(shopUrl())}">Browse products</a>
            </section>`;
        return;
    }
    root.innerHTML = `<div class="wl-grid">${list.map(cardHtml).join('')}</div>`;
}

function cardHtml({ id, addedAt }) {
    const p = PRODUCTS[id];
    const pick = choices.get(id) || {};
    const inStock = p.stock > 0;
    const sizeSel = (p.sizes && p.sizes.length) ? `
        <select data-opt="size" aria-label="Size for ${esc(p.title)}">
            <option value="">Select size</option>
            ${p.sizes.map((s) => `<option value="${esc(s)}"${pick.size === s ? ' selected' : ''}>${esc(s)}</option>`).join('')}
        </select>` : '';
    const colorSel = (p.colors && p.colors.length > 1) ? `
        <select data-opt="color" aria-label="Colour for ${esc(p.title)}">
            ${p.colors.map((c) => `<option value="${esc(c.name)}"${pick.color === c.name ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select>` : '';
    const added = addedAt ? `<span class="wl-added">Saved ${esc(new Date(addedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }))}</span>` : '';

    return `
        <article class="wl-card" data-id="${esc(id)}">
            <a class="wl-img" href="${esc(productUrl(id))}"><img src="${esc(assetUrl(p.images[0]))}" alt="${esc(p.title)}"></a>
            <span class="wl-brand">${esc(getBrand(id))}</span>
            <h3><a href="${esc(productUrl(id))}">${esc(p.title)}</a></h3>
            <div class="wl-price">${esc(money(p.price))}</div>
            <div class="wl-stock${inStock ? '' : ' out'}">${inStock ? 'In stock' : 'Out of stock'}</div>
            ${(sizeSel || colorSel) && inStock ? `<div class="wl-opts">${sizeSel}${colorSel}</div>` : ''}
            <div class="wl-err" role="alert"></div>
            ${added}
            <div class="wl-actions">
                <button type="button" class="btn btn-primary" data-action="move"${inStock ? '' : ' disabled'}><i class="fa-solid fa-cart-plus"></i> Move to Cart</button>
                <button type="button" class="wl-remove" data-action="remove" aria-label="Remove ${esc(p.title)} from wishlist" title="Remove"><i class="fa-regular fa-trash-can"></i></button>
            </div>
        </article>`;
}

root.addEventListener('change', (e) => {
    const sel = e.target.closest('select[data-opt]');
    const card = sel && sel.closest('.wl-card');
    if (!card) return;
    const cur = choices.get(card.dataset.id) || {};
    cur[sel.dataset.opt] = sel.value;
    choices.set(card.dataset.id, cur);
    sel.classList.remove('invalid');
    card.querySelector('.wl-err').textContent = '';
});

root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    const card = btn && btn.closest('.wl-card');
    if (!card) return;
    const id = card.dataset.id;
    const p = PRODUCTS[id];

    if (btn.dataset.action === 'remove') { removeFromWishlist(id); choices.delete(id); showToast('Removed from your wishlist'); return; }

    // Move to cart
    const sizeSel = card.querySelector('select[data-opt="size"]');
    const colorSel = card.querySelector('select[data-opt="color"]');
    if (sizeSel && !sizeSel.value) {
        sizeSel.classList.add('invalid');
        card.querySelector('.wl-err').textContent = 'Please select a size first.';
        sizeSel.focus();
        return;
    }
    const res = addToCart({
        id, qty: 1,
        size: sizeSel ? sizeSel.value : null,
        color: colorSel ? colorSel.value : (p.colors && p.colors[0] ? p.colors[0].name : null)
    });
    if (!res.ok) { card.querySelector('.wl-err').textContent = res.reason; return; }
    removeFromWishlist(id);                                   // moved, not copied
    choices.delete(id);
    showToast(`Moved "${p.title}" to your cart ✓`);
});

clearBtn.addEventListener('click', () => {
    if (window.confirm('Remove everything from your wishlist?')) { clearWishlist(); choices.clear(); showToast('Wishlist cleared'); }
});

window.addEventListener(WISHLIST_EVENT, render);              // this tab
window.addEventListener('storage', (e) => { if (e.key === 'wowmart_wishlist' || e.key === null) render(); });   // other tabs
window.addEventListener('pageshow', (e) => { if (e.persisted) render(); });

render();
