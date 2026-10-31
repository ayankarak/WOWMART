// =====================================================================
// WOWMART coupon codes (billing page).  To add a coupon, add one entry to COUPONS.
//
//   type: 'percent' (value = % off the item subtotal) or 'flat' (value = rupees off)
//   maxDiscount   cap in rupees (optional, for percent coupons)
//   minSubtotal   items total (before delivery / GST) needed, in rupees (optional)
//   firstOrderOnly  only while this browser has no earlier order (optional)
//
// Money is handled in integer paise (same as checkout.js) so totals never drift.
// The discount comes off the ITEM subtotal; GST is then charged on the discounted amount.
// Free-delivery eligibility is judged on the subtotal BEFORE the discount, so using a coupon
// never makes a free-delivery order start paying for delivery.
// =====================================================================
const ORDERS_KEY = 'wowmart_orders';

export const COUPONS = {
    WOW50:   { type: 'percent', value: 50, maxDiscount: 500, minSubtotal: 999,
               title: '50% off, up to ₹500', note: 'On orders of ₹999 or more' },
    FIRST10: { type: 'percent', value: 10, maxDiscount: 200, firstOrderOnly: true,
               title: '10% off, up to ₹200', note: 'For your first order on WOWMART' }
};

export const normalizeCode = (code) => String(code ?? '').trim().toUpperCase().replace(/\s+/g, '');

function hasEarlierOrder() {
    try { return (JSON.parse(localStorage.getItem(ORDERS_KEY)) || []).length > 0; } catch { return false; }
}

/**
 * Check a code against an item subtotal (in paise).
 * Returns { ok: true, code, discount (paise), title } or { ok: false, code, reason }.
 */
export function evaluateCoupon(code, subtotalPaise) {
    const c = normalizeCode(code);
    if (!c) return { ok: false, code: c, reason: 'Enter a coupon code.' };
    if (!Object.prototype.hasOwnProperty.call(COUPONS, c)) return { ok: false, code: c, reason: `"${c}" is not a valid coupon code.` };

    const rule = COUPONS[c];
    if (rule.minSubtotal && subtotalPaise < rule.minSubtotal * 100) {
        const more = Math.ceil((rule.minSubtotal * 100 - subtotalPaise) / 100);
        return { ok: false, code: c, reason: `${c} needs items worth ₹${rule.minSubtotal.toLocaleString('en-IN')} or more. Add ₹${more.toLocaleString('en-IN')} more to use it.` };
    }
    if (rule.firstOrderOnly && hasEarlierOrder()) return { ok: false, code: c, reason: `${c} is only valid on your first order.` };

    let discount = rule.type === 'flat' ? rule.value * 100 : Math.round(subtotalPaise * rule.value / 100);
    if (rule.maxDiscount) discount = Math.min(discount, rule.maxDiscount * 100);
    discount = Math.min(discount, subtotalPaise);                 // never more than the items cost
    return { ok: true, code: c, discount, title: rule.title };
}
