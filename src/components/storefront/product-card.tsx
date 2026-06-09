"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cart-store";
import { useUiStore } from "@/store/ui-store";
import { useToast } from "@/components/ui/toaster";
import type { Product } from "@/types/storefront";
import { cn, formatINR } from "@/lib/utils";

type Props = {
  product: Product;
  index: number;
};

export function ProductCard({ product, index }: Props) {
  const add = useCartStore((s) => s.add);
  const openProduct = useUiStore((s) => s.openProduct);
  const { toast } = useToast();
  const params = useParams();
  const reducedMotion = useReducedMotion();
  // Tracks post-mount decisions only. Starts false so the SSR and the
  // first client render are identical (avoids hydration mismatch), then
  // the effect below can flip it true if reduced motion is on or after
  // the 1.5s safety net.
  const [skipAnimate, setSkipAnimate] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (reducedMotion) {
      setSkipAnimate(true);
      return;
    }
    // Safety net: if whileInView hasn't fired (slow scroller, headless
    // scraper, very tall viewport, etc), reveal the card after 1.5s so
    // it's never permanently invisible.
    const t = setTimeout(() => setSkipAnimate(true), 1500);
    return () => clearTimeout(t);
  }, [reducedMotion]);

  const isLowStock = product.isAvailable && product.stockCount > 0 && product.stockCount <= 5;
  const isSoldOut = !product.isAvailable || product.stockCount === 0;
  const isOnSale = product.tags?.includes("sale") ?? false;

  // Render a plain <div> once we've decided to skip the animation
  // (reduced motion, or the safety net has fired). The card is visible
  // by default; no opacity:0 surprise for scrapers, reduced-motion
  // users, or slow scrollers.
  if (mounted && skipAnimate) {
    return <div className="group">{renderCard({ product, isLowStock, isSoldOut, isOnSale, add, openProduct, toast, storeSlug: params.slug as string })}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="group"
      data-animate-up={mounted ? "true" : undefined}
    >
      {renderCard({ product, isLowStock, isSoldOut, isOnSale, add, openProduct, toast, storeSlug: params.slug as string })}
    </motion.div>
  );
}

type RenderArgs = {
  product: Product;
  isLowStock: boolean;
  isSoldOut: boolean;
  isOnSale: boolean;
  add: (id: string, qty: number, storeSlug?: string) => void;
  openProduct: (id: string) => void;
  toast: (t: { title: string; description?: string }) => void;
  storeSlug: string;
};

function renderCard({
  product,
  isLowStock,
  isSoldOut,
  isOnSale,
  add,
  openProduct,
  toast,
  storeSlug,
}: RenderArgs) {
  return (
    <>
      <button
        onClick={() => {
          if (isSoldOut) return;
          openProduct(product.id);
        }}
        disabled={isSoldOut}
        className="block w-full text-left"
        aria-label={`View ${product.title}`}
      >
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-ink/[0.04]">
          <Image
            src={product.images[0]?.url ?? ""}
            alt={product.altText}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            className={cn(
              "object-cover transition-transform duration-700 ease-out",
              !isSoldOut && "group-hover:scale-[1.05] group-active:scale-[1.02]"
            )}
          />
          {isSoldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-bone/40 backdrop-blur-[1px]">
              <span className="rounded-full border border-ink/30 bg-bone/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/70 line-through">
                Sold out
              </span>
            </div>
          )}
          {!isSoldOut && product.tags?.includes("new") && (
            <span className="absolute left-3 top-3 rounded-full bg-bone px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-ink">
              New
            </span>
          )}
          {!isSoldOut && product.tags?.includes("limited") && (
            <span className="absolute right-3 top-3 rounded-full bg-vermillion px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-bone">
              Limited
            </span>
          )}
          {!isSoldOut && isLowStock && (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-vermillion/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-bone shadow-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-bone" />
              Only {product.stockCount} left
            </span>
          )}

          {/* Quick add — mobile only, sits on image */}
          {!isSoldOut && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                const cartItems = useCartStore.getState().items;
                const currentQty = cartItems.find((i) => i.productId === product.id)?.qty ?? 0;
                if (currentQty >= product.stockCount) {
                  toast({
                    title: "Max stock reached",
                    description: `Only ${product.stockCount} available`,
                  });
                  return;
                }
                add(product.id, 1, storeSlug);
                if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                  navigator.vibrate(8);
                }
                toast({
                  title: "Added to bag",
                  description: product.title,
                });
              }}
              className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-vermillion text-bone opacity-0 shadow-glow transition-all duration-300 group-hover:opacity-100 group-focus-within:opacity-100 active:scale-90 md:opacity-0 md:group-hover:opacity-100"
              aria-label={`Add ${product.title} to bag`}
            >
              <span className="text-xl leading-none">+</span>
            </span>
          )}
        </div>
      </button>

      <div className="mt-3.5 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-medium text-ink">{product.title}</h3>
          <p className="mt-0.5 truncate text-[12.5px] text-ink/55">{product.tagline}</p>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end">
          <span
            className={cn(
              "text-[14px] font-semibold tracking-[-0.01em]",
              isOnSale ? "text-vermillion" : "text-ink"
            )}
          >
            {formatINR(product.price)}
          </span>
          {isLowStock && (
            <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-vermillion">
              Only {product.stockCount} left
            </span>
          )}
        </div>
      </div>
    </>
  );
}
