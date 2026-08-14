const TOKEN_KEY = 'murattehnika_admin_token';
let categoriesCache = [];
let productsCache = [];

function getToken() { return sessionStorage.getItem(TOKEN_KEY); }

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2500);
}

async function adminFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (res.status === 401) {
    showToast('Токен недійсний. Увійдіть знову.');
    logout();
  }
  return data;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 5;

async function uploadFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    showToast('Дозволені лише формати JPG, PNG або WebP');
    return null;
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    showToast(`Файл завеликий. Максимум ${MAX_SIZE_MB} МБ`);
    return null;
  }
  const formData = new FormData();
  formData.append('image', file);

  const progressEl = document.getElementById('uploadProgress');
  if (progressEl) progressEl.textContent = 'Завантаження...';
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    const data = await res.json();
    if (progressEl) progressEl.textContent = '';
    if (data.error) {
      showToast(data.error);
      return null;
    }
    showToast('Фото завантажено ✓');
    return data.url;
  } catch (err) {
    if (progressEl) progressEl.textContent = '';
    showToast('Помилка завантаження фото');
    return null;
  }
}

async function handleMainImageFile(file) {
  const url = await uploadFile(file);
  if (!url) return;
  document.getElementById('p_image_url').value = url;
  document.getElementById('uploadPreviewWrap').innerHTML = `<div class="upload-preview"><img src="${url}" alt="Прев'ю фото"></div>`;
}

function initUploadBox() {
  const box = document.getElementById('uploadBox');
  const input = document.getElementById('p_image_file');

  // box — це <label for="p_image_file">, тому клік по ньому й так відкриває
  // системний діалог вибору файлу нативно; JS тут потрібен лише для drag&drop.
  ['dragenter', 'dragover'].forEach((ev) => box.addEventListener(ev, (e) => { e.preventDefault(); box.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach((ev) => box.addEventListener(ev, (e) => { e.preventDefault(); box.classList.remove('dragover'); }));
  box.addEventListener('drop', async (e) => {
    const file = e.dataTransfer.files[0];
    if (file) await handleMainImageFile(file);
  });
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) await handleMainImageFile(file);
  });
}

async function renderGallery(productId) {
  const wrap = document.getElementById('galleryWrap');
  const list = document.getElementById('galleryList');
  if (!productId) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';

  const productRef = productsCache.find((p) => p.id === parseInt(productId));
  const full = productRef ? await api.getProduct(productRef.slug) : null;
  const images = full?.images || [];

  if (!images.length) {
    list.innerHTML = `<span style="font-size:12px; color:var(--text-secondary);">Ще немає додаткових фото</span>`;
  } else {
    list.innerHTML = images.map((img) => `
      <div style="position:relative;">
        <div class="upload-preview" style="margin:0;"><img src="${img.image_url}" alt=""></div>
        <button type="button" data-action="delete-gallery-img" data-id="${img.id}" style="position:absolute; top:-6px; right:-6px; width:20px; height:20px; border-radius:50%; background:#0A0A0A; color:#fff; border:none; font-size:12px; cursor:pointer;">✕</button>
      </div>
    `).join('');
  }
}

function initGalleryUpload() {
  const input = document.getElementById('p_gallery_file');
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const id = document.getElementById('p_id').value;
    if (!id) return;
    const url = await uploadFile(file);
    if (!url) return;
    const result = await adminFetch(`/api/products/${id}/images`, {
      method: 'POST',
      body: JSON.stringify({ image_url: url }),
    });
    if (result.error) { showToast(result.error); return; }
    await renderGallery(id);
    input.value = '';
  });

  document.getElementById('galleryList').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="delete-gallery-img"]');
    if (!btn) return;
    const result = await adminFetch(`/api/products/images/${btn.dataset.id}`, { method: 'DELETE' });
    if (result.error) { showToast(result.error); return; }
    await renderGallery(document.getElementById('p_id').value);
  });
}

function logout() {
  sessionStorage.removeItem(TOKEN_KEY);
  document.getElementById('adminScreen').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'block';
}

async function login() {
  const token = document.getElementById('tokenInput').value.trim();
  if (!token) return;
  sessionStorage.setItem(TOKEN_KEY, token);

  // Перевіряємо токен простим запитом (POST-заглушка через categories GET не потребує токена,
  // тож перевіряємо створенням тестового запиту до products list, яке публічне —
  // натомість валідність перевіримо при першій адмін-дії).
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminScreen').style.display = 'block';
  await loadAll();
}

