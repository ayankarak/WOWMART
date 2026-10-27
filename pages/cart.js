// =====================================================================
// WOWMART cart PAGE (pages/cart.html)
//
// NOT the same file as ../cart.js: that one is the cart STORE
// (localStorage['cart'], add/remove/qty helpers, header badge). This file only
// draws the page and calls the store.
//
// Paths: this file is in /pages/, so
//   ../cart.js, ../header.js, ../paths.js   = site root
//   ./productData.js                        = same folder
//   ./checkout/checkout.js                  = checkout sub-folder (totals + "start checkout")
//
// Flow: [Proceed to Checkout] -> startCartCheckout() saves the whole cart array into the
// checkout state and opens checkout/location.html -> billing -> payment -> confirmation.
// =====================================================================
import { initSiteHeader } from '../header.js';
import { getCart, setCartQty, removeFromCart, clearCart, CART_EVENT, MAX_PER_LINE, showToast } from '../cart.js';
import { PRODUCTS } from './productData.js';
import { productUrl, assetUrl, shopUrl } from '../paths.js';
import { computeTotals, formatPrice, lineTotal, esc, startCartCheckout } from './checkout/checkout.js';

initSiteHeader();

const root = document.getElementById('cartRoot');
const countPill = document.getElementById('cartCount');
const clearBtn = document.getElementById('clearCartBtn');

const isLoggedIn = () => { try { return !!localStorage.getItem('loggedInUser'); } catch { return false; } };

// ---------------------------------------------------------------------
// Rendering (re-runs after every change, so the bill is always live)
// ---------------------------------------------------------------------
function render() {
    // Remember what had keyboard focus so +/- / Remove clicks don't throw it away
    const active = document.activeElement;
    const focusKey = active && root.contains(active) && active.closest('.cart-item')
        ? { row: rowKey(active.closest('.cart-item')), action: active.dataset.action || (active.matches('.qty-input') ? 'qty' : '') }
        : null;

    const lines = getCart().map((item) => ({ product: PRODUCTS[item.id], item }));   // getCart() already drops unknown / out-of-stock products
    const t = computeTotals(lines);

    countPill.textContent = t.units ? `${t.units} item${t.units === 1 ? '' : 's'}` : '';
    clearBtn.hidden = !lines.length;

    if (!lines.length) {
        root.innerHTML = `
            <section class="card cart-empty">
                <i class="fa-solid fa-cart-shopping" aria-hidden="true"></i>
                <h2>Your cart is empty</h2>
                <p>Looks like you haven't added anything yet.</p>
                <a class="btn btn-primary" href="${esc(shopUrl())}">Start shopping</a>
            </section>`;
        return;
    }

    root.innerHTML = `
        <div class="cart-layout">
            <section class="card cart-list" aria-label="Items in your cart">
                ${lines.map(lineHtml).join('')}
            </section>
            <aside class="card cart-summary" aria-label="Bill summary">
                <h2><i class="fa-solid fa-receipt"></i> Bill summary</h2>
                <table class="bill-table">
                    <tr><td>Price (${t.units} item${t.units === 1 ? '' : 's'})</td><td>${esc(formatPrice(t.subtotal))}</td></tr>
                    <tr><td>Delivery charges</td><td>${t.delivery === 0 ? '<span class="free">FREE</span>' : esc(formatPrice(t.delivery))}</td></tr>
                    <tr><td>GST (${t.gstPercent}%)</td><td>${esc(formatPrice(t.tax))}</td></tr>
                    <tr class="total"><td>Total Amount</td><td>${esc(formatPrice(t.total))}</td></tr>
                </table>
                ${shippingHint(t)}
                <button type="button" class="btn btn-primary btn-block" id="checkoutBtn">
                    Proceed to Checkout <i class="fa-solid fa-arrow-right"></i></button>
                ${isLoggedIn() ? '' : '<p class="note">You will be asked to sign in before checkout.</p>'}
                <a class="continue" href="${esc(shopUrl())}">Continue shopping</a>
            </aside>
        </div>`;

    if (focusKey) {
        const row = [...root.querySelectorAll('.cart-item')].find((r) => rowKey(r) === focusKey.row);
        const target = row && (focusKey.action === 'qty'
            ? row.querySelector('.qty-input')
            : row.querySelector(`[data-action="${focusKey.action}"]:not(:disabled)`) || row.querySelector('.qty-input'));
        if (target) target.focus();
    }
}

const rowKey = (row) => `${row.dataset.id}|${row.dataset.size}|${row.dataset.color}`;

