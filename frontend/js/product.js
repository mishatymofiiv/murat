let currentProduct = null;

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
}

function starsHtml(rating) {
  const rounded = Math.round(rating);
  return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
}

function setSeoTags(p, avgRating) {
  const title = `${p.name} — купити в MuratTeхніка`;
  const description = (p.short_description || p.description || `${p.name} — навушники AirPods (копія 1:1). Оплата онлайн, доставка по Україні.`).slice(0, 160);
  document.title = title;
  document.getElementById('metaDescription').setAttribute('content', description);
  document.getElementById('ogTitle').setAttribute('content', title);
  document.getElementById('ogDescription').setAttribute('content', description);
  document.getElementById('canonicalLink').setAttribute('href', `https://murattehnika.com.ua/product.html?slug=${p.slug}`);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description || p.short_description || '',
    image: p.image_url ? [p.image_url] : [],
    sku: String(p.id),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'UAH',
      price: parseFloat(p.price).toFixed(2),
      availability: p.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `https://murattehnika.com.ua/product.html?slug=${p.slug}`,
    },
  };
  if (p.reviews.length) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avgRating.toFixed(1),
      reviewCount: p.reviews.length,
    };
  }
  document.getElementById('productSchema').textContent = JSON.stringify(schema);
}

function renderProduct(p) {
  document.getElementById('crumbCat').innerHTML = p.category_name ? `/ <a href="/?category=${p.category_slug}">${p.category_name}</a>` : '';
  document.getElementById('crumbName').textContent = p.name;

  const allImages = [p.image_url, ...p.images.map((i) => i.image_url)].filter(Boolean);
  const avgRating = p.reviews.length
    ? (p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length)
    : 0;

  setSeoTags(p, avgRating);

  const hasDiscount = p.old_price && parseFloat(p.old_price) > parseFloat(p.price);

  const html = `
    <div class="product-layout">
      <div>
        <div class="product-gallery-main" id="mainImage">
          ${allImages.length ? `<img src="${allImages[0]}" alt="${p.name} — фото 1" loading="eager" width="600" height="600">` : '<span class="placeholder-mark">🎧</span>'}
        </div>
        ${allImages.length > 1 ? `
          <div class="product-thumbs">
            ${allImages.map((img, idx) => `<div class="thumb ${idx === 0 ? 'active' : ''}" data-img="${img}"><img src="${img}" alt="${p.name} — фото ${idx + 1}" loading="lazy"></div>`).join('')}
          </div>` : ''}
      </div>
      <div class="product-info">
        <span class="cat-tag">${p.category_name || ''}</span>
        <h1>${p.name}</h1>
        ${p.reviews.length ? `
          <div class="rating-line">
            <span style="color:var(--accent)">${starsHtml(avgRating)}</span>
            <span>${avgRating.toFixed(1)} · ${p.reviews.length} відгук(ів)</span>
          </div>` : `<div class="rating-line">Ще немає відгуків — станьте першим</div>`}

        <div class="price-block">
          <span class="price">${parseFloat(p.price).toFixed(0)} ₴</span>
          ${hasDiscount ? `<span class="price-old">${parseFloat(p.old_price).toFixed(0)} ₴</span>` : ''}
        </div>

        <div class="stock-line">
          <span class="dot ${p.in_stock ? '' : 'off'}"></span>
          ${p.in_stock ? 'Є в наявності' : 'Немає в наявності'}
        </div>

        <p class="desc">${p.description || p.short_description || ''}</p>

        <div class="buy-row">
          <button class="buy-btn" id="addToCartBtn" ${!p.in_stock ? 'disabled' : ''}>
            ${p.in_stock ? '🛒 Додати в кошик' : 'Немає в наявності'}
          </button>
        </div>

        <div class="mini-info">
          <div>🚚 Доставка: Укрпошта, Нова пошта</div>
          <div>💳 Оплата: передоплата або повна оплата онлайн</div>
          <div>📞 Питання: <a href="tel:+380961069753" style="color:var(--accent); font-weight:600;">096 106 97 53</a></div>
        </div>
      </div>
    </div>

    <section class="reviews-section">
      <div class="reviews-head">
        <h2>Відгуки покупців (${p.reviews.length})</h2>
        <button class="add-review-btn" id="openReviewBtn">✍️ Залишити відгук</button>
      </div>
      <div id="reviewsList">
        ${p.reviews.length ? p.reviews.map((r) => `
          <div class="review-card">
            <div class="review-top">
              <span class="review-author">${r.author_name}</span>
              <span class="review-date">${formatDate(r.created_at)}</span>
            </div>
            <div class="review-stars">${starsHtml(r.rating)}</div>
            ${r.text ? `<div class="review-text">${r.text}</div>` : ''}
          </div>
        `).join('') : `<div class="empty-state">Поки немає відгуків. Будьте першим!</div>`}
      </div>
    </section>
  `;

  document.getElementById('productContent').innerHTML = html;

  // Галерея
  document.querySelectorAll('.thumb').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      document.querySelectorAll('.thumb').forEach((t) => t.classList.remove('active'));
      thumb.classList.add('active');
      document.getElementById('mainImage').innerHTML = `<img src="${thumb.dataset.img}" alt="${p.name}">`;
    });
  });

  // Додати в кошик
  const addBtn = document.getElementById('addToCartBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      cart.add(p, 1);
      showToast(`${p.name} додано в кошик`);
    });
  }

  document.getElementById('openReviewBtn').addEventListener('click', openReviewModal);
}

