// Базова адреса API. Оскільки фронтенд роздається тим самим сервером Express,
// достатньо відносного шляху "/api" — працює і локально, і після деплою.
const API_BASE = '/api';

const api = {
  async getCategories() {
    const res = await fetch(`${API_BASE}/categories`);
    return res.json();
  },
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/products${query ? '?' + query : ''}`);
    return res.json();
  },
  async getProduct(slug) {
    const res = await fetch(`${API_BASE}/products/${slug}`);
    if (!res.ok) return null;
    return res.json();
  },
  async addReview(payload) {
    const res = await fetch(`${API_BASE}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  async createOrder(payload) {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  async searchNpCities(query) {
    const res = await fetch(`${API_BASE}/novaposhta/cities?q=${encodeURIComponent(query)}`);
    if (!res.ok) return { error: (await res.json()).error };
    return res.json();
  },
  async searchNpWarehouses(cityRef, query = '') {
    const res = await fetch(`${API_BASE}/novaposhta/warehouses?cityRef=${encodeURIComponent(cityRef)}&q=${encodeURIComponent(query)}`);
    if (!res.ok) return { error: (await res.json()).error };
    return res.json();
  },
};
