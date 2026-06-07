"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem } from "@/types/storefront";

type CartState = {
  items: CartItem[];
  hydrated: boolean;
  add: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  setHydrated: (v: boolean) => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hydrated: false,
      add: (productId, qty = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.productId === productId);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.productId === productId ? { ...i, qty: i.qty + qty } : i
              ),
            };
          }
          return { items: [...s.items, { productId, qty }] };
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
      clear: () => set({ items: [] }),
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: "sawpd-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

// Selectors
export const selectCount = (s: CartState) =>
  s.items.reduce((acc, i) => acc + i.qty, 0);