async function loadAll() {
  categoriesCache = await api.getCategories();
  productsCache = await api.getProducts();
  renderCategorySelect();
  renderTable();
}

function renderCategorySelect() {
  const select = document.getElementById('p_category_id');
  select.innerHTML = categoriesCache.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
}

function renderTable() {
  const tbody = document.getElementById('productsTableBody');
  if (!productsCache.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-secondary); padding:30px;">Товарів ще немає</td></tr>`;
    return;
  }
  tbody.innerHTML = productsCache.map((p) => `
    <tr>
      <td>${p.image_url ? `<img src="${p.image_url}" alt="">` : '🎧'}</td>
      <td>${p.name}</td>
      <td>${p.category_name || '—'}</td>
      <td>${parseFloat(p.price).toFixed(0)} ₴</td>
      <td>${p.in_stock ? '✅' : '❌'}</td>
      <td class="row-actions">
        <button data-action="edit" data-id="${p.id}">Редагувати</button>
        <button data-action="delete" data-id="${p.id}">Видалити</button>
      </td>
    </tr>
  `).join('');
}

let ordersCache = [];
let activeTab = 'products';
const DELIVERY_LABELS = { novaposhta: 'Нова пошта', ukrposhta: 'Укрпошта' };
const PAYMENT_LABELS = { online: 'Оплата онлайн', prepay_full: 'Передоплата' };

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.admin-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('productsTab').style.display = tab === 'products' ? 'block' : 'none';
  document.getElementById('ordersTab').style.display = tab === 'orders' ? 'block' : 'none';
  document.getElementById('newProductBtn').style.display = tab === 'products' ? 'inline-block' : 'none';
  document.getElementById('adminTitle').textContent = tab === 'products' ? 'Керування товарами' : 'Замовлення клієнтів';
  if (tab === 'orders') loadOrders();
}

async function loadOrders() {
  const data = await adminFetch('/api/orders');
  if (data.error) { showToast(data.error); return; }
  ordersCache = data;
  renderOrdersTable();
}

function deliveryInfoLine(order) {
  if (order.delivery_method === 'novaposhta') {
    return `${order.np_city_name || '—'}<br><span style="color:var(--text-secondary); font-size:12px;">${order.np_warehouse_name || '—'}</span>`;
  }
  return `Індекс: ${order.ukrposhta_index || '—'}<br><span style="color:var(--text-secondary); font-size:12px;">${order.ukrposhta_address || '—'}</span>`;
}

function renderOrdersTable() {
  const tbody = document.getElementById('ordersTableBody');
  if (!ordersCache.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-secondary); padding:30px;">Замовлень ще немає</td></tr>`;
    return;
  }
  tbody.innerHTML = ordersCache.map((o) => `
    <tr>
      <td><button type="button" data-action="toggle-details" data-id="${o.id}" style="border:none; background:none; cursor:pointer; font-size:14px;">▸</button></td>
      <td>#${o.id}</td>
      <td>${o.customer_name}</td>
      <td><a href="tel:${o.phone}">${o.phone}</a></td>
      <td>${DELIVERY_LABELS[o.delivery_method] || o.delivery_method}</td>
      <td>${PAYMENT_LABELS[o.payment_method] || o.payment_method}</td>
      <td>${parseFloat(o.total).toFixed(0)} ₴</td>
      <td>
        <span class="status-pill ${o.is_shipped ? 'shipped' : 'pending'}">${o.is_shipped ? '✓ Відправлено' : 'Не відправлено'}</span>
      </td>
      <td>
        <button type="button" class="ship-toggle-btn" data-action="toggle-shipped" data-id="${o.id}" data-current="${o.is_shipped}">
          ${o.is_shipped ? 'Скасувати відправку' : 'Позначити відправленим'}
        </button>
      </td>
    </tr>
    <tr id="details-${o.id}" class="order-details-row" style="display:none;">
      <td colspan="9">
        <div class="items-line"><strong>Товари:</strong></div>
        ${o.items.map((i) => `<div class="items-line">• ${i.product_name} × ${i.quantity} = ${(i.price * i.quantity).toFixed(0)} ₴</div>`).join('')}
        <div class="delivery-line">Доставка: ${deliveryInfoLine(o)}</div>
        ${o.city ? `<div class="items-line">Місто (вказане клієнтом): ${o.city}</div>` : ''}
        ${o.comment ? `<div class="items-line">Коментар: ${o.comment}</div>` : ''}
        <div class="items-line" style="margin-top:8px; color:var(--text-secondary);">Оформлено: ${new Date(o.created_at).toLocaleString('uk-UA')}</div>
      </td>
    </tr>
  `).join('');
}

