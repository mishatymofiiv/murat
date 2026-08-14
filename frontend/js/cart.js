// Кошик зберігається в localStorage браузера, окремо для кожного відвідувача.
const CART_KEY = 'murattehnika_cart';

const cart = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  },
  save(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    cart.updateCountBadge();
  },
  add(product, qty = 1) {
    const items = cart.get();
    const existing = items.find((i) => i.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      items.push({
        id: product.id,
        name: product.name,
        price: parseFloat(product.price),
        image_url: product.image_url,
        qty,
      });
    }
    cart.save(items);
  },
  setQty(id, qty) {
    let items = cart.get();
    if (qty <= 0) {
      items = items.filter((i) => i.id !== id);
    } else {
      const item = items.find((i) => i.id === id);
      if (item) item.qty = qty;
    }
    cart.save(items);
  },
  remove(id) {
    const items = cart.get().filter((i) => i.id !== id);
    cart.save(items);
  },
  clear() {
    cart.save([]);
  },
  total() {
    return cart.get().reduce((sum, i) => sum + i.price * i.qty, 0);
  },
  count() {
    return cart.get().reduce((sum, i) => sum + i.qty, 0);
  },
  updateCountBadge() {
    document.querySelectorAll('.cart-count').forEach((el) => {
      el.textContent = cart.count();
    });
  },
};

document.addEventListener('DOMContentLoaded', () => cart.updateCountBadge());
