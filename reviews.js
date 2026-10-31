// =====================================================================
// WOWMART customer reviews (store; the UI lives in pages/product.js)
//
// RULE: keep this file in the site root next to cart.js / wishlist.js.
//
// Storage: localStorage['wowmart_reviews'] = { [productId]: [ review, ... ] }
//   review = { id, user, rating (1-5), title, text, date (ISO), verified }
//
// productData.js already carries a starting `rating` and `reviews` count for each
// product. Reviews written here are blended into that average, so the stars on the
// product page, the shop cards and "Popular" sorting all move when someone reviews.
// (Reviews live in this browser only, there is no server.)
// =====================================================================
import { PRODUCTS } from './pages/productData.js';

const KEY = 'wowmart_reviews';
const ORDERS_KEY = 'wowmart_orders';
export const REVIEWS_EVENT = 'wowmart:reviews-changed';
export const LIMITS = { titleMax: 80, textMin: 10, textMax: 1000 };

const has = (obj, k) => Object.prototype.hasOwnProperty.call(obj, k);

function readAll() {
    try {
        const data = JSON.parse(localStorage.getItem(KEY));
        return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    } catch { return {}; }
}
function writeAll(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage full or blocked */ }
    window.dispatchEvent(new CustomEvent(REVIEWS_EVENT));
}

export const currentUser = () => { try { return localStorage.getItem('loggedInUser') || null; } catch { return null; } };

/** True when this browser has an order containing the product (shown as a "Verified purchase" tag). */
function hasPurchased(id) {
    try {
        const orders = JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
        return orders.some((o) => (o.items || (o.item ? [o.item] : [])).some((i) => i.id === id));
    } catch { return false; }
}

/** Reviews written on this site for a product, newest first. */
export function getReviews(id) {
    const list = readAll()[id];
    if (!Array.isArray(list)) return [];
    return list.filter((r) => r && r.rating >= 1 && r.rating <= 5)
               .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

/**
 * Overall rating for a product: the catalogue rating blended with site reviews.
 * Returns { average, count, local, distribution } - `distribution[5..1]` counts the site reviews only.
 */
export function getRatingSummary(id) {
    const base = has(PRODUCTS, id) ? PRODUCTS[id] : { rating: 0, reviews: 0 };
    const mine = getReviews(id);
    const sum = mine.reduce((s, r) => s + r.rating, 0);
    const count = (base.reviews || 0) + mine.length;
    const average = count ? ((base.rating || 0) * (base.reviews || 0) + sum) / count : 0;
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    mine.forEach((r) => { distribution[r.rating] += 1; });
    return { average: Math.round(average * 10) / 10, count, local: mine.length, distribution };
}

/**
 * Add a review as the signed-in user. One review per user per product:
 * writing again replaces the earlier one. Returns { ok, reason?, review?, replaced? }.
 */
export function addReview(id, { rating, title = '', text = '' }) {
    if (!has(PRODUCTS, id)) return { ok: false, reason: 'Unknown product.' };
    const user = currentUser();
    if (!user) return { ok: false, reason: 'Please sign in to write a review.', needsLogin: true };

    const stars = parseInt(rating, 10);
    if (!(stars >= 1 && stars <= 5)) return { ok: false, reason: 'Please choose a star rating.' };
    const cleanText = String(text).trim();
    if (cleanText.length < LIMITS.textMin) return { ok: false, reason: `Please write at least ${LIMITS.textMin} characters.` };
    if (cleanText.length > LIMITS.textMax) return { ok: false, reason: `Reviews can be up to ${LIMITS.textMax} characters.` };

    const review = {
        id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `r${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        user, rating: stars,
        title: String(title).trim().slice(0, LIMITS.titleMax),
        text: cleanText,
        date: new Date().toISOString(),
        verified: hasPurchased(id)
    };
    const all = readAll();
    const others = (all[id] || []).filter((r) => r.user !== user);
    const replaced = others.length !== (all[id] || []).length;
    all[id] = [review, ...others];
    writeAll(all);
    return { ok: true, review, replaced };
}

/** Delete one of the signed-in user's own reviews. */
export function deleteReview(id, reviewId) {
    const user = currentUser();
    const all = readAll();
    if (!all[id]) return;
    all[id] = all[id].filter((r) => !(r.id === reviewId && r.user === user));
    if (!all[id].length) delete all[id];
    writeAll(all);
}
