import { initSiteHeader } from '../../header.js';
import { homeUrl, shopUrl } from '../../paths.js';
import { getOrder, formatPrice, esc, renderStepper } from './checkout.js';

initSiteHeader();
renderStepper(document.getElementById('stepper'), 5);   // all steps shown as done

const root = document.getElementById('confirm');
const order = getOrder(new URLSearchParams(window.location.search).get('order'));

if (!order) {
    root.innerHTML = `<div class="card"><h1>Order not found</h1><p style="margin:10px 0 18px">We couldn't find this order on this device.</p>
        <a class="btn btn-primary" href="${esc(shopUrl())}">Continue shopping</a></div>`;
} else {
    const a = order.address, p = order.payment, t = order.totals;
    const items = order.items || (order.item ? [order.item] : []);       // order.item = older single-item orders
    const eta = new Date(new Date(order.placedAt).getTime() + 5 * 864e5)
        .toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    const payLabel = p.method === 'COD' ? 'Cash on Delivery' : `${p.method}${p.detail ? ' (' + p.detail + ')' : ''}`;

    const itemRows = items.map((it) => {
        const opts = [it.color, it.size].filter(Boolean).join(', ');
        return `<div class="row"><span>${esc(it.title)}${opts ? ' <small>(' + esc(opts) + ')</small>' : ''}</span><span>&times; ${it.qty} &middot; ${esc(formatPrice(it.price * it.qty))}</span></div>`;
    }).join('');

    root.innerHTML = `
        <div class="tick"><i class="fa-solid fa-check"></i></div>
        <h1>Thank you! Your order is confirmed</h1>
        <p class="order-id">Order ID: <strong>${esc(order.orderId)}</strong></p>
        <div class="card summary">
            ${itemRows}
            <div class="row"><span>Delivering to</span><span>${esc(a.fullName)}<br>${esc(a.line1)}, ${esc(a.city)}, ${esc(a.state)} ${esc(a.pincode)}</span></div>
            <div class="row"><span>Estimated delivery</span><span>${esc(eta)}</span></div>
            <div class="row"><span>Payment</span><span>${esc(payLabel)}<br><small>${esc(p.status)}</small></span></div>
            <div class="row"><span><strong>${p.method === 'COD' ? 'Amount to pay on delivery' : 'Amount paid'}</strong></span><span><strong>${esc(formatPrice(t.total))}</strong></span></div>
        </div>
        <div class="actions" style="justify-content:center">
            <a class="btn btn-secondary" href="${esc(homeUrl())}">Home</a>
            <a class="btn btn-primary" href="${esc(shopUrl())}">Continue shopping</a>
        </div>`;
}