function lineHtml({ product, item }) {
    const max = Math.min(product.stock, MAX_PER_LINE);
    const swatch = item.color && (product.colors || []).find((c) => c.name === item.color);
    const opts = [
        item.color && `<span>${swatch ? `<i class="swatch" style="background:${esc(swatch.hex)}"></i>` : ''}Colour: ${esc(item.color)}</span>`,
        item.size && `<span>Size: ${esc(item.size)}</span>`
    ].filter(Boolean).join(' &middot; ');

    let warn = '';
    if (item.qty >= max) warn = max < product.stock ? `Maximum ${MAX_PER_LINE} per order` : `Only ${product.stock} in stock`;
    else if (product.stock <= 5) warn = `Only ${product.stock} left in stock`;

    return `
        <article class="cart-item" data-id="${esc(item.id)}" data-size="${esc(item.size ?? '')}" data-color="${esc(item.color ?? '')}">
            <a class="ci-img" href="${esc(productUrl(item.id))}"><img src="${esc(assetUrl(product.images[0]))}" alt="${esc(product.title)}"></a>
            <div class="ci-info">
                <a class="ci-title" href="${esc(productUrl(item.id))}">${esc(product.title)}</a>
                ${opts ? `<div class="ci-meta">${opts}</div>` : ''}
                <div class="ci-unit">${esc(formatPrice(product.price))} each</div>
                ${warn ? `<div class="ci-warn">${esc(warn)}</div>` : ''}
            </div>
            <div class="ci-total" aria-label="Line total">${esc(formatPrice(lineTotal(product, item.qty)))}</div>
            <div class="ci-actions">
                <div class="qty-stepper" role="group" aria-label="Quantity for ${esc(product.title)}">
                    <button type="button" data-action="dec" aria-label="Decrease quantity"${item.qty <= 1 ? ' disabled' : ''}>&minus;</button>
                    <input class="qty-input" type="number" inputmode="numeric" min="1" max="${max}" value="${item.qty}" aria-label="Quantity">
                    <button type="button" data-action="inc" aria-label="Increase quantity"${item.qty >= max ? ' disabled' : ''}>+</button>
                </div>
                <button type="button" class="ci-remove" data-action="remove"><i class="fa-solid fa-trash-can"></i>Remove from Cart</button>
            </div>
        </article>`;
}

/** "Add ₹X more for free delivery" + progress bar, or the "you've got it" message. */
function shippingHint(t) {
    if (t.delivery === 0) {
        return `<div class="ship-progress done"><i class="fa-solid fa-truck-fast"></i> You've got FREE delivery!<div class="bar"><span style="width:100%"></span></div></div>`;
    }
    const remaining = t.freeDeliveryAbove - t.subtotal;
    const pct = Math.min(100, Math.round((t.subtotal / t.freeDeliveryAbove) * 100));
    return `<div class="ship-progress">Add <strong>${esc(formatPrice(remaining))}</strong> more to get FREE delivery
        <div class="bar"><span style="width:${pct}%"></span></div></div>`;
}

// ---------------------------------------------------------------------
// Events (delegated: the markup is re-created on every render)
// ---------------------------------------------------------------------
const keyOf = (row) => ({ id: row.dataset.id, size: row.dataset.size || null, color: row.dataset.color || null });
const currentQty = (row) => getCart().find((l) => l.id === row.dataset.id && l.size === (row.dataset.size || null) && l.color === (row.dataset.color || null))?.qty || 1;

root.addEventListener('click', (e) => {
    const checkout = e.target.closest('#checkoutBtn');
    if (checkout) {
        if (!startCartCheckout()) showToast('Your cart is empty', true);
        return;
    }

    const btn = e.target.closest('[data-action]');
    const row = btn && btn.closest('.cart-item');
    if (!row) return;

    // Every store call below fires CART_EVENT, which re-renders the page
    if (btn.dataset.action === 'inc') setCartQty(keyOf(row), currentQty(row) + 1);
    else if (btn.dataset.action === 'dec') setCartQty(keyOf(row), currentQty(row) - 1);
    else if (btn.dataset.action === 'remove') {
        const title = row.querySelector('.ci-title').textContent;
        removeFromCart(keyOf(row));
        showToast(`Removed "${title}" from your cart`);
    }
});

root.addEventListener('change', (e) => {                      // typing a quantity
    const input = e.target.closest('.qty-input');
    const row = input && input.closest('.cart-item');
    if (!row) return;
    const q = parseInt(input.value, 10);
    if (!(q >= 1)) { render(); return; }                       // empty / 0 / junk: put the real quantity back (use Remove to delete)
    setCartQty(keyOf(row), q);                                 // the store clamps to stock and the per-order maximum
    render();                                                  // re-draw even when the clamped value equals the old one
});

clearBtn.addEventListener('click', () => {
    if (window.confirm('Remove all items from your cart?')) { clearCart(); showToast('Cart cleared'); }
});

window.addEventListener(CART_EVENT, render);                   // this tab: +/-, remove, clear
window.addEventListener('storage', (e) => {                    // other tabs
    if (e.key === 'cart' || e.key === null) render();
});
window.addEventListener('pageshow', (e) => { if (e.persisted) render(); });   // back button from checkout (bfcache)

render();
