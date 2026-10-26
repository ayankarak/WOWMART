// =====================================================================
// WOWMART checkout: shared state + helpers used by
//   location.html -> billing.html -> payment.html -> order-confirmation.html
//
// State lives in localStorage under one key so it survives page loads:
//   { item: {id, qty, size, color}, address: {...}|null, payment: {method, detail}|null }
// Prices are NEVER stored: every page re-reads them from productData.js.
// All navigation uses paths.js, so links work from any folder.
// =====================================================================
import { PRODUCTS } from './productData.js';
import { pagesUrl, shopUrl } from '../paths.js';

const KEY = 'wowmart_checkout';
const ORDERS_KEY = 'wowmart_orders';
const ADDRESSES_KEY = 'wowmart_addresses';
const MAX_QTY = 10;
const FREE_DELIVERY_ABOVE = 499;   // INR
const DELIVERY_FEE = 49;           // INR
const GST_RATE = 0.18;

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

/** Step 1 (product page): remember what is being bought and go to the location page. */
export function startBuyNow({ id, qty, size = null, color = null }) {
    saveCheckout({ item: { id, qty, size, color }, address: null, payment: null });
    window.location.href = pagesUrl(`location.html?id=${encodeURIComponent(id)}&qty=${encodeURIComponent(qty)}`);
}

/**
 * The item being bought, validated against productData.js.
 * URL params (?id=&qty=) win over localStorage, so a link like
 * location.html?id=women-1&qty=2 also works on its own.
 * Returns { product, item } or null.
 */
export function getLineItem() {
    const params = new URLSearchParams(window.location.search);
    const state = getCheckout() || {};
    const id = params.get('id') || state.item?.id;
    if (!id || !Object.prototype.hasOwnProperty.call(PRODUCTS, id)) return null;

    const product = PRODUCTS[id];
    if (!(product.stock > 0)) return null;

    const sameItem = state.item?.id === id;
    const rawQty = parseInt(params.get('qty') ?? (sameItem ? state.item.qty : 1), 10);
    const maxQty = Math.min(product.stock, MAX_QTY);
    const qty = Math.min(maxQty, Math.max(1, Number.isFinite(rawQty) ? rawQty : 1));
    const item = { id, qty, size: sameItem ? state.item.size : null, color: sameItem ? state.item.color : null };

    if (!sameItem || state.item.qty !== qty) updateCheckout({ item });
    return { product, item };
}

/** Use at the top of every checkout page. Sends the user to the shop if nothing is being bought. */
export function requireLineItem() {
    const line = getLineItem();
    if (!line) window.location.replace(shopUrl());
    return line;
}

/** Billing/payment need an address; send the user back to the location page if it is missing. */
export function requireAddress() {
    const line = requireLineItem();
    if (!line) return null;
    const address = (getCheckout() || {}).address;
    if (!address) { window.location.replace(pagesUrl('location.html')); return null; }
    return { ...line, address };
}

// ---------- money (integer paise to avoid floating-point drift) ----------
export function computeTotals(product, qty) {
    const subtotal = Math.round(product.price * 100) * qty;
    const delivery = subtotal >= FREE_DELIVERY_ABOVE * 100 ? 0 : DELIVERY_FEE * 100;
    const tax = Math.round(subtotal * GST_RATE);
    const total = subtotal + delivery + tax;
    const inr = (paise) => paise / 100;
    return {
        subtotal: inr(subtotal), delivery: inr(delivery), tax: inr(tax), total: inr(total),
        gstPercent: GST_RATE * 100, freeDeliveryAbove: FREE_DELIVERY_ABOVE
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

/** Final step: create the order, clear the checkout state, go to the confirmation page. */
export function placeOrder({ method, detail = '' }) {
    const line = requireAddress();
    if (!line) return;
    const { product, item, address } = line;
    const totals = computeTotals(product, item.qty);

    const orderId = 'WM' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
    const order = {
        orderId,
        placedAt: new Date().toISOString(),
        item: { id: item.id, title: product.title, image: product.images[0], price: product.price,
                qty: item.qty, size: item.size, color: item.color },
        address,
        totals,
        payment: { method, detail, status: method === 'COD' ? 'Pay on delivery' : 'Paid' }
    };
    write(ORDERS_KEY, [order, ...read(ORDERS_KEY, [])].slice(0, 20));
    clearCheckout();
    window.location.href = pagesUrl(`order-confirmation.html?order=${encodeURIComponent(orderId)}`);
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

// ---------- shared item row (used on location, billing, payment) ----------
export function renderMiniItem(el, product, item) {
    if (!el) return;
    const t = computeTotals(product, item.qty);
    const opts = [item.color && `Colour: ${item.color}`, item.size && `Size: ${item.size}`].filter(Boolean).join(' · ');
    el.innerHTML = `
        <img src="${esc(product.images[0])}" alt="${esc(product.title)}">
        <div><div class="name">${esc(product.title)}</div>
            <div class="meta">${esc(formatPrice(product.price))} &times; ${item.qty}${opts ? ' &middot; ' + esc(opts) : ''}</div></div>
        <div class="line-total"><strong>${esc(formatPrice(t.subtotal))}</strong></div>`;
}
