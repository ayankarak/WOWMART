// =====================================================================
// WOWMART wishlist (store + heart buttons; the page itself is pages/wishlist.js)
//
// RULE: keep this file in the site root next to cart.js / paths.js.
//
// Storage: localStorage['wowmart_wishlist'] = [{ id, addedAt }, ...]  (newest first)
//
// Heart buttons: any element with  data-wishlist  and  data-id="<productId>"  is a
// toggle. initWishlistButtons() handles clicks for every such button on the page,
// including ones added later (shop cards are drawn by JS), and keeps all hearts and the
// header count in sync, in this tab and in other tabs.
// decorateCards() adds a heart to every product card that has a data-id.
// =====================================================================
import { PRODUCTS } from './pages/productData.js';
import { showToast } from './cart.js';

const KEY = 'wowmart_wishlist';
export const WISHLIST_EVENT = 'wowmart:wishlist-changed';
const CARD_SELECTOR = '.product-card[data-id], .launch-item[data-id], .trending-item[data-id]';

const has = (obj, k) => Object.prototype.hasOwnProperty.call(obj, k);

// ---------- storage ----------
/** Saved items that still exist in productData.js, newest first. */
export function getWishlist() {
    let raw = [];
    try { raw = JSON.parse(localStorage.getItem(KEY)) || []; } catch { raw = []; }
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    return raw.filter((r) => r && has(PRODUCTS, r.id) && !seen.has(r.id) && seen.add(r.id))
              .map((r) => ({ id: r.id, addedAt: r.addedAt || null }));
}

function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage full or blocked */ }
    window.dispatchEvent(new CustomEvent(WISHLIST_EVENT, { detail: { list } }));   // same-tab listeners
    syncWishlistUI();
}

export const isWished = (id) => getWishlist().some((w) => w.id === id);
export const getWishlistCount = () => getWishlist().length;

/** Add when missing, remove when present. Returns true when the product is now saved. */
export function toggleWishlist(id) {
    if (!has(PRODUCTS, id)) return false;
    const list = getWishlist();
    const exists = list.some((w) => w.id === id);
    save(exists ? list.filter((w) => w.id !== id) : [{ id, addedAt: new Date().toISOString() }, ...list]);
    return !exists;
}

export function removeFromWishlist(id) { save(getWishlist().filter((w) => w.id !== id)); }
export function clearWishlist() { save([]); }

// ---------- heart buttons ----------
/** Markup for one heart button (used by product.js and the card decorator). */
export function heartButtonHtml(id, extraClass = '') {
    const on = isWished(id);
    return `<button type="button" class="wish-btn ${extraClass}" data-wishlist data-id="${escapeAttr(id)}" aria-pressed="${on}" aria-label="${on ? 'Remove from wishlist' : 'Add to wishlist'}" title="${on ? 'Remove from wishlist' : 'Add to wishlist'}"><i class="${on ? 'fa-solid' : 'fa-regular'} fa-heart" aria-hidden="true"></i></button>`;
}
const escapeAttr = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Put a heart on every product card under `scope` that does not have one yet. */
export function decorateCards(scope = document) {
    scope.querySelectorAll(CARD_SELECTOR).forEach((card) => {
        if (card.querySelector(':scope > .wish-btn') || !has(PRODUCTS, card.dataset.id)) return;
        card.insertAdjacentHTML('beforeend', heartButtonHtml(card.dataset.id));
    });
}

/** Make every [data-wishlist] button reflect the saved list, and refresh the header counts. */
export function syncWishlistUI() {
    const saved = new Set(getWishlist().map((w) => w.id));
    document.querySelectorAll('[data-wishlist]').forEach((btn) => {
        const on = saved.has(btn.dataset.id);
        btn.setAttribute('aria-pressed', String(on));
        const label = on ? 'Remove from wishlist' : 'Add to wishlist';
        btn.setAttribute('aria-label', label);
        btn.title = label;
        const icon = btn.querySelector('i');
        if (icon) { icon.classList.toggle('fa-solid', on); icon.classList.toggle('fa-regular', !on); }
    });
    const n = saved.size;
    document.querySelectorAll('[data-wishlist-count]').forEach((el) => { el.textContent = String(n); });
    document.querySelectorAll('[data-wishlist-label]').forEach((el) => el.setAttribute('aria-label', `Wishlist, ${n} item${n === 1 ? '' : 's'}`));
}

let wiredButtons = false;
/** Call once per page. Safe to call again. */
export function initWishlistButtons() {
    syncWishlistUI();
    if (wiredButtons) return;
    wiredButtons = true;

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-wishlist]');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();                         // a heart on a clickable card must not open the product page
        const id = btn.dataset.id;
        if (!has(PRODUCTS, id)) return;
        const nowSaved = toggleWishlist(id);
        showToast(nowSaved ? 'Saved to your wishlist ♥' : 'Removed from your wishlist');
    }, true);

    window.addEventListener('storage', (e) => {      // other tabs
        if (e.key === KEY || e.key === null) syncWishlistUI();
    });
    window.addEventListener('pageshow', (e) => { if (e.persisted) syncWishlistUI(); });   // back/forward cache
}

/** Header calls this: fills the Wishlist (n) counts. */
export function initWishlistBadge() { syncWishlistUI(); initWishlistButtons(); }
