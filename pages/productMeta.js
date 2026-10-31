// =====================================================================
// WOWMART product metadata that productData.js does not store itself:
//   brand   -> for the shop's brand filter
//   newest  -> for "Sort by: Newest"
//
// Nothing in productData.js has to change, but it can:
//   - add  brand: 'Nike'  to any product and it wins over the rules below
//   - "Newest" = the later a product appears in productData.js, the newer it is
//     (add new products at the BOTTOM of the file and they sort first).
// =====================================================================
import { PRODUCTS } from './productData.js';

// Brands that really appear in a product title (matched case-insensitively, first hit wins)
const TITLE_BRANDS = [
    ['oppo', 'OPPO'], ['one plus', 'OnePlus'], ['oneplus', 'OnePlus'], ['nothing', 'Nothing'],
    ['google', 'Google'], ['vivo', 'Vivo'], ['samsung', 'Samsung'], ['i phone', 'Apple'], ['iphone', 'Apple']
];

// Everything else is sold under a WOWMART house label for its category.
// Edit these names (or give a product its own `brand`) to change what the filter shows.
const HOUSE_BRANDS = {
    'Women': 'WOW Women', 'Men': 'WOW Men', 'Kids': 'WOW Kids', 'Footwear': 'WOW Footwear',
    'Home & Living': 'WOW Home', 'Electronics': 'WOW Tech', 'Mobiles': 'WOW Mobiles',
    'Automotive': 'WOW Auto', 'Trending Offers': 'WOW Essentials'
};

const ORDER = Object.keys(PRODUCTS);                 // insertion order = release order
const brandCache = new Map();

/** Brand name of a product id (never empty). */
export function getBrand(id) {
    if (brandCache.has(id)) return brandCache.get(id);
    const p = PRODUCTS[id];
    let brand = 'WOWMART';
    if (p) {
        if (p.brand) brand = String(p.brand);
        else {
            const title = p.title.toLowerCase();
            const hit = TITLE_BRANDS.find(([needle]) => title.includes(needle));
            brand = hit ? hit[1] : (HOUSE_BRANDS[p.category] || 'WOWMART');
        }
    }
    brandCache.set(id, brand);
    return brand;
}

/** Higher number = newer product. */
export const getNewestRank = (id) => ORDER.indexOf(id);
