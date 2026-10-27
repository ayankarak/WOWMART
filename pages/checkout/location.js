import { initSiteHeader } from '../../header.js';
import { checkoutUrl } from '../../paths.js';
import { requireLines, updateCheckout, getCheckout, getSavedAddresses, saveAddress,
         renderItemList, renderStepper, backUrlForCheckout, esc } from './checkout.js';

initSiteHeader();
renderStepper(document.getElementById('stepper'), 1);

const lines = requireLines();          // every item being bought (whole cart, or the single Buy-Now item)
if (lines) init(lines);

function init(lines) {
    renderItemList(document.getElementById('miniItem'), lines);
    document.getElementById('backLink').href = backUrlForCheckout(lines);   // cart page, or the product page for Buy Now

    const form = document.getElementById('addressForm');
    const FIELDS = ['fullName', 'phone', 'line1', 'landmark', 'city', 'state', 'pincode'];

    const rules = {
        fullName: (v) => v.length >= 2 || 'Enter your full name',
        phone:    (v) => /^[6-9]\d{9}$/.test(v) || 'Enter a valid 10-digit mobile number',
        line1:    (v) => v.length >= 5 || 'Enter your house no. and street',
        city:     (v) => v.length >= 2 || 'Enter your city',
        state:    (v) => v.length >= 2 || 'Enter your state',
        pincode:  (v) => /^[1-9]\d{5}$/.test(v) || 'Enter a valid 6-digit PIN code'
    };

    function setError(name, msg) {
        const field = form.elements[name].closest('.field');
        field.classList.toggle('invalid', !!msg);
        field.querySelector('.error').textContent = msg || '';
    }
    function validate(name) {
        const rule = rules[name];
        const res = rule ? rule(form.elements[name].value.trim()) : true;
        setError(name, res === true ? '' : res);
        return res === true;
    }

    // digits only for phone / PIN
    ['phone', 'pincode'].forEach((n) =>
        form.elements[n].addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, ''); }));
    FIELDS.forEach((n) => form.elements[n].addEventListener('blur', () => validate(n)));

    function fill(a) {
        FIELDS.forEach((n) => { form.elements[n].value = a[n] || ''; });
        const type = form.querySelector(`input[name="type"][value="${a.type || 'Home'}"]`);
        if (type) type.checked = true;
        FIELDS.forEach((n) => setError(n, ''));
    }

    // Pre-fill: address already chosen in this checkout (user came back via "Change"), else nothing.
    const current = (getCheckout() || {}).address;
    if (current) fill(current);

    // Previously used addresses (this browser)
    const saved = getSavedAddresses();
    const box = document.getElementById('savedAddresses');
    if (saved.length) {
        box.hidden = false;
        box.innerHTML = saved.map((a, i) =>
            `<button type="button" class="saved-addr" data-i="${i}"><strong>${esc(a.fullName)}</strong> &middot; ${esc(a.type)}<br>${esc(a.line1)}, ${esc(a.city)} ${esc(a.pincode)}</button>`).join('');
        box.addEventListener('click', (e) => {
            const b = e.target.closest('.saved-addr');
            if (b) fill(saved[Number(b.dataset.i)]);
        });
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const ok = Object.keys(rules).map(validate).every(Boolean);   // run all so every error shows
        if (!ok) { form.querySelector('.invalid input')?.focus(); return; }

        const address = { type: form.elements.type.value };
        FIELDS.forEach((n) => { address[n] = form.elements[n].value.trim(); });

        saveAddress(address);
        updateCheckout({ address, payment: null });               // items were already saved by the cart / product page
        window.location.href = checkoutUrl('billing.html');       // -> Bill page
    });
}
