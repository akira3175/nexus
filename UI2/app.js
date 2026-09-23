/* ==========================================================================
   NEXUS HAUTE HORLOGERIE - CORE APPLICATION LOGIC (app.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initLiveSearch();
  initCartDrawer();
  updateHeaderBadges();

  // Khởi tạo tính năng tùy theo từng trang
  if (document.getElementById('product-grid-container')) {
    initCatalogPage();
  }

  if (document.getElementById('product-detail-view')) {
    initProductDetailPage();
  }

  if (document.getElementById('cart-table-body')) {
    initCartPage();
  }
});

/* --------------------------------------------------------------------------
   1. Toast Notifications
   -------------------------------------------------------------------------- */
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  const iconSvg = type === 'success'
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dbaf56" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  toast.innerHTML = `${iconSvg} <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/* --------------------------------------------------------------------------
   2. Cart & Wishlist State Helpers
   -------------------------------------------------------------------------- */
function updateHeaderBadges() {
  const cart = getStoredCart();
  const totalCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const cartBadge = document.getElementById('header-cart-count');
  if (cartBadge) {
    cartBadge.textContent = totalCount;
    cartBadge.style.display = totalCount > 0 ? 'flex' : 'none';
  }

  const wishlist = getStoredWishlist();
  const wishBadge = document.getElementById('header-wishlist-count');
  if (wishBadge) {
    wishBadge.textContent = wishlist.length;
    wishBadge.style.display = wishlist.length > 0 ? 'flex' : 'none';
  }
}

function addToCart(productId, quantity = 1) {
  const cart = getStoredCart();
  cart[productId] = (cart[productId] || 0) + quantity;
  if (cart[productId] > 99) cart[productId] = 99;
  saveStoredCart(cart);
  updateHeaderBadges();


  const prod = products.find(p => p.id === productId);
  showToast(`Đã thêm <strong>${prod ? prod.name : 'sản phẩm'}</strong> vào giỏ hàng!`);
}

function toggleWishlist(productId, buttonElem) {
  let wishlist = getStoredWishlist();
  const index = wishlist.indexOf(productId);
  const prod = products.find(p => p.id === productId);

  if (index > -1) {
    wishlist.splice(index, 1);
    showToast(`Đã xóa khỏi danh sách yêu thích!`, 'info');
    if (buttonElem) buttonElem.classList.remove('active');
  } else {
    wishlist.push(productId);
    showToast(`Đã lưu <strong>${prod ? prod.name : ''}</strong> vào yêu thích!`);
    if (buttonElem) buttonElem.classList.add('active');
  }
  saveStoredWishlist(wishlist);
  updateHeaderBadges();
  window.dispatchEvent(new CustomEvent('wishlistchange'));
}

/* --------------------------------------------------------------------------
   3. Cart Drawer Functionality
   -------------------------------------------------------------------------- */
function initCartDrawer() {
  const overlay = document.getElementById('cart-drawer-overlay');
  const openButtons = document.querySelectorAll('.open-cart-drawer-btn');
  const closeButtons = document.querySelectorAll('.close-cart-drawer-btn');

  if (!overlay) return;

  openButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      renderCartDrawer();
      openCartDrawer();
    });
  });

  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => closeCartDrawer());
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCartDrawer();
  });
}

function openCartDrawer() {
  const overlay = document.getElementById('cart-drawer-overlay');
  if (overlay) overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
  const overlay = document.getElementById('cart-drawer-overlay');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

function renderCartDrawer() {
  const container = document.getElementById('drawer-items-list');
  const subtotalElem = document.getElementById('drawer-subtotal');
  if (!container) return;

  const cart = getStoredCart();
  const entries = Object.entries(cart);

  if (entries.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 10px; color: var(--text-muted);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; opacity: 0.4;">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <p style="font-size: 14px;">Giỏ hàng của quý khách hiện đang trống.</p>
        <a href="collection.html" onclick="closeCartDrawer()" class="btn btn-outline btn-sm" style="margin-top: 16px;">Khám phá bộ sưu tập</a>
      </div>
    `;
    if (subtotalElem) subtotalElem.textContent = '0 ₫';
    return;
  }

  let html = '';
  let subtotal = 0;

  entries.forEach(([id, qty]) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;

    const itemTotal = prod.price * qty;
    subtotal += itemTotal;

    html += `
      <div class="drawer-item" data-id="${prod.id}">
        <img src="${prod.image}" alt="${prod.name}">
        <div class="drawer-item-info">
          <a href="product.html?id=${prod.id}" class="drawer-item-title">${prod.name}</a>
          <div class="drawer-item-price">${formatVND(prod.price)}</div>
          <div class="drawer-stepper">
            <button onclick="changeDrawerQty('${prod.id}', -1)" aria-label="Giảm số lượng">−</button>
            <span>${qty}</span>
            <button onclick="changeDrawerQty('${prod.id}', 1)" aria-label="Tăng số lượng">+</button>
          </div>
        </div>
        <button class="drawer-remove-btn" onclick="removeFromCart('${prod.id}')" title="Xóa sản phẩm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;
  });

  container.innerHTML = html;
  if (subtotalElem) subtotalElem.textContent = formatVND(subtotal);
}

