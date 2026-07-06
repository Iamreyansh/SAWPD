"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  productId: string;
  qty: number;
  /** Set when the item is a service booking — the chosen time slot. */
  slotId?: string;
  slotStartsAt?: string;
  slotEndsAt?: string;
};

type AddResult = "added" | "replaced_store" | "at_stock_cap";

type CartState = {
  items: CartItem[];
  storeSlug: string | null;
  hydrated: boolean;
  /**
   * Add `qty` of `productId` to the cart.
   * `stockCount` is the authoritative max — `add` will cap existing
   * quantities to it. Returns a result tag the caller can react to.
   * If `stockCount` is omitted, no cap is enforced (caller is responsible).
   */
  add: (
    productId: string,
    qty?: number,
    storeSlug?: string,
    stockCount?: number,
    slot?: { id: string; startsAt: string; endsAt: string },
  ) => AddResult;
  setQty: (productId: string, qty: number, stockCount?: number) => void;
  remove: (productId: string, slotId?: string) => void;
  clear: () => void;
  setHydrated: (v: boolean) => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      storeSlug: null,
      hydrated: false,
      add: (productId, qty = 1, newStoreSlug, stockCount, slot) => {
        const current = get().items;

        // Service bookings are unique per slot — never merge two of the
        // same slot into one cart line.
        if (slot) {
          const clash = current.find(
            (i) => i.productId === productId && i.slotId === slot.id,
          );
          if (clash) return "at_stock_cap";
          set({
            items: [
              ...current,
              {
                productId,
                qty: 1,
                slotId: slot.id,
                slotStartsAt: slot.startsAt,
                slotEndsAt: slot.endsAt,
              },
            ],
            storeSlug: newStoreSlug ?? get().storeSlug,
          });
          return "added";
        }

        const existingQty = current.find(
          (i) => i.productId === productId,
        )?.qty ?? 0;

        // Switch-store shortcut — clear before re-adding.
        if (
          newStoreSlug &&
          get().storeSlug &&
          get().storeSlug !== newStoreSlug &&
          current.length > 0
        ) {
          if (typeof stockCount === "number" && qty > stockCount) {
            qty = Math.max(0, stockCount);
            if (qty <= 0) return "at_stock_cap";
          }
          set({
            items: [{ productId, qty }],
            storeSlug: newStoreSlug,
          });
          return "replaced_store";
        }

        if (typeof stockCount === "number") {
          const target = existingQty + qty;
          if (target > stockCount) {
            if (existingQty >= stockCount) return "at_stock_cap";
            qty = stockCount - existingQty;
          }
        }

        if (existingQty > 0) {
          set({
            items: current.map((i) =>
              i.productId === productId ? { ...i, qty: i.qty + qty } : i,
            ),
            storeSlug: newStoreSlug ?? get().storeSlug,
          });
        } else {
          set({
            items: [...current, { productId, qty }],
            storeSlug: newStoreSlug ?? get().storeSlug,
          });
        }
        return "added";
      },
      setQty: (productId, qty, stockCount) => {
        if (qty <= 0) {
          set((s) => ({
            items: s.items.filter((i) => i.productId !== productId),
          }));
          return;
        }
        if (typeof stockCount === "number" && qty > stockCount) {
          qty = stockCount;
        }
        set((s) => ({
          items: s.items.map((i) =>
            i.productId === productId ? { ...i, qty } : i,
          ),
        }));
      },
      remove: (productId, slotId) =>
        set((s) => ({
          items: s.items.filter(
            (i) => !(i.productId === productId && i.slotId === slotId),
          ),
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
    },
  ),
);

// Selectors
export const selectCount = (s: CartState) =>
  s.items.reduce((acc, i) => acc + i.qty, 0);