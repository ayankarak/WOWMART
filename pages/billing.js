import { initSiteHeader } from '../header.js';
import { pagesUrl } from '../paths.js';
import { requireAddress, computeTotals, formatPrice, esc, renderMiniItem, renderStepper,
         updateCheckout, createModal, placeOrder } from './checkout.js';

initSiteHeader();
renderStepper(document.getElementById('stepper'), 2);

const line = requireAddress();
if (line) init(line);

function init({ product, item, address }) {
    // Delivery address
    document.getElementById('addressBox').innerHTML = `
        <strong>${esc(address.fullName)}</strong><span class="tag">${esc(address.type)}</span><br>
        ${esc(address.line1)}${address.landmark ? ', ' + esc(address.landmark) : ''}<br>
        ${esc(address.city)}, ${esc(address.state)} &ndash; ${esc(address.pincode)}<br>
        <i class="fa-solid fa-phone"></i> ${esc(address.phone)}`;

    // Item + itemised bill (price comes from productData.js, never from localStorage)
    renderMiniItem(document.getElementById('itemRow'), product, item);
    const t = computeTotals(product, item.qty);
    document.getElementById('billTable').innerHTML = `
        <tr><td>${esc(product.title)}</td><td></td></tr>
        <tr><td>Price</td><td>${esc(formatPrice(product.price))}</td></tr>
        <tr><td>Quantity</td><td>&times; ${item.qty}</td></tr>
        <tr><td>Subtotal</td><td>${esc(formatPrice(t.subtotal))}</td></tr>
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
        window.location.href = pagesUrl(`payment.html?method=${method}`);
    };
    $('upiBtn').addEventListener('click', () => goPay('upi'));
    $('netBankBtn').addEventListener('click', () => goPay('netbanking'));
}