window.changeDrawerQty = function(id, delta) {
  const cart = getStoredCart();
  if (!cart[id]) return;
  cart[id] += delta;
  if (cart[id] <= 0) {
    delete cart[id];
  } else if (cart[id] > 99) {
    cart[id] = 99;
  }
  saveStoredCart(cart);
  updateHeaderBadges();
  renderCartDrawer();
  if (document.getElementById('cart-table-body')) {
    renderCartPage();
  }
};

window.removeFromCart = function(id) {
  const cart = getStoredCart();
  delete cart[id];
  saveStoredCart(cart);
  updateHeaderBadges();
  renderCartDrawer();
  if (document.getElementById('cart-table-body')) {
    renderCartPage();
  }
  showToast('Đã xóa sản phẩm khỏi giỏ hàng.', 'info');
};

/* --------------------------------------------------------------------------
   4. Live Search in Header
   -------------------------------------------------------------------------- */
function initLiveSearch() {
  const searchInput = document.getElementById('site-search-input');
  const dropdown = document.getElementById('search-dropdown');

  if (!searchInput || !dropdown) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (query.length < 2) {
      dropdown.classList.remove('active');
      return;
    }

    const matches = products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.categoryName.toLowerCase().includes(query) ||
      p.shortDescription.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
      dropdown.innerHTML = `<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">Không tìm thấy sản phẩm phù hợp</div>`;
    } else {
      dropdown.innerHTML = matches.slice(0, 5).map(p => `
        <a href="product.html?id=${p.id}" class="search-result-item">
          <img src="${p.image}" alt="${p.name}">
          <div>
            <div style="font-weight: 600; color: #fff; font-size: 13px;">${p.name}</div>
            <div style="color: var(--gold-400); font-size: 12px; font-weight: 600;">${formatVND(p.price)}</div>
          </div>
        </a>
      `).join('');
    }
    dropdown.classList.add('active');
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });
}

/* --------------------------------------------------------------------------
   5. Catalog & Filter Functionality (index.html)
   -------------------------------------------------------------------------- */
function initCatalogPage() {
  const container = document.getElementById('product-grid-container');
  const filterPills = document.querySelectorAll('.pill-btn');
  const sortSelect = document.getElementById('catalog-sort');
  const searchInput = document.getElementById('collection-search-input');

  let activeCategory = 'all';
  let activeSort = 'featured';
  let activeQuery = '';
  let wishlistOnly = window.location.hash === '#wishlist';

  function renderGrid() {
    const wishlist = getStoredWishlist();
    let filtered = products.filter(p => {
      if (wishlistOnly && !wishlist.includes(p.id)) return false;
      if (activeQuery && !`${p.name} ${p.categoryName} ${p.shortDescription}`.toLowerCase().includes(activeQuery)) return false;
      if (activeCategory === 'all') return true;
      return p.category === activeCategory;
    });

    if (activeSort === 'price-asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (activeSort === 'price-desc') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (activeSort === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    }

    if (filtered.length === 0) {
      const emptyMessage = wishlistOnly
        ? 'Bạn chưa lưu sản phẩm yêu thích nào.'
        : activeQuery
          ? 'Không tìm thấy sản phẩm phù hợp.'
          : 'Không có sản phẩm trong danh mục này.';
      container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">${emptyMessage}</p>`;
      return;
    }

    container.innerHTML = filtered.map(p => {
      return `
        <article class="product-card">
          <div class="card-media">
            <a class="card-image-link" href="product.html?id=${p.id}" aria-label="Xem ${p.name}"><img src="${p.image}" alt="Ảnh tham khảo ${p.name}" loading="lazy" width="1024" height="1024"></a>
          </div>
          <div class="card-body">
            <div class="card-heading-row">
              <h3 class="card-title"><a href="product.html?id=${p.id}">${p.name}</a></h3>
              <span class="current-price">${formatVND(p.price)}</span>
            </div>
            <span class="card-category">${p.categoryName}</span>
          </div>
        </article>
      `;
    }).join('');
  }

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      wishlistOnly = false;
      if (window.location.hash === '#wishlist') history.replaceState(null, '', '#catalog');
      activeCategory = pill.dataset.category;
      renderGrid();
    });
  });

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      activeSort = e.target.value;
      renderGrid();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      activeQuery = event.target.value.trim().toLowerCase();
      renderGrid();
    });
  }

  window.addEventListener('hashchange', () => {
    wishlistOnly = window.location.hash === '#wishlist';
    renderGrid();
    if (wishlistOnly) document.getElementById('catalog')?.scrollIntoView();
  });
  window.addEventListener('wishlistchange', renderGrid);

  renderGrid();
  if (wishlistOnly) document.getElementById('catalog')?.scrollIntoView();
}

