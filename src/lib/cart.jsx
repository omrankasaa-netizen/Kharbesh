import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

const STORAGE_KEY = 'kh_cart_v1';

/* Cart persistence: localStorage so a refresh doesn't wipe the bag, with a
   module-scope fallback because sandboxed preview iframes block browser
   storage. Every access is wrapped in try/catch for the same reason. */
let memoryCart = [];

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryCart;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Drop malformed entries: an item needs at least a product id and a
    // positive integer quantity; everything else is coerced/kept as-is.
    return parsed
      .filter((item) => item && typeof item === 'object' && item.productId != null)
      .map((item) => {
        const quantity = Math.max(1, Math.floor(Number(item.quantity)) || 1);
        const color = item.color ?? '';
        const size = item.size ?? '';
        return { ...item, quantity, color, size, key: item.key || `${item.productId}|${color}|${size}` };
      });
  } catch {
    return memoryCart;
  }
}

function saveCart(items) {
  memoryCart = items;
  try {
    if (items.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked (sandboxed preview) — module scope still holds it */
  }
}

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const addItem = (item) => {
    setItems((prev) => {
      const key = `${item.productId}|${item.color}|${item.size}`;
      const existing = prev.find((p) => p.key === key);
      if (existing) {
        return prev.map((p) => (p.key === key ? { ...p, quantity: p.quantity + item.quantity } : p));
      }
      return [...prev, { ...item, key }];
    });
  };

  const updateQty = (key, quantity) => {
    if (quantity <= 0) { removeItem(key); return; }
    setItems((prev) => prev.map((p) => (p.key === key ? { ...p, quantity } : p)));
  };

  const removeItem = (key) => setItems((prev) => prev.filter((p) => p.key !== key));

  const clear = () => setItems([]);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQty, removeItem, clear, count, subtotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