async function toggleShipped(id, current) {
  const result = await adminFetch(`/api/orders/${id}/shipped`, {
    method: 'PATCH',
    body: JSON.stringify({ is_shipped: !current }),
  });
  if (result.error) { showToast(result.error); return; }
  showToast(!current ? 'Замовлення позначено як відправлене' : 'Позначку відправки знято');
  await loadOrders();
}

function openProductModal(product = null) {
  document.getElementById('productModalTitle').textContent = product ? 'Редагувати товар' : 'Новий товар';
  document.getElementById('p_id').value = product?.id || '';
  document.getElementById('p_name').value = product?.name || '';
  document.getElementById('p_category_id').value = product?.category_id || categoriesCache[0]?.id || '';
  document.getElementById('p_in_stock').value = product ? String(product.in_stock) : 'true';
  document.getElementById('p_price').value = product?.price || '';
  document.getElementById('p_old_price').value = product?.old_price || '';
  document.getElementById('p_image_url').value = product?.image_url || '';
  document.getElementById('p_short_description').value = product?.short_description || '';
  document.getElementById('p_description').value = product?.description || '';

  document.getElementById('uploadPreviewWrap').innerHTML = product?.image_url
    ? `<div class="upload-preview"><img src="${product.image_url}" alt="Прев'ю фото"></div>`
    : '';
  document.getElementById('p_image_file').value = '';
  document.getElementById('p_gallery_file').value = '';
  renderGallery(product?.id || null);

  document.getElementById('productModalOverlay').classList.add('open');
}
function closeProductModal() {
  document.getElementById('productModalOverlay').classList.remove('open');
}

async function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('p_id').value;
  const payload = {
    name: document.getElementById('p_name').value.trim(),
    category_id: parseInt(document.getElementById('p_category_id').value) || null,
    in_stock: document.getElementById('p_in_stock').value === 'true',
    price: parseFloat(document.getElementById('p_price').value),
    old_price: document.getElementById('p_old_price').value ? parseFloat(document.getElementById('p_old_price').value) : null,
    image_url: document.getElementById('p_image_url').value.trim(),
    short_description: document.getElementById('p_short_description').value.trim(),
    description: document.getElementById('p_description').value.trim(),
  };

  const result = id
    ? await adminFetch(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
    : await adminFetch(`/api/products`, { method: 'POST', body: JSON.stringify(payload) });

  if (result.error) { showToast(result.error); return; }
  showToast(id ? 'Товар оновлено' : 'Товар створено');
  closeProductModal();
  await loadAll();
}

async function deleteProduct(id) {
  if (!confirm('Видалити цей товар?')) return;
  const result = await adminFetch(`/api/products/${id}`, { method: 'DELETE' });
  if (result.error) { showToast(result.error); return; }
  showToast('Товар видалено');
  await loadAll();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginBtn').addEventListener('click', login);
  document.getElementById('tokenInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('newProductBtn').addEventListener('click', () => openProductModal());
  document.getElementById('cancelProductBtn').addEventListener('click', closeProductModal);
  document.getElementById('productForm').addEventListener('submit', saveProduct);
  document.getElementById('productModalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'productModalOverlay') closeProductModal();
  });
  initUploadBox();
  initGalleryUpload();

  document.getElementById('productsTableBody').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = parseInt(btn.dataset.id);
    if (btn.dataset.action === 'edit') {
      const product = productsCache.find((p) => p.id === id);
      openProductModal(product);
    }
    if (btn.dataset.action === 'delete') deleteProduct(id);
  });

  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  document.getElementById('ordersTableBody').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = parseInt(btn.dataset.id);
    if (btn.dataset.action === 'toggle-shipped') {
      toggleShipped(id, btn.dataset.current === 'true');
    }
    if (btn.dataset.action === 'toggle-details') {
      const row = document.getElementById(`details-${id}`);
      const isOpen = row.style.display !== 'none';
      row.style.display = isOpen ? 'none' : 'table-row';
      btn.textContent = isOpen ? '▸' : '▾';
    }
  });

  if (getToken()) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminScreen').style.display = 'block';
    loadAll();
  }
});