function renderCart() {
  const items = cart.get();
  const container = document.getElementById('cartItems');
  if (!items.length) {
    container.innerHTML = `<div class="empty-state">Кошик порожній 🛒</div>`;
  } else {
    container.innerHTML = items.map((i) => `
      <div class="cart-item">
        <div class="cart-item-media">${i.image_url ? `<img src="${i.image_url}" alt="">` : '🎧'}</div>
        <div class="cart-item-info">
          <div class="name">${i.name}</div>
          <div class="price">${i.price.toFixed(0)} ₴ × ${i.qty}</div>
        </div>
      </div>
    `).join('');
  }
  document.getElementById('cartTotal').textContent = `${cart.total().toFixed(0)} ₴`;
}

function openCart() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('overlay').classList.add('open');
  renderCart();
}
function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
}

let selectedRating = 0;
function openReviewModal() {
  selectedRating = 0;
  document.querySelectorAll('#starPicker span').forEach((s) => s.classList.remove('active'));
  document.getElementById('reviewForm').reset();
  document.getElementById('reviewModalOverlay').classList.add('open');
}
function closeReviewModal() {
  document.getElementById('reviewModalOverlay').classList.remove('open');
}

function initReviewForm() {
  document.getElementById('starPicker').addEventListener('click', (e) => {
    const star = e.target.closest('span');
    if (!star) return;
    selectedRating = parseInt(star.dataset.v);
    document.querySelectorAll('#starPicker span').forEach((s) => {
      s.classList.toggle('active', parseInt(s.dataset.v) <= selectedRating);
    });
  });

  document.getElementById('cancelReviewBtn').addEventListener('click', closeReviewModal);
  document.getElementById('reviewModalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'reviewModalOverlay') closeReviewModal();
  });

  document.getElementById('reviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedRating) { showToast('Оберіть оцінку від 1 до 5 зірок'); return; }
    const payload = {
      product_id: currentProduct.id,
      author_name: document.getElementById('rv_name').value.trim(),
      rating: selectedRating,
      text: document.getElementById('rv_text').value.trim(),
    };
    const result = await api.addReview(payload);
    if (result.error) {
      showToast(result.error);
      return;
    }
    showToast('Дякуємо за відгук!');
    closeReviewModal();
    const fresh = await api.getProduct(currentProduct.slug);
    currentProduct = fresh;
    renderProduct(fresh);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('openCartBtn').addEventListener('click', openCart);
  document.getElementById('closeCartBtn').addEventListener('click', closeCart);
  document.getElementById('overlay').addEventListener('click', closeCart);
  initReviewForm();

  const params = new URLSearchParams(location.search);
  const slug = params.get('slug');
  if (!slug) {
    document.getElementById('productContent').innerHTML = `<div class="empty-state">Товар не знайдено. <a href="/" style="color:var(--accent)">Повернутись у каталог</a></div>`;
    return;
  }
  const product = await api.getProduct(slug);
  if (!product) {
    document.getElementById('productContent').innerHTML = `<div class="empty-state">Товар не знайдено. <a href="/" style="color:var(--accent)">Повернутись у каталог</a></div>`;
    return;
  }
  currentProduct = product;
  renderProduct(product);
});
