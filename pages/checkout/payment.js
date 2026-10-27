import { initSiteHeader } from '../../header.js';
import { requireAddress, computeTotals, formatPrice, renderItemList, renderStepper, placeOrder } from './checkout.js';

initSiteHeader();
renderStepper(document.getElementById('stepper'), 3);

const UPI_APPS = [
    { id: 'gpay',     name: 'Google Pay', short: 'G',  color: '#4285f4' },
    { id: 'phonepe',  name: 'PhonePe',    short: 'Pe', color: '#5f259f' },
    { id: 'paytm',    name: 'Paytm',      short: 'Pt', color: '#00b9f1' },
    { id: 'bhim',     name: 'BHIM',       short: 'B',  color: '#e8731a' },
    { id: 'amazonpay',name: 'Amazon Pay', short: 'A',  color: '#232f3e' },
    { id: 'cred',     name: 'CRED',       short: 'C',  color: '#1c1c1c' }
];
const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank',
               'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank of India', 'IDFC FIRST Bank'];
const UPI_ID_RE = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/;

const ctx = requireAddress();
if (ctx) init(ctx);

function init({ lines }) {
    const method = new URLSearchParams(window.location.search).get('method') === 'netbanking' ? 'netbanking' : 'upi';
    const t = computeTotals(lines);
    const $ = (id) => document.getElementById(id);

    renderItemList($('miniItem'), lines);
    $('amount').textContent = formatPrice(t.total);
    $('payBtn').textContent = `Pay ${formatPrice(t.total)}`;

    let selectedApp = null;

    if (method === 'upi') {
        $('upiSection').hidden = false;
        $('payTitle').innerHTML = '<i class="fa-solid fa-mobile-screen-button"></i> UPI payment';

        // Built with DOM APIs (no HTML strings): app names are constants, but this keeps it safe by construction.
        const box = $('upiApps');
        UPI_APPS.forEach((app) => {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'upi-app'; b.dataset.app = app.id; b.setAttribute('aria-pressed', 'false');
            const badge = document.createElement('span');
            badge.className = 'upi-badge'; badge.style.background = app.color; badge.textContent = app.short;
            const label = document.createElement('span');
            label.textContent = app.name;
            b.append(badge, label);
            box.append(b);
        });
        box.addEventListener('click', (e) => {
            const b = e.target.closest('.upi-app');
            if (!b) return;
            selectedApp = b.dataset.app;
            box.querySelectorAll('.upi-app').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
            $('upiError').textContent = '';
        });
        $('upiId').addEventListener('input', () => { $('upiError').textContent = ''; });
    } else {
        $('bankSection').hidden = false;
        $('payTitle').innerHTML = '<i class="fa-solid fa-building-columns"></i> Net Banking';
        const sel = $('bankSelect');
        sel.append(new Option('-- Choose a bank --', ''));
        BANKS.forEach((b) => sel.append(new Option(b, b)));
    }

    $('payBtn').addEventListener('click', () => {
        let detail;
        if (method === 'upi') {
            const upiId = $('upiId').value.trim();
            if (!selectedApp && !upiId) { $('upiError').textContent = 'Choose a UPI app or enter your UPI ID.'; return; }
            if (upiId && !UPI_ID_RE.test(upiId)) { $('upiError').textContent = 'Enter a valid UPI ID, e.g. name@bank'; return; }
            const app = UPI_APPS.find((a) => a.id === selectedApp);
            detail = app ? app.name : upiId;
        } else {
            detail = $('bankSelect').value;
            if (!detail) { $('bankError').textContent = 'Please select your bank.'; return; }
        }

        // Simulated gateway: show a spinner for 2 seconds, then place the order.
        $('payBtn').disabled = true;
        $('processing').classList.add('open');
        setTimeout(() => placeOrder({ method: method === 'upi' ? 'UPI' : 'Net Banking', detail }), 2000);
    });
}
