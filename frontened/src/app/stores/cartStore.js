import { create } from 'zustand';
import api from '@/utils/api';
import toast from 'react-hot-toast';

export const useCartStore = create((set, get) => ({
  cart: [],
  total: 0,
  lastSynced: 0,
  addToCart: (item) => {
    set((state) => {
      const existingItem = state.cart.find(
        (i) => i.productId === item.productId && i.size === item.size
      );
      if (existingItem) {
        const newCart = state.cart.map((i) =>
          i === existingItem ? { ...i, quantity: i.quantity + item.quantity } : i
        );
        return {
          cart: newCart,
          total: newCart.reduce((sum, i) => sum + i.quantity * i.price, 0),
          lastSynced: 0,
        };
      }
      return {
        cart: [...state.cart, item],
        total: state.total + item.quantity * item.price,
        lastSynced: 0,
      };
    });
  },
  updateQuantity: (productId, size, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        const newCart = state.cart.filter(
          (item) => !(item.productId === productId && item.size === size)
        );
        return {
          cart: newCart,
          total: newCart.reduce((sum, item) => sum + item.quantity * item.price, 0),
          lastSynced: 0,
        };
      }
      const newCart = state.cart.map((item) =>
        item.productId === productId && item.size === size ? { ...item, quantity } : item
      );
      return {
        cart: newCart,
        total: newCart.reduce((sum, item) => sum + item.quantity * item.price, 0),
        lastSynced: 0,
      };
    });
  },
  removeFromCart: (productId, size) => {
    set((state) => {
      const newCart = state.cart.filter(
        (item) => !(item.productId === productId && item.size === size)
      );
      return {
        cart: newCart,
        total: newCart.reduce((sum, item) => sum + item.quantity * item.price, 0),
        lastSynced: 0,
      };
    });
  },
  clearCart: () => {
    set({
      cart: [],
      total: 0,
      lastSynced: 0,
    });
  },
  syncCart: async () => {
    try {
      const { cart } = get();
      const response = await api.post('/api/cart/sync', {
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          name: item.name,
          image: item.image,
        })),
      });
      if (response.data.success) {
        const { items, total } = response.data.data;
        set({
          cart: items,
          total,
          lastSynced: Date.now(),
        });
      }
    } catch (error) {
      toast.error('Failed to sync cart');
    }
  },
}));