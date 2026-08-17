import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

const STORAGE_KEY = 'kh-cart';

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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
