import { PRODUCTS } from './productData.js';

(function () {
  'use strict';

  const MAX_QTY = 10;
  const container = document.getElementById('productContainer');
  if (!container) return;

  // Utility to escape HTML characters
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Format price in Indian Rupees
  const formatPrice = (n) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2
  }).format(n);

  // Generate star rating icons HTML
  function starsHTML(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) html += '<i class="fa-solid fa-star"></i>';
      else if (rating >= i - 0.5) html += '<i class="fa-solid fa-star-half-stroke"></i>';
      else html += '<i class="fa-regular fa-star"></i>';
    }
    return html;
  }

  // Get product ID from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  const product = productId && Object.prototype.hasOwnProperty.call(PRODUCTS, productId) ? PRODUCTS[productId] : null;

  if (!product) {
    renderNotFound(productId);
    return;
  }

  // Set page titles and breadcrumbs
  document.title = product.title + ' - WILLMART';
  const breadcrumbTitle = document.getElementById('breadcrumb-title');
  const breadcrumbCategory = document.getElementById('breadcrumb-category');
  if (breadcrumbTitle) breadcrumbTitle.textContent = product.title;
  if (breadcrumbCategory) breadcrumbCategory.textContent = product.category;

  container.innerHTML = buildHTML(product);
  bindEvents(product);

  // Render error view if product is not found
  function renderNotFound(badId) {
    container.classList.add('is-empty');
    const box = document.createElement('div');
    box.className = 'not-found';

    const h = document.createElement('h1');
    h.textContent = 'Product not found';
    const p = document.createElement('p');
    p.textContent = badId
      ? 'We couldn\'t find a product with the id "' + badId + '".'
      : 'No product id was given in the URL.';
    const a = document.createElement('a');
    a.href = '../index.html';
    a.className = 'buy-now-btn';
    a.textContent = 'Back to home';

    box.append(h, p, a);
    container.replaceChildren(box);
  }

  // Build the HTML structure for the product page
  function buildHTML(p) {
    const inStock = p.stock > 0;

    const thumbs = p.images.map((src, i) =>
      `<img class="thumb-img${i === 0 ? ' active' : ''}" src="${esc(src)}" alt="${esc(p.title)}" data-src="${esc(src)}">`
    ).join('');

    const colors = p.colors ? `
      <div class="option-group">
        <span class="option-label">Colours: <span id="colorName">${esc(p.colors[0].name)}</span></span>
        <div class="colors" id="colors">
          ${p.colors.map((c, i) => `
            <button type="button" class="color-circle${i === 0 ? ' active' : ''}" style="background:${esc(c.hex)}"
                    data-color="${esc(c.name)}" title="${esc(c.name)}"></button>`).join('')}
        </div>
      </div>` : '';

    const sizes = p.sizes ? `
      <div class="option-group">
        <span class="option-label">Size:</span>
        <div class="sizes" id="sizes">
          ${p.sizes.map((s) => `<button type="button" class="size-btn" data-size="${esc(s)}">${esc(s)}</button>`).join('')}
        </div>
      </div>` : '';

    return `
      <section class="product-gallery">
        <div class="thumbnails" id="thumbnails">${thumbs}</div>
        <div class="main-img-box"><img id="mainImage" src="${esc(p.images[0])}" alt="${esc(p.title)}"></div>
      </section>

      <section class="product-info-right">
        <h1>${esc(p.title)}</h1>
        <div class="rating-stock">
          <span class="stars">${starsHTML(p.rating)}</span>
          <span class="reviews">(${p.reviews} reviews)</span>
          <span class="stock ${inStock ? '' : 'out'}">${inStock ? 'In Stock' : 'Out of Stock'}</span>
        </div>
        <div class="price">${formatPrice(p.price)}</div>
        <p class="description">${esc(p.description)}</p>

        ${colors}
        ${sizes}

        <div class="purchase-box">
          <div class="qty-selector">
            <button type="button" class="qty-btn" id="qtyMinus">&minus;</button>
            <input class="qty-input" id="qtyInput" type="text" value="1" readonly>
            <button type="button" class="qty-btn" id="qtyPlus">+</button>
          </div>
          <button type="button" class="buy-now-btn" id="buyNowBtn" ${inStock ? '' : 'disabled'}>Buy Now</button>
          <button type="button" class="add-cart-btn" id="addCartBtn" ${inStock ? '' : 'disabled'}>Add to Cart</button>
        </div>
        <p class="purchase-msg" id="purchaseMsg"></p>

        <div class="delivery-info">
          <div class="delivery-item">
            <i class="fa-solid fa-truck-fast"></i>
            <div><strong>Free Delivery</strong><br>Enter your postal code for delivery availability</div>
          </div>
          <div class="delivery-item">
            <i class="fa-solid fa-rotate-left"></i>
            <div><strong>Return Delivery</strong><br>Free 30 days delivery returns</div>
          </div>
        </div>
      </section>`;
  }

  // Bind event listeners for interactivity
  function bindEvents(p) {
    const $ = (sel) => container.querySelector(sel);
    const maxQty = Math.max(1, Math.min(p.stock, MAX_QTY));
    const state = { color: p.colors ? p.colors[0].name : null, size: null, qty: 1 };

    // Thumbnail image switcher
    const mainImage = $('#mainImage');
    const thumbBox = $('#thumbnails');

    thumbBox.addEventListener('click', (e) => {
      const thumb = e.target.closest('.thumb-img');
      if (!thumb) return;
      mainImage.src = thumb.dataset.src;
      thumbBox.querySelectorAll('.thumb-img').forEach((t) => t.classList.toggle('active', t === thumb));
    });

    // Option selectors (Colors & Sizes)
    function bindOption(groupId, btnClass, dataKey, onPick) {
      const group = $(groupId);
      if (!group) return;
      group.addEventListener('click', (e) => {
        const btn = e.target.closest('.' + btnClass);
        if (!btn) return;
        group.querySelectorAll('.' + btnClass).forEach((b) => b.classList.toggle('active', b === btn));
        onPick(btn.dataset[dataKey]);
        showMessage('');
      });
    }

    bindOption('#colors', 'color-circle', 'color', (name) => {
      state.color = name;
      $('#colorName').textContent = name;
    });

    bindOption('#sizes', 'size-btn', 'size', (size) => {
      state.size = size;
    });

    // Quantity controls
    const qtyInput = $('#qtyInput');
    const minus = $('#qtyMinus');
    const plus = $('#qtyPlus');

    function setQty(n) {
      state.qty = Math.min(maxQty, Math.max(1, Number.isFinite(n) ? n : 1));
      qtyInput.value = state.qty;
      minus.disabled = state.qty <= 1;
      plus.disabled = state.qty >= maxQty;
    }

    minus.addEventListener('click', () => setQty(state.qty - 1));
    plus.addEventListener('click', () => setQty(state.qty + 1));
    setQty(1);

    // Purchase notifications
    const msg = $('#purchaseMsg');
    function showMessage(text, type) {
      msg.textContent = text;
      msg.className = 'purchase-msg' + (type ? ' ' + type : '');
    }

    function buildCartItem() {
      if (p.sizes && !state.size) {
        showMessage('Please select a size first.', 'error');
        return null;
      }
      return { id: productId, title: p.title, price: p.price, qty: state.qty, size: state.size, color: state.color };
    }

    // Add to cart button event
    $('#addCartBtn').addEventListener('click', () => {
      const item = buildCartItem();
      if (!item) return;

      let cart = JSON.parse(localStorage.getItem('cart')) || [];
      cart.push(item);
      localStorage.setItem('cart', JSON.stringify(cart));

      showMessage('Added to cart ✓', 'success');
    });

    // Buy now button event
    $('#buyNowBtn').addEventListener('click', () => {
      const item = buildCartItem();
      if (!item) return;

      const loggedInUser = localStorage.getItem('loggedInUser');
      if (!loggedInUser) {
        window.location.href = 'account.html?redirect=' + encodeURIComponent('product.html' + window.location.search);
        return;
      }
      let cart = JSON.parse(localStorage.getItem('cart')) || [];
      cart.push(item);
      localStorage.setItem('cart', JSON.stringify(cart));
      showMessage('Proceeding to checkout...', 'success');
    });
  }
})();