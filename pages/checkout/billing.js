import { initSiteHeader } from '../../header.js';
import { checkoutUrl } from '../../paths.js';
import { requireAddress, computeTotals, formatPrice, esc, lineTotal, renderItemList, renderStepper,
         updateCheckout, createModal, placeOrder } from './checkout.js';

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
    const t = computeTotals(lines);
    const itemRows = lines.map(({ product, item }) =>
        `<tr><td>${esc(product.title)} <span class="qty">&times; ${item.qty}</span></td><td>${esc(formatPrice(lineTotal(product, item.qty)))}</td></tr>`).join('');
    document.getElementById('billTable').innerHTML = `
        ${itemRows}
        <tr class="sep"><td>Subtotal (${t.units} item${t.units === 1 ? '' : 's'})</td><td>${esc(formatPrice(t.subtotal))}</td></tr>
        <tr><td>Delivery charges</td><td>${t.delivery === 0 ? '<span class="free">FREE</span>' : esc(formatPrice(t.delivery))}</td></tr>
        <tr><td>GST (${t.gstPercent}%)</td><td>${esc(formatPrice(t.tax))}</td></tr>
        <tr class="total"><td>Total Amount</td><td>${esc(formatPrice(t.total))}</td></tr>`;
    document.getElementById('billNote').textContent =
        `Free delivery on orders of ${formatPrice(t.freeDeliveryAbove).replace('.00', '')} or more.`;
    document.querySelectorAll('[data-total]').forEach((el) => { el.textContent = formatPrice(t.total); });

    // Modals
    const payModal = createModal(document.getElementById('payModal'));
    const onlineModal = createModal(document.getElementById('onlineModal'));
    const $ = (id) => document.getElementById(id);

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
