// =====================================================================
// WOWMART order tracking page (pages/checkout/tracking.html)
//   tracking.html                -> search box + your recent orders on this device
//   tracking.html?id=WMT1234...  -> that shipment's progress (an order ID works too)
// Status moves Packed -> Shipped -> Out for Delivery -> Delivered. With no courier behind this
// demo store, the "Simulate next update" button plays the part of the courier.
// =====================================================================
import { initSiteHeader } from '../../header.js';
import { trackingUrl, shopUrl } from '../../paths.js';
import { getOrders, ensureTracking, findOrderByTracking, advanceTracking, trackerHtml, TRACK_STAGES, formatPrice, esc } from './checkout.js';

initSiteHeader();

const form = document.getElementById('trackForm');
const input = document.getElementById('trackInput');
const errorEl = document.getElementById('trackError');
const result = document.getElementById('trackResult');
const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' });

function show(code, { updateUrl = true } = {}) {
    errorEl.textContent = '';
    if (!code) { renderHome(); return; }
    const order = findOrderByTracking(code);
    if (!order) {
        result.innerHTML = '';
        errorEl.textContent = `We couldn't find an order for "${code.trim()}" on this device. Check the Tracking ID from your confirmation page.`;
        input.focus();
        return;
    }
    input.value = order.tracking.id;
    if (updateUrl) { try { history.replaceState(null, '', trackingUrl(order.tracking.id)); } catch { /* ignore */ } }
    renderOrder(order);
}

function renderOrder(order) {
    const tr = order.tracking, stage = TRACK_STAGES[tr.stage];
    const delivered = tr.stage === TRACK_STAGES.length - 1;
    const a = order.address, items = order.items || (order.item ? [order.item] : []);
    const eta = new Date(new Date(order.placedAt).getTime() + 5 * 864e5).toISOString();

    result.innerHTML = `
        <section class="card track-card" aria-live="polite">
            <div class="track-head">
                <div><small>Tracking ID</small><strong>${esc(tr.id)}</strong></div>
                <div><small>Order ID</small><strong>${esc(order.orderId)}</strong></div>
                <div><small>${delivered ? 'Delivered' : 'Estimated delivery'}</small><strong>${esc(fmtDate(delivered ? tr.history[tr.history.length - 1].at : eta))}</strong></div>
            </div>
            <p class="track-status ${delivered ? 'done' : ''}"><i class="fa-solid ${stage.icon}"></i> <strong>${esc(stage.label)}</strong> &mdash; ${esc(stage.text)}</p>
            ${trackerHtml(tr)}
            ${delivered ? '' : `<div class="demo-box">
                <button type="button" class="btn btn-secondary" id="advanceBtn"><i class="fa-solid fa-forward-step"></i> Simulate next update</button>
                <small>Demo store: no real courier is connected, so use this to see the next status.</small></div>`}
        </section>
        <section class="card">
            <h2><i class="fa-solid fa-box"></i> Order details</h2>
            <div class="confirm"><div class="summary" style="text-align:left">
                ${items.map((it) => `<div class="row"><span>${esc(it.title)}${[it.color, it.size].filter(Boolean).length ? ' <small>(' + esc([it.color, it.size].filter(Boolean).join(', ')) + ')</small>' : ''}</span><span>&times; ${it.qty}</span></div>`).join('')}
                <div class="row"><span>Delivering to</span><span>${esc(a.fullName)}<br>${esc(a.line1)}, ${esc(a.city)}, ${esc(a.state)} ${esc(a.pincode)}</span></div>
                <div class="row"><span>Payment</span><span>${esc(order.payment.method === 'COD' ? 'Cash on Delivery' : order.payment.method)}<br><small>${esc(order.payment.status)}</small></span></div>
                <div class="row"><span><strong>Total</strong></span><span><strong>${esc(formatPrice(order.totals.total))}</strong></span></div>
            </div></div>
        </section>`;
}

function renderHome() {
    const orders = getOrders().map(ensureTracking);
    result.innerHTML = orders.length ? `
        <section class="card">
            <h2><i class="fa-solid fa-clock-rotate-left"></i> Your recent orders</h2>
            <ul class="order-list">${orders.map((o) => `
                <li><a href="${esc(trackingUrl(o.tracking.id))}">
                    <span><strong>${esc(o.tracking.id)}</strong><small>${(o.items || [o.item]).map((i) => esc(i.title)).join(', ')}</small></span>
                    <span class="pill ${o.tracking.stage === 3 ? 'done' : ''}">${esc(TRACK_STAGES[o.tracking.stage].label)}</span></a></li>`).join('')}</ul>
        </section>` : `
        <section class="card" style="text-align:center">
            <p style="margin-bottom:14px">You have no orders on this device yet.</p>
            <a class="btn btn-primary" href="${esc(shopUrl())}">Start shopping</a>
        </section>`;
}

form.addEventListener('submit', (e) => { e.preventDefault(); show(input.value); });
result.addEventListener('click', (e) => {
    if (!e.target.closest('#advanceBtn')) return;
    const tid = input.value;
    const order = findOrderByTracking(tid);
    if (order) { renderOrder(advanceTracking(order.orderId)); document.getElementById('advanceBtn')?.focus(); }
});

show(new URLSearchParams(window.location.search).get('id') || '', { updateUrl: false });
