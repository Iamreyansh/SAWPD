"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, X, Calendar } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart-store";
import { useUiStore } from "@/store/ui-store";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { formatINR, cn } from "@/lib/utils";
import type { Product } from "@/types/storefront";

type Props = {
  products: Product[];
  storeSlug: string;
};

function fmtSlot(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function CartSheet({ products, storeSlug }: Props) {
  const open = useUiStore((s) => s.cartOpen);
  const close = useUiStore((s) => s.closeCart);
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);
  const hydrated = useCartStore((s) => s.hydrated);
  const mounted = useHasMounted();
  const router = useRouter();

  // Cross-store cart guard: if the persisted cart is bound to a different
  // store, surface a "different store" warning. Otherwise hide it.
  const persistedStoreSlug = useCartStore((s) => s.storeSlug);
  const crossStore =
    mounted &&
    hydrated &&
    items.length > 0 &&
    !!persistedStoreSlug &&
    persistedStoreSlug !== storeSlug;

  // Filter lines to products still available in the current store. Items
  // pointing at unknown products are exposed as `unavailable` so the UI
  // can show them with a "remove" affordance (they'd otherwise be orphaned
  // forever).
  const lines = (mounted && hydrated && !crossStore ? items : [])
    .map((i) => {
      const product = products.find((p) => p.id === i.productId);
      return product
        ? ({ productId: i.productId, qty: i.qty, product } as const)
        : null;
    })
    .filter(
      (x): x is {
        productId: string;
        qty: number;
        slotId?: string;
        slotStartsAt?: string;
        slotEndsAt?: string;
        product: Product;
      } => x !== null,
    );

  // Lines that point to unknown products. These are still in the store,
  // but the seller may have archived/deleted them — surface as "no longer
  // available" so the user can clear them.
  const unavailableIds = (mounted && hydrated && !crossStore ? items : [])
    .filter((i) => !products.some((p) => p.id === i.productId))
    .map((i) => i.productId);

  const subtotal = lines.reduce((acc, l) => acc + l.product.price * l.qty, 0);
  const itemCount = lines.reduce((acc, l) => acc + l.qty, 0);

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? null : close())}>
      <SheetContent side="bottom" showHandle className="bg-bone">
        <SheetHeader className="flex-row items-center justify-between">
          <SheetTitle>Your bag</SheetTitle>
          <button
            onClick={close}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink active:scale-90"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </SheetHeader>

        <AnimatePresence mode="wait" initial={false}>
          {crossStore ? (
            <motion.div
              key="cross-store"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center"
            >
              <p className="display-m text-ink/70">Different shop in your bag.</p>
              <p className="mt-3 max-w-xs text-[14px] text-ink/50">
                Your bag has items from another shop. Clear it to add items from this one.
              </p>
              <Button
                variant="vermillion"
                size="default"
                className="mt-8"
                onClick={() => clear()}
              >
                Clear bag
              </Button>
            </motion.div>
          ) : lines.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center"
            >
              <p className="display-m text-ink/50">Your bag is empty.</p>
              <p className="mt-3 max-w-xs text-[14px] text-ink/40">
                Add a piece to get started. Limited runs go quickly.
              </p>
              <Button
                variant="ghost"
                size="default"
                className="mt-8"
                onClick={close}
              >
                Browse the edit
              </Button>
            </motion.div>
          ) : (
            <SheetBody className="pt-2">
              <ul className="divide-y divide-ink/5">
                <AnimatePresence initial={false}>
                  {lines.map((line) => (
                    <motion.li
                      key={line.productId + (line.slotId ?? "")}
                      layout
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 40, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="flex gap-4 py-5"
                    >
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-ink/[0.04]">
                        <Image
                          src={line.product.images[0]?.url ?? ""}
                          alt={line.product.altText}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[14.5px] font-semibold text-ink">
                              {line.product.title}
                            </p>
                            <p className="truncate text-[12.5px] text-ink/55">
                              {line.product.tagline}
                            </p>
                            {line.slotStartsAt && (
                              <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-vermillion/[0.08] px-2 py-0.5 text-[11px] font-medium text-vermillion-deep">
                                <Calendar className="h-3 w-3" />
                                {fmtSlot(line.slotStartsAt)}
                              </p>
                            )}
                          </div>
                          <p className="flex-shrink-0 text-[14.5px] font-semibold tabular-nums text-ink">
                            {formatINR(line.product.price * line.qty)}
                          </p>
                        </div>
                        <div className="mt-auto flex items-center justify-between pt-3">
                          {line.slotId ? (
                            <span className="text-[11px] text-ink/40 italic">
                              Booking · remove to change time
                            </span>
                          ) : (
                            <div className="flex items-center gap-1 rounded-full border border-ink/10 bg-bone p-0.5">
                              <button
                                onClick={() => setQty(line.productId, line.qty - 1, line.product.stockCount)}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 active:scale-90"
                                aria-label="Decrease"
                              >
                                <Minus className="h-3.5 w-3.5" strokeWidth={2.25} />
                              </button>
                              <span className="min-w-[1.5rem] text-center text-[13px] font-semibold tabular-nums">
                                {line.qty}
                              </span>
                              <button
                                onClick={() =>
                                  setQty(line.productId, line.qty + 1, line.product.stockCount)
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 active:scale-90"
                                aria-label="Increase"
                              >
                                <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => remove(line.productId, line.slotId)}
                            className="text-[12px] font-medium text-ink/40 transition-colors hover:text-vermillion"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              {unavailableIds.length > 0 && (
                <div className="mt-4 rounded-2xl border border-ink/5 bg-ink/[0.02] p-4 text-[12.5px] text-ink/60">
                  <p className="font-semibold text-ink/80">
                    {unavailableIds.length} item{unavailableIds.length === 1 ? "" : "s"} no longer available
                  </p>
                  <p className="mt-1">
                    The seller may have removed {unavailableIds.length === 1 ? "it" : "them"}.
                  </p>
                  <button
                    onClick={() => unavailableIds.forEach((id) => remove(id))}
                    className="mt-2 text-[12px] font-semibold text-vermillion underline"
                  >
                    Remove unavailable items
                  </button>
                </div>
              )}

              <div className="mt-8 space-y-2 text-[13.5px] text-ink/60">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="tabular-nums text-ink">{formatINR(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-ink/50">Calculated at next step</span>
                </div>
              </div>
            </SheetBody>
          )}
        </AnimatePresence>

        {lines.length > 0 && !crossStore && (
          <div className="border-t border-ink/5 bg-bone px-6 pb-6 pt-4">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-[14px] text-ink/60">Total ({itemCount} item{itemCount === 1 ? "" : "s"})</span>
              <span className="text-2xl font-bold tabular-nums tracking-[-0.02em] text-ink">
                {formatINR(subtotal)}
              </span>
            </div>
            <Button
              size="lg"
              variant="vermillion"
              className="w-full"
              onClick={() => {
                close();
                router.push(`/s/${storeSlug}/checkout`);
              }}
            >
              Checkout · {formatINR(subtotal)}
            </Button>
            <p className="mt-3 text-center text-[11px] text-ink/40">
              Pay via UPI · Owner verifies your screenshot
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
