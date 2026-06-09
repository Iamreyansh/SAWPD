"use client";

import Image from "next/image";
import { Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetBody,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart-store";
import { useUiStore } from "@/store/ui-store";
import { useToast } from "@/components/ui/toaster";
import { cn, formatINR } from "@/lib/utils";
import type { Product } from "@/types/storefront";

type Props = {
  products: Product[];
};

export function ProductDetailSheet({ products }: Props) {
  const productId = useUiStore((s) => s.productDetailId);
  const close = useUiStore((s) => s.closeProduct);
  const add = useCartStore((s) => s.add);
  const { toast } = useToast();

  const product = products.find((p) => p.id === productId) ?? null;
  const [qty, setQty] = useState(1);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    setQty(1);
    setActiveIdx(0);
  }, [productId]);

  const images = product?.images ?? [];
  const activeImage = images[activeIdx];

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      close();
    }
  };

  const nextImage = () => {
    if (images.length > 1) setActiveIdx((i) => (i + 1) % images.length);
  };
  const prevImage = () => {
    if (images.length > 1) setActiveIdx((i) => (i - 1 + images.length) % images.length);
  };

  return (
    <Sheet open={!!product} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        showHandle
        className="bg-bone"
      >
        {product && (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between">
                <p className="eyebrow">Piece</p>
                {images.length > 1 && (
                  <p className="text-[12px] text-ink/40">
                    {activeIdx + 1} of {images.length}
                  </p>
                )}
              </div>
            </SheetHeader>

            <SheetBody>
              <div
                className="group relative w-full overflow-hidden rounded-2xl bg-ink/[0.04]"
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft") prevImage();
                  if (e.key === "ArrowRight") nextImage();
                }}
                tabIndex={-1}
              >
                <div className="relative aspect-square w-full">
                  {activeImage ? (
                    <Image
                      src={activeImage.url}
                      alt={product.altText}
                      fill
                      sizes="(min-width: 768px) 600px, 100vw"
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-ink/40">
                      No image
                    </div>
                  )}
                </div>
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prevImage}
                      className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-bone/90 text-ink opacity-0 shadow-soft transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 md:opacity-100"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={nextImage}
                      className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-bone/90 text-ink opacity-0 shadow-soft transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 md:opacity-100"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
                    </button>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setActiveIdx(i)}
                      className={cn(
                        "relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                        i === activeIdx
                          ? "border-ink"
                          : "border-transparent opacity-60 hover:opacity-100"
                      )}
                      aria-label={`Image ${i + 1}`}
                      aria-current={i === activeIdx}
                    >
                      <Image
                        src={img.url}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-6 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-2xl">{product.title}</SheetTitle>
                  <p className="mt-1.5 text-[14px] text-ink/55">{product.tagline}</p>
                </div>
                <p className="flex-shrink-0 text-xl font-bold tracking-[-0.02em] text-ink">
                  {formatINR(product.price)}
                </p>
              </div>

              {product.stockCount > 0 && product.stockCount <= 3 && (
                <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-vermillion/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-vermillion">
                  <span className="h-1.5 w-1.5 rounded-full bg-vermillion" />
                  Only {product.stockCount} left
                </p>
              )}
            </SheetBody>

            <div className="border-t border-ink/5 bg-bone px-6 pb-6 pt-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="eyebrow-ink">Quantity</p>
                <div className="flex items-center gap-1 rounded-full border border-ink/10 bg-bone p-1">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 active:scale-90 disabled:opacity-30"
                    disabled={qty <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" strokeWidth={2} />
                  </button>
                  <span className="min-w-[2rem] text-center text-[15px] font-semibold tabular-nums text-ink">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty((q) => Math.min(product.stockCount, q + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 active:scale-90 disabled:opacity-30"
                    disabled={qty >= product.stockCount}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  add(product.id, qty);
                  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                    navigator.vibrate(10);
                  }
                  toast({
                    title: "Added to bag",
                    description: `${product.title} · qty ${qty}`,
                    variant: "vermillion",
                  });
                  close();
                  setQty(1);
                }}
              >
                Add to bag · {formatINR(product.price * qty)}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