/* --------------------------------------------------------------------------
   6. Quick View Modal
   -------------------------------------------------------------------------- */
window.openQuickView = function(id) {
  const prod = products.find(p => p.id === id);
  if (!prod) return;

  const modal = document.getElementById('quickview-modal');
  const body = document.getElementById('quickview-modal-body');
  if (!modal || !body) return;

  body.innerHTML = `
    <div class="quickview-grid">
      <div class="quickview-media">
        <img src="${prod.image}" alt="${prod.name}">
      </div>
      <div class="quickview-content">
        <span class="card-category" style="margin-bottom: 4px;">${prod.categoryName}</span>
        <h2 class="card-title" style="font-size: 24px; margin-bottom: 8px;">${prod.name}</h2>
        <div class="card-rating" style="margin-bottom: 16px;">
          <span class="stars">★★★★★</span>
          <span>${prod.reviewsCount ? `${prod.rating} (${prod.reviewsCount} đánh giá)` : 'Chưa có đánh giá'}</span>
        </div>
        <div class="current-price" style="font-size: 26px; margin-bottom: 16px;">${formatVND(prod.price)}</div>
        <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 20px;">${prod.description}</p>
        
        <ul style="list-style: none; font-size: 13px; margin-bottom: 24px; display: flex; flex-direction: column; gap: 8px;">
          <li><strong style="color: var(--gold-400);">Chất liệu:</strong> ${prod.specs.movement}</li>
          <li><strong style="color: var(--gold-400);">Màu sắc:</strong> ${prod.specs.glass}</li>
          <li><strong style="color: var(--gold-400);">Kích thước:</strong> ${prod.specs.diameter} · ${prod.specs.thickness}</li>
        </ul>

        <div style="display: flex; gap: 12px; margin-top: auto;">
          <button class="btn btn-primary" style="flex-grow: 1;" onclick="addToCart('${prod.id}', 1); closeQuickView();">
            Thêm vào giỏ hàng
          </button>
          <a href="product.html?id=${prod.id}" class="btn btn-outline">
            Xem chi tiết
          </a>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

window.closeQuickView = function() {
  const modal = document.getElementById('quickview-modal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
};

/* --------------------------------------------------------------------------
   7. Product Detail Page (product.html)
   -------------------------------------------------------------------------- */
function initProductDetailPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id') || 'atelier';
  const prod = products.find(p => p.id === id) || products[0];

  document.title = `${prod.name} | NEXUS Menswear`;

  // Breadcrumbs & Title
  const breadcrumbName = document.getElementById('detail-breadcrumb-name');
  if (breadcrumbName) breadcrumbName.textContent = prod.name;

  const titleElem = document.getElementById('detail-product-name');
  if (titleElem) titleElem.textContent = prod.name;

  const catElem = document.getElementById('detail-product-category');
  if (catElem) catElem.textContent = prod.categoryName;

  const priceElem = document.getElementById('detail-product-price');
  if (priceElem) priceElem.textContent = formatVND(prod.price);

  const descElem = document.getElementById('detail-product-desc');
  if (descElem) descElem.textContent = prod.description;

  const imageElem = document.getElementById('detail-main-image');
  if (imageElem) {
    imageElem.src = prod.image;
    imageElem.alt = prod.name;
  }

  // Specs Table
  const specsTable = document.getElementById('detail-specs-table');
  if (specsTable) {
    specsTable.innerHTML = `
      <tr><td>Kích thước</td><td>${prod.specs.diameter}</td></tr>
      <tr><td>Phom dáng</td><td>${prod.specs.thickness}</td></tr>
      <tr><td>Chất liệu</td><td>${prod.specs.movement}</td></tr>
      <tr><td>Màu sắc</td><td>${prod.specs.glass}</td></tr>
      <tr><td>Bề mặt vải</td><td>${prod.specs.caseMaterial}</td></tr>
      <tr><td>Chi tiết</td><td>${prod.specs.strap}</td></tr>
      <tr><td>Chăm sóc</td><td>${prod.specs.waterResistance}</td></tr>
      <tr><td>Dịch vụ</td><td>${prod.specs.warranty}</td></tr>
    `;
  }

  // Quantity Stepper
  let currentQty = 1;
  const qtyDisplay = document.getElementById('detail-qty-display');
  const minusBtn = document.getElementById('detail-qty-minus');
  const plusBtn = document.getElementById('detail-qty-plus');

  if (minusBtn && plusBtn && qtyDisplay) {
    minusBtn.addEventListener('click', () => {
      if (currentQty > 1) {
        currentQty--;
        qtyDisplay.textContent = currentQty;
      }
    });
    plusBtn.addEventListener('click', () => {
      if (currentQty < 99) {
        currentQty++;
        qtyDisplay.textContent = currentQty;
      }
    });
  }

  // Add to Cart button
  const addBtn = document.getElementById('detail-add-to-cart');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      addToCart(prod.id, currentQty);
    });
  }

  // Buy Now button
  const buyBtn = document.getElementById('detail-buy-now');
  if (buyBtn) {
    buyBtn.addEventListener('click', () => {
      addToCart(prod.id, currentQty);
      window.location.href = 'checkout.html';
    });
  }

  // Tabs Switcher
  const tabs = document.querySelectorAll('.tab-btn');
  const panes = document.querySelectorAll('.tab-pane');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  // Related Products
  const relatedContainer = document.getElementById('related-products-grid');
  if (relatedContainer) {
    const related = products.filter(p => p.id !== prod.id).slice(0, 3);
    relatedContainer.innerHTML = related.map(p => `
      <article class="product-card">
        <div class="card-media">
          <img src="${p.image}" alt="${p.name}">
        </div>
        <div class="card-body">
          <h4 class="card-title" style="font-size: 16px;"><a href="product.html?id=${p.id}">${p.name}</a></h4>
          <div class="current-price" style="font-size: 16px; margin-top: 8px;">${formatVND(p.price)}</div>
        </div>
      </article>
    `).join('');
  }
}

/* --------------------------------------------------------------------------
   8. Cart Full Page (cart.html)
   -------------------------------------------------------------------------- */
function initCartPage() {
  renderCartPage();

}

function renderCartPage() {
  const tbody = document.getElementById('cart-table-body');
  const emptyView = document.getElementById('cart-empty-view');
  const contentView = document.getElementById('cart-content-view');
  const subtotalElem = document.getElementById('page-subtotal');
  const discountElem = document.getElementById('page-discount');
  const totalElem = document.getElementById('page-total');

  if (!tbody) return;

  const cart = getStoredCart();
  const entries = Object.entries(cart);

  if (entries.length === 0) {
    if (emptyView) emptyView.style.display = 'block';
    if (contentView) contentView.style.display = 'none';
    return;
  }

  if (emptyView) emptyView.style.display = 'none';
  if (contentView) contentView.style.display = 'grid';

  let subtotal = 0;
  tbody.innerHTML = entries.map(([id, qty]) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return '';

    const rowTotal = prod.price * qty;
    subtotal += rowTotal;

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 16px;">
            <img src="${prod.image}" alt="${prod.name}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 6px; background: #000; border: 1px solid var(--border-subtle);">
            <div>
              <a href="product.html?id=${prod.id}" style="font-weight: 600; color: #fff; font-size: 15px;">${prod.name}</a>
              <div style="font-size: 12px; color: var(--gold-400); margin-top: 4px;">${prod.specs.diameter} / ${prod.specs.glass}</div>
            </div>
          </div>
        </td>
        <td style="color: var(--text-secondary);">${formatVND(prod.price)}</td>
        <td>
          <div class="drawer-stepper" style="margin: 0;">
            <button onclick="changeDrawerQty('${prod.id}', -1)">−</button>
            <span style="font-size: 14px; font-weight: 600;">${qty}</span>
            <button onclick="changeDrawerQty('${prod.id}', 1)">+</button>
          </div>
        </td>
        <td style="font-weight: 700; color: var(--gold-400);">${formatVND(rowTotal)}</td>
        <td>
          <button class="drawer-remove-btn" onclick="removeFromCart('${prod.id}')" title="Xóa">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  const discountRate = 0;
  const discountAmount = subtotal * discountRate;
  const finalTotal = subtotal - discountAmount;

  if (subtotalElem) subtotalElem.textContent = formatVND(subtotal);
  if (discountElem) discountElem.textContent = `- ${formatVND(discountAmount)}`;
  if (totalElem) totalElem.textContent = formatVND(finalTotal);
}

/* --------------------------------------------------------------------------
   9. Mobile Menu Toggle
   -------------------------------------------------------------------------- */
function initNavigation() {
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const mobileNav = document.getElementById('mobile-nav-drawer');

  if (mobileToggle && mobileNav) {
    mobileToggle.addEventListener('click', () => {
      mobileNav.classList.toggle('active');
    });
  }
}
