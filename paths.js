// =====================================================================
// WOWMART path helpers (shared by every page and script)
//
// The site root is worked out from where THIS file lives (import.meta.url),
// not from the page that happens to be open. So the same helper returns the
// right link from index.html, pages/shop.html, pages/product.html, or from a
// site hosted in a sub-folder (e.g. https://user.github.io/wowmart/).
//
// RULE: keep this file in the site root, next to index.html.
// =====================================================================

const ROOT  = new URL('./', import.meta.url);   // .../  (folder with index.html)
const PAGES = new URL('pages/', ROOT);          // .../pages/

/** Absolute URL of a file in the site root, e.g. rootUrl('index.html'). */
export const rootUrl = (path = '') => new URL(path, ROOT).href;

/** Absolute URL of a file in /pages/, e.g. pagesUrl('shop.html'). */
export const pagesUrl = (path = '') => new URL(path, PAGES).href;

export const homeUrl = () => rootUrl('index.html');

/**
 * Account page. `redirect` is where auth.js sends the user after signing in;
 * auth.js resolves it from the root (account.html lives there), so pass a
 * root-relative path such as 'pages/product.html?id=phone-1'.
 */
export function accountUrl(redirect) {
    const base = rootUrl('account.html');
    return redirect ? `${base}?redirect=${encodeURIComponent(redirect)}` : base;
}

export const productUrl = (id) => pagesUrl(`product.html?id=${encodeURIComponent(id)}`);

/** Shop page, optionally filtered: shopUrl('shirt'), shopUrl('', 'Men'), shopUrl('shirt', 'Men'). */
export function shopUrl(query, category) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    const qs = params.toString();
    return pagesUrl(`shop.html${qs ? '?' + qs : ''}`);
}

/** Image paths in productData.js are written relative to /pages/ ('../assets/x.png'). */
export const assetUrl = (path) => new URL(path, PAGES).href;
