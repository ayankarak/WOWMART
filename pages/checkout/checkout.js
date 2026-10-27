// =====================================================================
// WOWMART checkout: shared state + helpers used by
//   cart.html -> location.html -> billing.html -> payment.html -> order-confirmation.html
//
// FOLDER:  pages/checkout/   (this file, the 4 checkout pages + checkout.css)
//   ../productData.js   = pages/productData.js
//   ../../paths.js      = site root paths.js  (all URLs are built there)
//   ../../cart.js       = site root cart store (localStorage['cart'])
//
// STATE lives in localStorage under one key so it survives page loads:
//   wowmart_checkout = {
//       mode:    'cart' | 'buynow',        // where the items came from
//       items:   [{ id, qty, size, color }, ...],   // the WHOLE cart, or the single Buy-Now item
//       address: {...} | null,
//       payment: { method, detail } | null
//   }
// Prices are NEVER stored: every page re-reads them from productData.js.
//
// 'cart'   -> the cart is emptied once the order is placed.
// 'buynow' -> the cart is left untouched (the shopper only bought that one item).
// =====================================================================
import { PRODUCTS } from '../productData.js';
import { pagesUrl, shopUrl, cartUrl, checkoutUrl, assetUrl, accountUrl } from '../../paths.js';
import { getCart, clearCart } from '../../cart.js';

const KEY = 'wowmart_checkout';
const ORDERS_KEY = 'wowmart_orders';
const ADDRESSES_KEY = 'wowmart_addresses';
const MAX_QTY = 10;
const FREE_DELIVERY_ABOVE = 499;   // INR
const DELIVERY_FEE = 49;           // INR
const GST_RATE = 0.18;

const has = (obj, k) => Object.prototype.hasOwnProperty.call(obj, k);
const nz = (v) => (v === undefined || v === null || v === '' ? null : String(v));
const sameItem = (a, b) => a.id === b.id && a.size === b.size && a.color === b.color;

// ---------- small utilities ----------
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const formatPrice = (n) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2
}).format(n);

function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full/blocked */ }
}

// ---------- checkout state ----------
export const getCheckout = () => read(KEY, null);
export const saveCheckout = (state) => write(KEY, state);
export const updateCheckout = (patch) => saveCheckout({ ...(getCheckout() || {}), ...patch });
export const clearCheckout = () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } };

/** Product page "Buy Now": buy just this one item. The cart is not touched. */
export function startBuyNow({ id, qty, size = null, color = null }) {
    saveCheckout({ mode: 'buynow', items: [{ id, qty, size, color }], address: null, payment: null });
    window.location.href = checkoutUrl(`location.html?id=${encodeURIComponent(id)}&qty=${encodeURIComponent(qty)}`);
}

/**
 * Cart page "Proceed to Checkout": hands the ENTIRE cart array to the location page.
 * Returns false (and does nothing) when the cart is empty.
 */
export function startCartCheckout() {
    const items = getCart();                               // already validated against productData.js
    if (!items.length) return false;

    let user = null;
    try { user = localStorage.getItem('loggedInUser'); } catch { /* storage unavailable */ }
    if (!user) {                                           // same rule as "Buy Now": sign in first, then come back to the cart
        window.location.href = accountUrl('pages/cart.html');
        return true;
    }
    saveCheckout({ mode: 'cart', items, address: null, payment: null });
    window.location.href = checkoutUrl('location.html?from=cart');
    return true;
}

/**
 * The items being bought, validated against productData.js (unknown / out-of-stock products are dropped,
 * quantities are clamped to stock and MAX_QTY). Returns [{ product, item }].
 * A bare link like location.html?id=women-1&qty=2 still works when there is no saved state.
 */
export function getLines() {
    const params = new URLSearchParams(window.location.search);
    const state = getCheckout() || {};
    let raw = Array.isArray(state.items) ? state.items : (state.item ? [state.item] : []);   // state.item = older single-item format
    if (!raw.length && params.get('id')) raw = [{ id: params.get('id'), qty: params.get('qty'), size: null, color: null }];

    const lines = [];
    for (const r of raw) {
        if (!r || !has(PRODUCTS, r.id)) continue;
        const product = PRODUCTS[r.id];
        const max = Math.min(product.stock || 0, MAX_QTY);
        if (max < 1) continue;
        const qty = Math.min(max, Math.max(1, parseInt(r.qty, 10) || 1));
        const item = { id: r.id, qty, size: nz(r.size), color: nz(r.color) };
        const dup = lines.find((l) => sameItem(l.item, item));
        if (dup) dup.item.qty = Math.min(max, dup.item.qty + qty);
        else lines.push({ product, item });
    }

    // Save the cleaned-up list back if anything changed (e.g. stock dropped)
    const clean = lines.map((l) => l.item);
    if (lines.length && JSON.stringify(clean) !== JSON.stringify(raw)) {
        updateCheckout({ mode: state.mode || 'buynow', items: clean, item: undefined });
    }
    return lines;
}

/** Use at the top of every checkout page. Sends the shopper away if there is nothing to buy. */
export function requireLines() {
    const lines = getLines();
    if (!lines.length) window.location.replace((getCheckout() || {}).mode === 'cart' ? cartUrl() : shopUrl());
    return lines.length ? lines : null;
}

/** Billing/payment need an address; send the shopper back to the location page if it is missing. */
export function requireAddress() {
    const lines = requireLines();
    if (!lines) return null;
    const address = (getCheckout() || {}).address;
    if (!address) { window.location.replace(checkoutUrl('location.html')); return null; }
    return { lines, address, mode: (getCheckout() || {}).mode || 'buynow' };
}

