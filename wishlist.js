// WOWMART wishlist helpers shared by every page.
import { productUrl } from './paths.js';

const KEY = 'wowmartWishlist';

export const getWishlist = () => {
    try {
        const v = JSON.parse(localStorage.getItem(KEY) || '[]');
        return Array.isArray(v) ? v : [];
    } catch {
        return [];
    }
};

export function isWishlisted(id) {
    return getWishlist().includes(String(id));
}

export function toggleWishlist(id) {
    const list = getWishlist();
    const key = String(id);
    const next = list.includes(key)
        ? list.filter(x => x !== key)
        : [...list, key];
        
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('wowmart:wishlist', { detail: next }));
    return next.includes(key);
}

export function wishlistButton(id, active = isWishlisted(id)) {
    const safeId = String(id).replace(/[&<>"']/g, '');
    const heartIcon = active ? 'fa-solid' : 'fa-regular';
    const label = active ? 'Remove from' : 'Add to';

    return `<button type="button" class="wishlist-btn${active ? ' is-active' : ''}" data-wishlist-id="${safeId}" aria-label="${label} wishlist" aria-pressed="${active}"><i class="${heartIcon} fa-heart"></i></button>`;
}

export function bindWishlist(root = document) {
    root.addEventListener('click', e => {
        const btn = e.target.closest('[data-wishlist-id]');
        if (!btn) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const active = toggleWishlist(btn.dataset.wishlistId);
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
        btn.setAttribute('aria-label', `${active ? 'Remove from' : 'Add to'} wishlist`);
        btn.innerHTML = `<i class="fa-${active ? 'solid' : 'regular'} fa-heart"></i>`;
    });
}