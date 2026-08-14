let currentCategory = '';
let productsCache = [];

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

function productCardHtml(p) {
  const hasDiscount = p.old_price && parseFloat(p.old_price) > parseFloat(p.price);
  const media = p.image_url
    ? `<img src="${p.image_url}" alt="${p.name} — купити в MuratTeхніка" loading="lazy" width="400" height="400">`
    : `<span class="placeholder-mark">🎧</span>`;
  return `
    <div class="card">
      <a href="product.html?slug=${p.slug}" style="display:contents;">
        <div class="card-media">
          ${media}
          ${hasDiscount ? `<span class="badge-sale">Знижка</span>` : ''}
          ${!p.in_stock ? `<div class="badge-out">Немає в наявності</div>` : ''}
        </div>
        <div class="card-body">
          <span class="card-cat">${p.category_name || ''}</span>
          <span class="card-title">${p.name}</span>
          <span class="card-desc">${p.short_description || ''}</span>
          ${p.reviews_count > 0 ? `
            <div class="card-rating">
              <span class="stars">${starsHtml(p.rating_avg)}</span>
              <span>(${p.reviews_count})</span>
            </div>` : ''}
        </div>
      </a>
      <div class="card-body" style="padding-top:0;">
        <div class="card-footer">
          <div class="price-row">
            <span class="price">${parseFloat(p.price).toFixed(0)} ₴</span>
            ${hasDiscount ? `<span class="price-old">${parseFloat(p.old_price).toFixed(0)} ₴</span>` : ''}
          </div>
          <button class="add-btn" data-id="${p.id}" ${!p.in_stock ? 'disabled' : ''} title="Додати в кошик" aria-label="Додати ${p.name} в кошик">+</button>
        </div>
      </div>
    </div>
  `;
}

async function loadCategories() {
  const categories = await api.getCategories();
  const nav = document.getElementById('categoryNav');
  categories.forEach((c) => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.dataset.slug = c.slug;
    btn.textContent = `${c.icon || ''} ${c.name}`.trim();
    nav.appendChild(btn);
  });

  nav.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    nav.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    currentCategory = chip.dataset.slug;
    document.getElementById('catalogTitle').textContent = chip.textContent.trim() === 'Усі товари' ? 'Усі товари' : chip.textContent.trim();
    loadProducts();
  });
}

async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = `<div class="empty-state">Завантаження...</div>`;
  const params = currentCategory ? { category: currentCategory } : {};
  const products = await api.getProducts(params);
  productsCache = products;

  document.getElementById('catalogCount').textContent = products.length ? `${products.length} товар(ів)` : '';

  if (!products.length) {
    grid.innerHTML = `<div class="empty-state">Товарів у цій категорії поки немає 🙁</div>`;
    return;
  }
  grid.innerHTML = products.map(productCardHtml).join('');
}

function renderCart() {
  const items = cart.get();
  const container = document.getElementById('cartItems');
  if (!items.length) {
    container.innerHTML = `<div class="empty-state">Кошик порожній 🛒<br>Додайте товари з каталогу</div>`;
  } else {
    container.innerHTML = items.map((i) => `
      <div class="cart-item">
        <div class="cart-item-media">${i.image_url ? `<img src="${i.image_url}" alt="">` : '🎧'}</div>
        <div class="cart-item-info">
          <div class="name">${i.name}</div>
          <div class="price">${i.price.toFixed(0)} ₴ × ${i.qty} = ${(i.price * i.qty).toFixed(0)} ₴</div>
          <div class="qty-row">
            <button class="qty-btn" data-action="dec" data-id="${i.id}">−</button>
            <span class="qty-val">${i.qty}</span>
            <button class="qty-btn" data-action="inc" data-id="${i.id}">+</button>
            <span class="remove-link" data-action="remove" data-id="${i.id}">Видалити</span>
          </div>
        </div>
      </div>
    `).join('');
  }
  document.getElementById('cartTotal').textContent = `${cart.total().toFixed(0)} ₴`;
  document.getElementById('checkoutBtn').disabled = items.length === 0;
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

function initCartEvents() {
  document.getElementById('openCartBtn').addEventListener('click', openCart);
  document.getElementById('closeCartBtn').addEventListener('click', closeCart);
  document.getElementById('overlay').addEventListener('click', closeCart);

  document.getElementById('cartItems').addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const id = parseInt(el.dataset.id);
    const items = cart.get();
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (el.dataset.action === 'inc') cart.setQty(id, item.qty + 1);
    if (el.dataset.action === 'dec') cart.setQty(id, item.qty - 1);
    if (el.dataset.action === 'remove') cart.remove(id);
    renderCart();
  });

  document.getElementById('productsGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.add-btn');
    if (!btn) return;
    e.preventDefault();
    const id = parseInt(btn.dataset.id);
    const product = productsCache.find((p) => p.id === id);
    if (!product) return;
    cart.add(product, 1);
    showToast(`${product.name} додано в кошик`);
  });
}

