"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem } from "@/types/storefront";

type CartState = {
  items: CartItem[];
  storeSlug: string | null;
  hydrated: boolean;
  add: (productId: string, qty?: number, storeSlug?: string) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  setHydrated: (v: boolean) => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      storeSlug: null,
      hydrated: false,
      add: (productId, qty = 1, newStoreSlug) =>
        set((s) => {
          // If adding from a different store, clear cart first
          if (newStoreSlug && s.storeSlug && s.storeSlug !== newStoreSlug && s.items.length > 0) {
            return {
              items: [{ productId, qty }],
              storeSlug: newStoreSlug,
            };
          }
          const existing = s.items.find((i) => i.productId === productId);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.productId === productId ? { ...i, qty: i.qty + qty } : i
              ),
              storeSlug: newStoreSlug ?? s.storeSlug,
            };
          }
          return {
            items: [...s.items, { productId, qty }],
            storeSlug: newStoreSlug ?? s.storeSlug,
          };
        }),
      setQty: (productId, qty) =>
        set((s) => ({
          items: qty <= 0
            ? s.items.filter((i) => i.productId !== productId)
            : s.items.map((i) =>
                i.productId === productId ? { ...i, qty } : i
              ),
        })),
      remove: (productId) =>
        set((s) => ({
          items: s.items.filter((i) => i.productId !== productId),
        })),
      clear: () => set({ items: [], storeSlug: null }),
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: "sawpd-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items, storeSlug: s.storeSlug }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

// Selectors
export const selectCount = (s: CartState) =>
  s.items.reduce((acc, i) => acc + i.qty, 0);
