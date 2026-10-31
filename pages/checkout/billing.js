import { initSiteHeader } from '../../header.js';
import { checkoutUrl } from '../../paths.js';
import { requireAddress, getTotals, applyCoupon, removeCoupon, getCheckout, formatPrice, esc, lineTotal, renderItemList, renderStepper,
         updateCheckout, createModal, placeOrder } from './checkout.js';
import { COUPONS } from './coupons.js';

initSiteHeader();
renderStepper(document.getElementById('stepper'), 2);

const ctx = requireAddress();
if (ctx) init(ctx);

function init({ lines, address }) {
    // Delivery address
    document.getElementById('addressBox').innerHTML = `
        <strong>${esc(address.fullName)}</strong><span class="tag">${esc(address.type)}</span><br>
        ${esc(address.line1)}${address.landmark ? ', ' + esc(address.landmark) : ''}<br>
        ${esc(address.city)}, ${esc(address.state)} &ndash; ${esc(address.pincode)}<br>
        <i class="fa-solid fa-phone"></i> ${esc(address.phone)}`;

    // Items + itemised bill (prices come from productData.js, never from localStorage)
    renderItemList(document.getElementById('itemRow'), lines);
    document.getElementById('itemCount').textContent = lines.length;

    const $ = (id) => document.getElementById(id);

    /** Draw the bill table + every "Total to pay" label. Runs again whenever the coupon changes. */
    function renderBill() {
        const t = getTotals(lines);
        const itemRows = lines.map(({ product, item }) =>
            `<tr><td>${esc(product.title)} <span class="qty">&times; ${item.qty}</span></td><td>${esc(formatPrice(lineTotal(product, item.qty)))}</td></tr>`).join('');
        $('billTable').innerHTML = `
            ${itemRows}
            <tr class="sep"><td>Subtotal (${t.units} item${t.units === 1 ? '' : 's'})</td><td>${esc(formatPrice(t.subtotal))}</td></tr>
            ${t.coupon ? `<tr class="discount"><td>Coupon discount (${esc(t.coupon.code)})</td><td>&minus; ${esc(formatPrice(t.discount))}</td></tr>` : ''}
            <tr><td>Delivery charges</td><td>${t.delivery === 0 ? '<span class="free">FREE</span>' : esc(formatPrice(t.delivery))}</td></tr>
            <tr><td>GST (${t.gstPercent}%)</td><td>${esc(formatPrice(t.tax))}</td></tr>
            <tr class="total"><td>Total Amount</td><td>${esc(formatPrice(t.total))}</td></tr>`;
        $('billNote').textContent = t.coupon
            ? `You saved ${formatPrice(t.discount)} with ${t.coupon.code}. Free delivery on orders of ${formatPrice(t.freeDeliveryAbove).replace('.00', '')} or more.`
            : `Free delivery on orders of ${formatPrice(t.freeDeliveryAbove).replace('.00', '')} or more.`;
        document.querySelectorAll('[data-total]').forEach((el) => { el.textContent = formatPrice(t.total); });

        // Coupon box: applied chip OR input + suggestions
        const applied = $('couponApplied'), form = $('couponForm'), list = $('couponList');
        applied.hidden = !t.coupon; form.hidden = !!t.coupon; list.hidden = !!t.coupon;
        if (t.coupon) {
            applied.innerHTML = `<span><i class="fa-solid fa-circle-check"></i> <strong>${esc(t.coupon.code)}</strong> applied &middot; ${esc(t.coupon.title)}</span>
                <button type="button" class="link-btn" id="couponRemove">Remove</button>`;
        }
        return t;
    }

    // Suggested coupons (click to apply)
    $('couponList').innerHTML = Object.entries(COUPONS).map(([code, c]) =>
        `<button type="button" class="coupon-chip" data-code="${esc(code)}"><strong>${esc(code)}</strong><small>${esc(c.title)} &middot; ${esc(c.note)}</small></button>`).join('');

    function tryApply(code) {
        const msg = $('couponMsg');
        const res = applyCoupon(lines, code);
        if (!res.ok) { msg.className = 'coupon-msg error'; msg.textContent = res.reason; $('couponInput').focus(); return; }
        $('couponInput').value = '';
        const t = renderBill();
        msg.className = 'coupon-msg ok';
        msg.textContent = `Coupon ${res.code} applied: you save ${formatPrice(t.discount)}.`;
    }
    $('couponForm').addEventListener('submit', (e) => { e.preventDefault(); tryApply($('couponInput').value); });
    $('couponList').addEventListener('click', (e) => { const b = e.target.closest('.coupon-chip'); if (b) tryApply(b.dataset.code); });
    $('couponApplied').addEventListener('click', (e) => {
        if (!e.target.closest('#couponRemove')) return;
        removeCoupon(); $('couponMsg').className = 'coupon-msg'; $('couponMsg').textContent = 'Coupon removed.';
        renderBill(); $('couponInput').focus();
    });

    // A coupon left from earlier in this checkout that is no longer valid gets dropped by getTotals();
    // tell the shopper why instead of silently changing the total.
    const before = (getCheckout() || {}).coupon;
    const t0 = renderBill();
    if (before && !t0.coupon) { $('couponMsg').className = 'coupon-msg error'; $('couponMsg').textContent = t0.couponError || `Coupon ${before} is no longer valid.`; }

    // Modals
    const payModal = createModal(document.getElementById('payModal'));
    const onlineModal = createModal(document.getElementById('onlineModal'));
    $('orderNowBtn').addEventListener('click', payModal.open);

    // A: Cash on Delivery -> order is confirmed right away
    $('codBtn').addEventListener('click', () => placeOrder({ method: 'COD' }));

    // B: Payment Now -> second popup
    $('payNowBtn').addEventListener('click', () => { payModal.close(); onlineModal.open(); });
    $('backToPayModal').addEventListener('click', () => { onlineModal.close(); payModal.open(); });

    // UPI / Net Banking -> payment.html?method=...
    const goPay = (method) => {
        updateCheckout({ payment: { method } });
        window.location.href = checkoutUrl(`payment.html?method=${method}`);
    };
    $('upiBtn').addEventListener('click', () => goPay('upi'));
    $('netBankBtn').addEventListener('click', () => goPay('netbanking'));
}
