"use client";

import { create } from "zustand";

type UiState = {
  cartOpen: boolean;
  productDetailId: string | null;
  openCart: () => void;
  closeCart: () => void;
  openProduct: (id: string) => void;
  closeProduct: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  cartOpen: false,
  productDetailId: null,
  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
  openProduct: (id) => set({ productDetailId: id }),
  closeProduct: () => set({ productDetailId: null }),
}));
