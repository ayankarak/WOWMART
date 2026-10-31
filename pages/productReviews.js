// =====================================================================
// WOWMART product reviews UI (used by product.js)
//
// Store + rules live in ../reviews.js (localStorage['wowmart_reviews']):
//   - you must be signed in to review
//   - one review per person per product (writing again edits yours)
//   - "Verified purchase" shows when this browser has an order containing the product
// The catalogue rating in productData.js is blended with these reviews, so the
// stars at the top of the page, on the shop cards and in "Customer Rating" sorting update too.
// Everything typed by a shopper is escaped before it is put on the page.
// =====================================================================
import { getReviews, getRatingSummary, addReview, deleteReview, currentUser, LIMITS, REVIEWS_EVENT } from '../reviews.js';
import { accountUrl } from '../paths.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function starsHTML(rating) {
    let h = '';
    for (let i = 1; i <= 5; i++) h += rating >= i ? '<i class="fa-solid fa-star"></i>' : rating >= i - 0.5 ? '<i class="fa-solid fa-star-half-stroke"></i>' : '<i class="fa-regular fa-star"></i>';
    return h;
}
const fmtDate = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };
const PAGE = 5;   // reviews shown before "Show more"

/** Keeps the stars + "(N reviews)" next to the product title in sync. */
export function paintHeaderRating(productId) {
    const r = getRatingSummary(productId);
    document.querySelectorAll('[data-rating-stars]').forEach((el) => { el.innerHTML = starsHTML(r.average); el.setAttribute('aria-label', `Rated ${r.average} out of 5`); });
    document.querySelectorAll('[data-rating-count]').forEach((el) => { el.textContent = `(${r.count} review${r.count === 1 ? '' : 's'})`; });
}

