// =====================================================================
// WOWMART cart (single source of truth for every page)
//
// RULE: keep this file in the site root, next to paths.js / header.js.
// It has no URLs of its own and imports by relative module path, so it
// behaves the same when loaded from index.html or from anything in pages/.
//
// Storage: localStorage['cart'] = [{ id, qty, size, color }, ...]
//   - one line per unique (id + size + color); adding it again raises qty
//   - titles/prices are NOT stored; read them from productData.js when needed
//
// Live updates:
//   - same tab:   a 'wowmart:cart-changed' event on window
//   - other tabs: the browser's native 'storage' event
//   Both call updateCartCount(), so every [data-cart-count] badge refreshes
//   instantly without a reload.
// =====================================================================
import { PRODUCTS } from './pages/productData.js';
import { productUrl } from './paths.js';

const CART_KEY = 'cart';
export const CART_EVENT = 'wowmart:cart-changed';
const MAX_PER_LINE = 10;

const has = (obj, k) => Object.prototype.hasOwnProperty.call(obj, k);
const norm = (v) => (v === undefined || v === null || v === '' ? null : String(v));
const sameLine = (a, b) => a.id === b.id && a.size === b.size && a.color === b.color;

// ---------- storage ----------
/** Read the cart. Cleans up bad data and old-format entries (which also stored title/price). */
export function getCart() {
    let raw = [];
    try { raw = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { raw = []; }
    if (!Array.isArray(raw)) return [];

    const cart = [];
    for (const r of raw) {
        if (!r || !has(PRODUCTS, r.id)) continue;                       // unknown / removed product
        const max = Math.min(PRODUCTS[r.id].stock || 0, MAX_PER_LINE);
        const qty = Math.min(max, Math.max(1, parseInt(r.qty, 10) || 1));
        if (max < 1) continue;                                          // out of stock
        const line = { id: r.id, qty, size: norm(r.size), color: norm(r.color) };
        const existing = cart.find((l) => sameLine(l, line));           // merges duplicates from older saves
        if (existing) existing.qty = Math.min(max, existing.qty + qty);
        else cart.push(line);
    }
    return cart;
}

function saveCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* storage full or blocked */ }
    window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: { cart } }));   // same-tab listeners
    updateCartCount();
}

// ---------- operations ----------
/**
 * Add an item. Same id + size + color => quantity goes up instead of a new line.
 * Returns { ok, reason?, line?, capped? }.
 */
export function addToCart({ id, qty = 1, size = null, color = null }) {
    if (!has(PRODUCTS, id)) return { ok: false, reason: 'Unknown product.' };
    const product = PRODUCTS[id];
    if (!(product.stock > 0)) return { ok: false, reason: 'This product is out of stock.' };

    const max = Math.min(product.stock, MAX_PER_LINE);
    const add = Math.max(1, parseInt(qty, 10) || 1);
    const wanted = { id, size: norm(size), color: norm(color) };

    const cart = getCart();
    let line = cart.find((l) => sameLine(l, wanted));
    let capped = false;
    if (line) {
        if (line.qty + add > max) capped = true;
        line.qty = Math.min(max, line.qty + add);
    } else {
        if (add > max) capped = true;
        line = { ...wanted, qty: Math.min(max, add) };
        cart.push(line);
    }
    saveCart(cart);
    return { ok: true, line, capped };
}

export function removeFromCart({ id, size = null, color = null }) {
    const target = { id, size: norm(size), color: norm(color) };
    saveCart(getCart().filter((l) => !sameLine(l, target)));
}

export function setCartQty({ id, size = null, color = null }, qty) {
    const target = { id, size: norm(size), color: norm(color) };
    const q = parseInt(qty, 10);
    if (!(q >= 1)) return removeFromCart(target);
    const cart = getCart();
    const line = cart.find((l) => sameLine(l, target));
    if (!line) return;
    line.qty = Math.min(q, Math.min(PRODUCTS[id].stock, MAX_PER_LINE));
    saveCart(cart);
}

export function clearCart() { saveCart([]); }

/** Total number of units in the cart (3 shirts + 1 phone = 4). */
export const getCartCount = () => getCart().reduce((sum, l) => sum + l.qty, 0);

// ---------- header badge ----------
/** Write the current count into every [data-cart-count] element on the page. */
export function updateCartCount(scope = document) {
    const n = getCartCount();
    scope.querySelectorAll('[data-cart-count]').forEach((el) => { el.textContent = String(n); });
    document.querySelectorAll('[data-cart-label]').forEach((el) => el.setAttribute('aria-label', `My Cart, ${n} item${n === 1 ? '' : 's'}`));
    return n;
}

let wired = false;
/** Call once per page (header.js does it): fills the badge and keeps it live. */
export function initCartBadge() {
    updateCartCount();
    if (wired) return;
    wired = true;
    window.addEventListener(CART_EVENT, () => updateCartCount());
    window.addEventListener('storage', (e) => {                     // fired in OTHER tabs only
        if (e.key === CART_KEY || e.key === null) updateCartCount();
    });
    window.addEventListener('pageshow', (e) => { if (e.persisted) updateCartCount(); });  // back/forward cache
}

// Handy for inline scripts / the console: window.updateCartCount()
window.updateCartCount = updateCartCount;

// ---------- "Add to Cart" buttons on product cards ----------
/**
 * Any element with data-add-to-cart and data-id="<productId>" becomes a quick-add button
 * (works on dynamically rendered cards too). Products that need a size are sent to their
 * product page so the shopper can choose one.
 */
export function initCartButtons() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-add-to-cart]');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();                                         // don't trigger the card's own "open product" click
        const id = btn.dataset.id || btn.closest('[data-id]')?.dataset.id;
        if (!id || !has(PRODUCTS, id)) return;

        const p = PRODUCTS[id];
        if (p.sizes && p.sizes.length) { window.location.href = productUrl(id); return; }

        const res = addToCart({ id, qty: 1, color: p.colors ? p.colors[0].name : null });
        showToast(res.ok ? (res.capped ? 'Maximum quantity reached for this item' : 'Added to cart ✓') : res.reason, !res.ok);
    }, true);
}

// ---------- tiny toast ----------
function showToast(text, isError = false) {
    let t = document.getElementById('wm-toast');
    if (!t) {
        const css = document.createElement('style');
        css.textContent = `#wm-toast{position:fixed;left:50%;bottom:28px;transform:translate(-50%,20px);background:#1c2b36;color:#fff;
            padding:12px 20px;border-radius:8px;font:600 14px 'Segoe UI',sans-serif;opacity:0;pointer-events:none;transition:.25s;z-index:3000}
            #wm-toast.show{opacity:1;transform:translate(-50%,0)} #wm-toast.err{background:#c62828}`;
        document.head.append(css);
        t = document.createElement('div');
        t.id = 'wm-toast'; t.setAttribute('role', 'status');
        document.body.append(t);
    }
    t.textContent = text;
    t.classList.toggle('err', isError);
    t.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => t.classList.remove('show'), 1800);
}
