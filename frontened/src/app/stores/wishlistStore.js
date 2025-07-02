import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useWishlistStore = create(
  persist(
    (set) => ({
      wishlist: [],
      addToWishlist: (productId) =>
        set((state) => ({
          wishlist: [...state.wishlist, productId],
        })),
      removeFromWishlist: (productId) =>
        set((state) => ({
          wishlist: state.wishlist.filter((id) => id !== productId),
        })),
    }),
    {
      name: 'wishlist-storage', // Key for localStorage
    }
  )
);