export function initReviews(productId, root) {
    if (!root) return;
    let shown = PAGE;
    let draftRating = 0;

    function render() {
        const sum = getRatingSummary(productId);
        const mine = getReviews(productId);
        const user = currentUser();
        const own = user ? mine.find((r) => r.user === user) : null;
        const maxBar = Math.max(1, ...Object.values(sum.distribution));

        const bars = [5, 4, 3, 2, 1].map((n) => `
            <li><span class="rv-bar-label">${n} <i class="fa-solid fa-star"></i></span>
                <span class="rv-bar"><span style="width:${(sum.distribution[n] / maxBar) * 100}%"></span></span>
                <span class="rv-bar-n">${sum.distribution[n]}</span></li>`).join('');

        const formHtml = !user ? `
            <div class="rv-login"><i class="fa-regular fa-pen-to-square"></i>
                <p>Sign in to share your experience with this product.</p>
                <a class="rv-btn" href="${esc(accountUrl('pages/product.html' + window.location.search))}">Sign in to write a review</a></div>` : `
            <form class="rv-form" id="reviewForm" novalidate>
                <h3>${own ? 'Edit your review' : 'Write a review'}</h3>
                <fieldset class="rv-field"><legend>Your rating</legend>
                    <div class="star-input" role="radiogroup" aria-label="Star rating">
                        ${[5, 4, 3, 2, 1].map((n) => `<input type="radio" name="rating" id="rvStar${n}" value="${n}"${(draftRating || (own && own.rating)) === n ? ' checked' : ''}><label for="rvStar${n}" title="${n} star${n === 1 ? '' : 's'}"><span aria-hidden="true">&#9733;</span><span class="sr-only">${n} star${n === 1 ? '' : 's'}</span></label>`).join('')}
                    </div></fieldset>
                <div class="rv-field"><label for="rvTitleInput">Headline <small>(optional)</small></label>
                    <input id="rvTitleInput" name="title" maxlength="${LIMITS.titleMax}" placeholder="Sum it up in a few words" value="${esc(own ? own.title : '')}"></div>
                <div class="rv-field"><label for="rvText">Your review</label>
                    <textarea id="rvText" name="text" rows="4" maxlength="${LIMITS.textMax}" placeholder="What did you like or dislike? (at least ${LIMITS.textMin} characters)">${esc(own ? own.text : '')}</textarea>
                    <small class="rv-count" id="rvCount"></small></div>
                <p class="rv-msg" id="rvMsg" role="alert"></p>
                <button type="submit" class="rv-btn">${own ? 'Update review' : 'Submit review'}</button>
                <small class="rv-as">Posting as <strong>${esc(user)}</strong></small>
            </form>`;

        const listHtml = mine.length ? `
            <ul class="rv-list">${mine.slice(0, shown).map((r) => `
                <li class="rv-item">
                    <div class="rv-head"><span class="stars" aria-label="${r.rating} out of 5">${starsHTML(r.rating)}</span>
                        ${r.title ? `<strong class="rv-title">${esc(r.title)}</strong>` : ''}</div>
                    <p class="rv-text">${esc(r.text)}</p>
                    <div class="rv-meta"><span>${esc(r.user)}</span><span>${esc(fmtDate(r.date))}</span>
                        ${r.verified ? '<span class="rv-verified"><i class="fa-solid fa-circle-check"></i> Verified purchase</span>' : ''}
                        ${user && r.user === user ? `<button type="button" class="rv-delete" data-delete="${esc(r.id)}">Delete</button>` : ''}</div>
                </li>`).join('')}</ul>
            ${mine.length > shown ? `<button type="button" class="rv-more" id="rvMore">Show more reviews (${mine.length - shown})</button>` : ''}` :
            '<p class="rv-none">No written reviews yet. Be the first to review this product!</p>';

        root.innerHTML = `
            <h2 id="rvTitle">Customer Reviews</h2>
            <div class="rv-grid">
                <div class="rv-summary">
                    <div class="rv-avg">${sum.count ? sum.average.toFixed(1) : '–'}<small> / 5</small></div>
                    <div class="stars rv-avg-stars">${starsHTML(sum.average)}</div>
                    <div class="rv-total">${sum.count} rating${sum.count === 1 ? '' : 's'}</div>
                    ${sum.local ? `<ul class="rv-bars" aria-label="Written reviews by star rating">${bars}</ul><div class="rv-bars-note">${sum.local} written review${sum.local === 1 ? '' : 's'}</div>` : ''}
                </div>
                <div class="rv-main">${formHtml}<div class="rv-listwrap">${listHtml}</div></div>
            </div>`;
        bindForm();
    }

    function bindForm() {
        const form = root.querySelector('#reviewForm');
        if (!form) return;
        const text = form.elements.text, count = root.querySelector('#rvCount'), msg = root.querySelector('#rvMsg');
        const paintCount = () => { count.textContent = `${text.value.length} / ${LIMITS.textMax}`; };
        text.addEventListener('input', paintCount); paintCount();
        form.addEventListener('change', (e) => { if (e.target.name === 'rating') { draftRating = Number(e.target.value); msg.textContent = ''; } });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const res = addReview(productId, { rating: form.elements.rating.value, title: form.elements.title.value, text: text.value });
            if (!res.ok) {
                msg.className = 'rv-msg error'; msg.textContent = res.reason;
                if (res.needsLogin) window.location.href = accountUrl('pages/product.html' + window.location.search);
                return;
            }
            draftRating = 0; shown = PAGE;
            render();                                                     // REVIEWS_EVENT also fires, harmless
            const m = root.querySelector('#rvMsg');
            m.className = 'rv-msg ok'; m.textContent = res.replaced ? 'Your review was updated. Thank you!' : 'Thanks! Your review has been posted.';
            root.querySelector('.rv-listwrap').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
    }

    root.addEventListener('click', (e) => {
        const del = e.target.closest('[data-delete]');
        if (del && window.confirm('Delete your review?')) { deleteReview(productId, del.dataset.delete); render(); return; }
        if (e.target.closest('#rvMore')) { shown += PAGE; render(); }
    });

    window.addEventListener(REVIEWS_EVENT, () => { paintHeaderRating(productId); });
    window.addEventListener('storage', (e) => { if (e.key === 'wowmart_reviews' || e.key === 'loggedInUser') { render(); paintHeaderRating(productId); } });

    render();
    paintHeaderRating(productId);
}
