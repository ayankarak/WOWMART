(function () {
  'use strict';

  const PRODUCTS = {
    'women-kit-01': {
      title: 'Women Essential Kit',
      category: 'Women',
      price: 299.95,
      rating: 4.5,
      reviews: 128,
      stock: 25,
      description: 'Includes all the necessary things for daily health care, packed in a compact travel-friendly pouch.',
      images: ['assets/women_kit.png'],
      colors: [{ name: 'Pink', hex: '#f4a6c0' }, { name: 'White', hex: '#f2f2f2' }],
      sizes: ['S', 'M', 'L']
    },
    'car-cover-01': {
      title: 'Car Cover',
      category: 'Automotive',
      price: 299.95,
      rating: 4,
      reviews: 64,
      stock: 12,
      description: 'Water-resistant, UV-protected cover from verified sellers. Elastic hem keeps it snug in strong wind.',
      images: ['assets/car_cover.png'],
      colors: [{ name: 'Silver', hex: '#b8bcc2' }, { name: 'Black', hex: '#222222' }],
      sizes: ['S', 'M', 'L', 'XL']
    },
    'laptop-01': {
      title: 'Everyday Laptop',
      category: 'Electronics',
      price: 35990,
      rating: 4.5,
      reviews: 342,
      stock: 8,
      description: 'Pocket-friendly laptop for study and work, with a bright display and all-day battery life.',
      images: ['assets/laptop.png', 'assets/laptops_group.png'],
      colors: [{ name: 'Silver', hex: '#c0c0c0' }, { name: 'Space Grey', hex: '#4b4f56' }]
    },
    'oppo-k13': {
      title: 'OPPO K13',
      category: 'Mobiles',
      price: 26990,
      rating: 4,
      reviews: 890,
      stock: 0, // 0 = out of stock (shows how the disabled state looks)
      description: 'Flaunt it your way. Up to ₹2,500 instant off on select credit cards.',
      images: ['assets/oppo_k13.png'],
      colors: [{ name: 'Blue', hex: '#3a6ea5' }, { name: 'Black', hex: '#1c1c1c' }]
    }
  };

  const MAX_QTY = 10;
  const container = document.getElementById('productContainer');
  if (!container) return; // not on the product page
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const formatPrice = (n) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2
  }).format(n);

  function starsHTML(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) html += '<i class="fa-solid fa-star"></i>';
      else if (rating >= i - 0.5) html += '<i class="fa-solid fa-star-half-stroke"></i>';
      else html += '<i class="fa-regular fa-star"></i>';
    }
    return html;
  }

  /* ---------- Look up the product from ?id=... ---------- */
  const id = new URLSearchParams(window.location.search).get('id');
  const product = id && Object.prototype.hasOwnProperty.call(PRODUCTS, id) ? PRODUCTS[id] : null;

  if (!product) {
    renderNotFound(id);
    return;
  }

  document.title = product.title + ' - WOWMART';
  document.getElementById('breadcrumb-title').textContent = product.title;
  document.getElementById('breadcrumb-category').textContent = product.category;

  container.innerHTML = buildHTML(product);
  bindEvents(product);

  function renderNotFound(badId) {
    container.classList.add('is-empty');
    const box = document.createElement('div');
    box.className = 'not-found';

    const h = document.createElement('h1');
    h.textContent = 'Product not found';
    const p = document.createElement('p');
    p.textContent = badId
      ? 'We couldn\u2019t find a product with the id \u201c' + badId + '\u201d.'
      : 'No product id was given in the URL (e.g. product.html?id=laptop-01).';
    const a = document.createElement('a');
    a.href = 'index.html';
    a.className = 'buy-now-btn';
    a.textContent = 'Back to home';

    box.append(h, p, a);
    container.replaceChildren(box);
    document.getElementById('breadcrumb-title').textContent = 'Not found';
  }

  function buildHTML(p) {
    const inStock = p.stock > 0;

    const thumbs = p.images.map((src, i) =>
      `<img class="thumb-img${i === 0 ? ' active' : ''}" src="${esc(src)}" alt="${esc(p.title)} - view ${i + 1}" tabindex="0" data-src="${esc(src)}">`
    ).join('');

    const colors = p.colors ? `
      <div class="option-group">
        <span class="option-label">Colours: <span id="colorName">${esc(p.colors[0].name)}</span></span>
        <div class="colors" id="colors">
          ${p.colors.map((c, i) => `
            <button type="button" class="color-circle${i === 0 ? ' active' : ''}" style="background:${esc(c.hex)}"
                    data-color="${esc(c.name)}" title="${esc(c.name)}" aria-label="${esc(c.name)}" aria-pressed="${i === 0}"></button>`).join('')}
        </div>
      </div>` : '';

    const sizes = p.sizes ? `
      <div class="option-group">
        <span class="option-label">Size:</span>
        <div class="sizes" id="sizes">
          ${p.sizes.map((s) => `<button type="button" class="size-btn" data-size="${esc(s)}" aria-pressed="false">${esc(s)}</button>`).join('')}
        </div>
      </div>` : '';

    return `
      <section class="product-gallery" aria-label="Product images">
        <div class="thumbnails" id="thumbnails">${thumbs}</div>
        <div class="main-img-box"><img id="mainImage" src="${esc(p.images[0])}" alt="${esc(p.title)}"></div>
      </section>

      <section class="product-info-right">
        <h1>${esc(p.title)}</h1>
        <div class="rating-stock">
          <span class="stars" aria-label="Rated ${p.rating} out of 5">${starsHTML(p.rating)}</span>
          <span class="reviews">(${p.reviews} reviews)</span>
          <span class="stock ${inStock ? '' : 'out'}">${inStock ? 'In Stock' : 'Out of Stock'}</span>
        </div>
        <div class="price">${formatPrice(p.price)}</div>
        <p class="description">${esc(p.description)}</p>

        ${colors}
        ${sizes}

        <div class="purchase-box">
          <div class="qty-selector">
            <button type="button" class="qty-btn" id="qtyMinus" aria-label="Decrease quantity">&minus;</button>
            <input class="qty-input" id="qtyInput" type="text" inputmode="numeric" value="1" aria-label="Quantity">
            <button type="button" class="qty-btn" id="qtyPlus" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="buy-now-btn" id="buyNowBtn" ${inStock ? '' : 'disabled'}>Buy Now</button>
          <button type="button" class="add-cart-btn" id="addCartBtn" ${inStock ? '' : 'disabled'}>Add to Cart</button>
        </div>
        <p class="purchase-msg" id="purchaseMsg" role="status"></p>

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
  function bindEvents(p) {
    const $ = (sel) => container.querySelector(sel);
    const maxQty = Math.max(1, Math.min(p.stock, MAX_QTY));
    const state = { color: p.colors ? p.colors[0].name : null, size: null, qty: 1 };

    /* ----- Gallery: click (or Enter/Space) a thumbnail -> update main image ----- */
    const mainImage = $('#mainImage');
    const thumbBox = $('#thumbnails');

    function selectThumb(thumb) {
      if (!thumb) return;
      mainImage.src = thumb.dataset.src;
      thumbBox.querySelectorAll('.thumb-img').forEach((t) => t.classList.toggle('active', t === thumb));
    }
    thumbBox.addEventListener('click', (e) => selectThumb(e.target.closest('.thumb-img')));
    thumbBox.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectThumb(e.target.closest('.thumb-img'));
      }
    });

    function bindOption(groupId, btnClass, dataKey, onPick) {
      const group = $(groupId);
      if (!group) return;
      group.addEventListener('click', (e) => {
        const btn = e.target.closest('.' + btnClass);
        if (!btn) return;
        group.querySelectorAll('.' + btnClass).forEach((b) => {
          b.classList.toggle('active', b === btn);
          b.setAttribute('aria-pressed', String(b === btn));
        });
        onPick(btn.dataset[dataKey]);
        showMessage('');
      });
    }
    bindOption('#colors', 'color-circle', 'color', (name) => {
      state.color = name;
      $('#colorName').textContent = name;
    });
    bindOption('#sizes', 'size-btn', 'size', (size) => { state.size = size; });

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
    qtyInput.addEventListener('change', () => setQty(parseInt(qtyInput.value, 10)));
    setQty(1);

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
      return { id, title: p.title, price: p.price, qty: state.qty, size: state.size, color: state.color };
    }

    $('#addCartBtn').addEventListener('click', () => {
      const item = buildCartItem();
      if (!item) return;
      window.WOWMART.Cart.add(item);
      showMessage('Added to cart \u2713', 'success');
    });

    $('#buyNowBtn').addEventListener('click', () => {
      const item = buildCartItem();
      if (!item) return;

      if (!window.WOWMART.Session.get()) {
        window.location.href = 'account.html?redirect=' + encodeURIComponent('product.html' + window.location.search);
        return;
      }

      window.WOWMART.Cart.add(item);
      showMessage('Added to cart. Checkout page is not built yet.', 'success');
    });
  }
})();