let selectedNpCity = null;
let selectedNpWarehouse = null;

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function toggleDeliveryFields() {
  const method = document.querySelector('input[name="delivery"]:checked').value;
  document.getElementById('novaposhtaFields').style.display = method === 'novaposhta' ? 'block' : 'none';
  document.getElementById('ukrposhtaFields').style.display = method === 'ukrposhta' ? 'block' : 'none';
}

function initNpAutocomplete() {
  const cityInput = document.getElementById('np_city');
  const cityList = document.getElementById('npCityList');
  const cityRefInput = document.getElementById('np_city_ref');

  const warehouseInput = document.getElementById('np_warehouse');
  const warehouseList = document.getElementById('npWarehouseList');
  const warehouseRefInput = document.getElementById('np_warehouse_ref');

  const searchCities = debounce(async (query) => {
    if (query.length < 2) { cityList.classList.remove('open'); return; }
    const results = await api.searchNpCities(query);
    if (results.error) {
      cityList.innerHTML = `<div class="autocomplete-empty">${results.error}</div>`;
      cityList.classList.add('open');
      return;
    }
    if (!results.length) {
      cityList.innerHTML = `<div class="autocomplete-empty">Місто не знайдено</div>`;
    } else {
      cityList.innerHTML = results.map((c) => `
        <div class="autocomplete-item" data-ref="${c.ref}" data-name="${c.name}">
          ${c.name}${c.area ? `<span class="sub">${c.area} область</span>` : ''}
        </div>
      `).join('');
    }
    cityList.classList.add('open');
  }, 350);

  cityInput.addEventListener('input', () => {
    selectedNpCity = null;
    cityRefInput.value = '';
    warehouseInput.value = '';
    warehouseInput.disabled = true;
    warehouseInput.placeholder = 'Спочатку оберіть місто';
    searchCities(cityInput.value.trim());
  });

  cityList.addEventListener('click', (e) => {
    const item = e.target.closest('.autocomplete-item[data-ref]');
    if (!item) return;
    selectedNpCity = { ref: item.dataset.ref, name: item.dataset.name };
    cityInput.value = item.dataset.name;
    cityRefInput.value = item.dataset.ref;
    cityList.classList.remove('open');
    warehouseInput.disabled = false;
    warehouseInput.placeholder = 'Почніть вводити номер або адресу відділення';
    warehouseInput.focus();
    loadWarehouses('');
  });

  async function loadWarehouses(query) {
    if (!selectedNpCity) return;
    const results = await api.searchNpWarehouses(selectedNpCity.ref, query);
    if (results.error) {
      warehouseList.innerHTML = `<div class="autocomplete-empty">${results.error}</div>`;
      warehouseList.classList.add('open');
      return;
    }
    if (!results.length) {
      warehouseList.innerHTML = `<div class="autocomplete-empty">Відділення не знайдено</div>`;
    } else {
      warehouseList.innerHTML = results.slice(0, 50).map((w) => `
        <div class="autocomplete-item" data-ref="${w.ref}" data-name="${w.name.replace(/"/g, '&quot;')}">
          ${w.name}
        </div>
      `).join('');
    }
    warehouseList.classList.add('open');
  }

  const searchWarehouses = debounce((query) => loadWarehouses(query), 350);

  warehouseInput.addEventListener('input', () => {
    selectedNpWarehouse = null;
    warehouseRefInput.value = '';
    searchWarehouses(warehouseInput.value.trim());
  });
  warehouseInput.addEventListener('focus', () => {
    if (selectedNpCity && !warehouseList.children.length) loadWarehouses('');
  });

  warehouseList.addEventListener('click', (e) => {
    const item = e.target.closest('.autocomplete-item[data-ref]');
    if (!item) return;
    selectedNpWarehouse = { ref: item.dataset.ref, name: item.dataset.name };
    warehouseInput.value = item.dataset.name;
    warehouseRefInput.value = item.dataset.ref;
    warehouseList.classList.remove('open');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-wrap')) {
      cityList.classList.remove('open');
      warehouseList.classList.remove('open');
    }
  });

  document.querySelectorAll('input[name="delivery"]').forEach((r) => r.addEventListener('change', toggleDeliveryFields));
}