/** Where the "Back" button on the location page should go. */
export function backUrlForCheckout(lines) {
    const mode = (getCheckout() || {}).mode;
    if (mode === 'cart') return cartUrl();
    return lines.length === 1 ? pagesUrl(`product.html?id=${encodeURIComponent(lines[0].item.id)}`) : shopUrl();
}

// ---------- money (integer paise to avoid floating-point drift) ----------
export const lineTotal = (product, qty) => Math.round(product.price * 100) * qty / 100;

/** Same maths on the cart page and on every checkout page, so the totals always agree. */
export function computeTotals(lines) {
    const subtotal = lines.reduce((sum, { product, item }) => sum + Math.round(product.price * 100) * item.qty, 0);
    const delivery = !lines.length || subtotal >= FREE_DELIVERY_ABOVE * 100 ? 0 : DELIVERY_FEE * 100;
    const tax = Math.round(subtotal * GST_RATE);
    const total = subtotal + delivery + tax;
    const inr = (paise) => paise / 100;
    return {
        subtotal: inr(subtotal), delivery: inr(delivery), tax: inr(tax), total: inr(total),
        units: lines.reduce((n, l) => n + l.item.qty, 0),
        gstPercent: GST_RATE * 100, freeDeliveryAbove: FREE_DELIVERY_ABOVE, deliveryFee: DELIVERY_FEE
    };
}

// ---------- addresses ----------
export const getSavedAddresses = () => read(ADDRESSES_KEY, []);
export function saveAddress(address) {
    const rest = getSavedAddresses().filter((a) => !(a.line1 === address.line1 && a.pincode === address.pincode));
    write(ADDRESSES_KEY, [address, ...rest].slice(0, 3));
}

// ---------- orders ----------
export function getOrder(orderId) {
    return read(ORDERS_KEY, []).find((o) => o.orderId === orderId) || null;
}

let placing = false;
/** Final step: create the order, empty the cart (cart checkouts), clear the checkout state, show the confirmation. */
export function placeOrder({ method, detail = '' }) {
    if (placing) return;                                   // ignore double clicks
    const ctx = requireAddress();
    if (!ctx) return;
    placing = true;
    const { lines, address, mode } = ctx;
    const totals = computeTotals(lines);

    const orderId = 'WM' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
    const order = {
        orderId,
        placedAt: new Date().toISOString(),
        mode,
        items: lines.map(({ product, item }) => ({
            id: item.id, title: product.title, image: assetUrl(product.images[0]), price: product.price,
            qty: item.qty, size: item.size, color: item.color
        })),
        address,
        totals,
        payment: { method, detail, status: method === 'COD' ? 'Pay on delivery' : 'Paid' }
    };
    write(ORDERS_KEY, [order, ...read(ORDERS_KEY, [])].slice(0, 20));

    if (mode === 'cart') clearCart();                      // empties localStorage['cart'] + refreshes the header badge
    clearCheckout();
    window.location.href = checkoutUrl(`order-confirmation.html?order=${encodeURIComponent(orderId)}`);
}

// ---------- accessible modal ----------
/** Wraps a `.modal-overlay` element. Esc / backdrop click / [data-close] close it; Tab stays inside. */
export function createModal(overlay) {
    let lastFocus = null;
    const focusables = () => [...overlay.querySelectorAll('button:not([disabled]), [href], input, select, [tabindex]:not([tabindex="-1"])')];

    function open() {
        lastFocus = document.activeElement;
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        (focusables()[0] || overlay).focus();
    }
    function close() {
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        if (!document.querySelector('.modal-overlay.open')) document.body.classList.remove('modal-open');
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.closest('[data-close]')) close();
    });
    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
        if (e.key !== 'Tab') return;
        const f = focusables();
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    return { open, close, isOpen: () => overlay.classList.contains('open') };
}

/** Renders the 4-step progress bar. current: 1 Location, 2 Bill, 3 Payment, 4 Done */
export function renderStepper(el, current) {
    if (!el) return;
    const steps = ['Delivery location', 'Bill', 'Payment', 'Confirmation'];
    el.innerHTML = steps.map((label, i) => {
        const n = i + 1;
        const cls = n < current ? 'done' : n === current ? 'current' : '';
        return `<li class="${cls}"${n === current ? ' aria-current="step"' : ''}><span class="step-num">${n < current ? '<i class="fa-solid fa-check"></i>' : n}</span><span class="step-label">${label}</span></li>`;
    }).join('');
}

// ---------- shared item list (used on location, billing, payment) ----------
/**
 * One row per cart line. Image paths in productData.js are relative to /pages/,
 * so they go through assetUrl() to stay correct from /pages/checkout/.
 */
export function renderItemList(el, lines) {
    if (!el) return;
    el.innerHTML = lines.map(({ product, item }) => {
        const opts = [item.color && `Colour: ${item.color}`, item.size && `Size: ${item.size}`].filter(Boolean).join(' · ');
        return `
        <div class="bill-item">
            <img src="${esc(assetUrl(product.images[0]))}" alt="${esc(product.title)}">
            <div><div class="name">${esc(product.title)}</div>
                <div class="meta">${esc(formatPrice(product.price))} &times; ${item.qty}${opts ? ' &middot; ' + esc(opts) : ''}</div></div>
            <div class="line-total"><strong>${esc(formatPrice(lineTotal(product, item.qty)))}</strong></div>
        </div>`;
    }).join('');
}
