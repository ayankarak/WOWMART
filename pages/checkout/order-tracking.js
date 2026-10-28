import { initSiteHeader } from '../../header.js';
import { getOrder, esc, formatPrice } from './checkout.js';

initSiteHeader();

const form = document.getElementById('trackingForm');
const input = document.getElementById('trackingIdInput');
const result = document.getElementById('trackingResult');

const steps = ['Packed', 'Shipped', 'Out for Delivery', 'Delivered'];

function findOrder(id) {
    try {
        const orders = JSON.parse(localStorage.getItem('wowmart_orders') || '[]');
        return orders.find(o => 
            o.trackingId?.toLowerCase() === id.toLowerCase() || 
            o.orderId?.toLowerCase() === id.toLowerCase()
        ) || getOrder(id);
    } catch {
        return getOrder(id);
    }
}

function show(order) {
    if (!order) {
        result.innerHTML = '<p class="tracking-error">No order found for that tracking ID on this device.</p>';
        return;
    }

    const status = steps.indexOf(order.trackingStatus || 'Packed');
    const active = Math.max(0, status);

    result.innerHTML = `
        <h2>Tracking details</h2>
        <p>Tracking ID: <strong>${esc(order.trackingId || order.orderId)}</strong></p>
        <p>Order ID: <strong>${esc(order.orderId)}</strong></p>
        <p>Current status: <strong>${esc(steps[active])}</strong></p>
        <ol class="tracking-steps">
            ${steps.map((s, i) => `
                <li class="${i < active ? 'done' : i === active ? 'current' : ''}">
                    <span class="tracking-dot">${i < active ? '✓' : i + 1}</span>
                    <strong>${s}</strong>
                    <small>${i < active ? 'Completed' : i === active ? 'Current status' : 'Pending'}</small>
                </li>
            `).join('')}
        </ol>
        <p class="tracking-note">This demo storefront stores order details in this browser. Live courier updates require a backend/courier integration.</p>
    `;
}

form.addEventListener('submit', e => {
    e.preventDefault();
    show(findOrder(input.value.trim()));
});

const params = new URLSearchParams(location.search);
const tracking = params.get('tracking') || params.get('order');

if (tracking) {
    input.value = tracking;
    show(findOrder(tracking));
}