function initCheckout() {
  const overlay = document.getElementById('checkoutModalOverlay');
  const formWrap = document.getElementById('checkoutFormWrap');
  const successWrap = document.getElementById('checkoutSuccessWrap');

  document.getElementById('checkoutBtn').addEventListener('click', () => {
    if (!cart.get().length) return;
    formWrap.style.display = 'block';
    successWrap.style.display = 'none';
    overlay.classList.add('open');
  });
  document.getElementById('cancelCheckoutBtn').addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });

  document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const deliveryMethod = document.querySelector('input[name="delivery"]:checked').value;

    if (deliveryMethod === 'novaposhta' && (!selectedNpCity || !selectedNpWarehouse)) {
      showToast('Оберіть місто та відділення Нової пошти зі списку підказок');
      return;
    }
    if (deliveryMethod === 'ukrposhta') {
      const idx = document.getElementById('up_index').value.trim();
      const addr = document.getElementById('up_address').value.trim();
      if (!idx || !addr) {
        showToast('Вкажіть поштовий індекс і точну адресу для Укрпошти');
        return;
      }
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Оформлюємо...';

    const payload = {
      customer_name: document.getElementById('cf_name').value.trim(),
      phone: document.getElementById('cf_phone').value.trim(),
      city: document.getElementById('cf_city').value.trim(),
      delivery_method: deliveryMethod,
      payment_method: document.querySelector('input[name="payment"]:checked').value,
      comment: document.getElementById('cf_comment').value.trim(),
      items: cart.get().map((i) => ({ product_id: i.id, quantity: i.qty })),
    };

    if (deliveryMethod === 'novaposhta') {
      payload.np_city_name = selectedNpCity.name;
      payload.np_city_ref = selectedNpCity.ref;
      payload.np_warehouse_name = selectedNpWarehouse.name;
      payload.np_warehouse_ref = selectedNpWarehouse.ref;
    } else {
      payload.ukrposhta_index = document.getElementById('up_index').value.trim();
      payload.ukrposhta_address = document.getElementById('up_address').value.trim();
    }

    try {
      const result = await api.createOrder(payload);
      if (result.error) {
        showToast(result.error);
      } else {
        cart.clear();
        renderCart();
        formWrap.style.display = 'none';
        successWrap.style.display = 'block';
        e.target.reset();
        selectedNpCity = null;
        selectedNpWarehouse = null;
        document.getElementById('np_city_ref').value = '';
        document.getElementById('np_warehouse_ref').value = '';
        document.getElementById('np_warehouse').disabled = true;
        document.getElementById('np_warehouse').placeholder = 'Спочатку оберіть місто';
        toggleDeliveryFields();
      }
    } catch (err) {
      showToast('Помилка звʼязку з сервером. Спробуйте пізніше.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Підтвердити замовлення';
    }
  });

  document.getElementById('closeSuccessBtn').addEventListener('click', () => {
    overlay.classList.remove('open');
    closeCart();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initCartEvents();
  initCheckout();
  initNpAutocomplete();
  toggleDeliveryFields();
  await loadCategories();
  await loadProducts();
});
