"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Upload, X, Tag, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCartStore } from "@/store/cart-store";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { formatINR, cn } from "@/lib/utils";
import { buildWhatsAppLink, ownerContactMessage } from "@/lib/whatsapp";
import { loadLastOrderAddress, saveLastOrderAddress } from "@/lib/address-memory";
import type { Product, Store } from "@/types/storefront";
import { placeOrder, validatePromoAction } from "./actions";

type Props = {
  store: Store;
  products: Product[];
};

const customerSchema = z.object({
  name: z.string().min(2, "Please enter your name"),
  phone: z
    .string()
    .min(10, "Please enter a valid phone number")
    .regex(/^[0-9+\s-]+$/, "Digits only"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().min(10, "Please enter a full shipping address"),
});

type CustomerForm = z.infer<typeof customerSchema>;

export function CheckoutClient({ store, products }: Props) {
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const hydrated = useCartStore((s) => s.hydrated);
  const mounted = useHasMounted();

  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ orderId: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Promo code state
  const [promoDraft, setPromoDraft] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoPending, startPromoTransition] = useTransition();
  const submittingRef = useRef(false);

  const lines = useMemo(
    () =>
      (mounted && hydrated ? items : [])
        .map((i) => {
          const product = products.find((p) => p.id === i.productId);
          return product ? { ...i, product } : null;
        })
        .filter(Boolean) as Array<{ productId: string; qty: number; product: Product }>,
    [items, products, mounted, hydrated]
  );

  const subtotal = lines.reduce((acc, l) => acc + l.product.price * l.qty, 0);
  const itemCount = lines.reduce((acc, l) => acc + l.qty, 0);
  const discountAmount = appliedPromo?.discountAmount ?? 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const upiLink = useMemo(() => {
    const params = new URLSearchParams({
      pa: store.upiId,
      pn: store.name,
      am: finalTotal.toString(),
      cu: "INR",
      tn: `SAWPD order from ${store.slug}`,
    });
    return `upi://pay?${params.toString()}`;
  }, [store.upiId, store.name, store.slug, finalTotal]);

  const [qrSrc, setQrSrc] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (subtotal <= 0) {
      setQrSrc(null);
      return;
    }
    QRCode.toDataURL(upiLink, {
      width: 480,
      margin: 1,
      color: { dark: "#111111", light: "#F5F2EC" },
    }).then((url) => {
      if (active) setQrSrc(url);
    });
    return () => {
      active = false;
    };
  }, [upiLink, subtotal]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", phone: "", email: "", address: "" },
  });

  // Prefill from saved address (cookie) on mount
  useEffect(() => {
    const saved = loadLastOrderAddress();
    if (!saved) return;
    setValue("name", saved.name);
    setValue("phone", saved.phone);
    setValue("email", saved.email ?? "");
    setValue("address", saved.address);
  }, [setValue]);

  const onSubmit = (data: CustomerForm) => {
    setError(null);
    if (lines.length === 0) {
      setError("Your bag is empty.");
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    startTransition(async () => {
      const result = await placeOrder({
        storeSlug: store.slug,
        customer: {
          name: data.name.trim(),
          phone: data.phone.trim(),
          email: data.email?.trim() || undefined,
          address: data.address.trim(),
        },
        lines: lines.map((l) => ({
          productId: l.productId,
          title: l.product.title,
          price: l.product.price,
          qty: l.qty,
          imageUrl: l.product.images[0]?.url ?? "",
        })),
        subtotal,
        promoCode: appliedPromo?.code,
        screenshotDataUrl: screenshot ?? undefined,
      });
      if (result.ok) {
        saveLastOrderAddress({
          name: data.name.trim(),
          phone: data.phone.trim(),
          email: data.email?.trim() || undefined,
          address: data.address.trim(),
        });
        setSubmitted({ orderId: result.orderId });
        clear();
      } else {
        setError(result.error);
        submittingRef.current = false;
      }
    });
  };

  const applyPromoCode = (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = promoDraft.trim();
    if (!code) return;
    setPromoError(null);
    startPromoTransition(async () => {
      const result = await validatePromoAction(store.slug, code, subtotal);
      if (result.ok) {
        setAppliedPromo({
          code: result.promoCode,
          discountAmount: result.discountAmount,
        });
        setPromoDraft("");
      } else {
        setPromoError(result.error);
      }
    });
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoError(null);
  };

  const handleScreenshot = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setScreenshot(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(store.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  if (submitted) {
    return (
      <main className="container-editorial flex min-h-[80vh] flex-col items-start justify-center py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-md"
        >
          <p className="eyebrow mb-6">Order placed</p>
          <h1 className="display-l text-ink text-balance">
            Thanks. <span className="text-ink/30">We&apos;ll be in touch.</span>
          </h1>
          <p className="mt-6 text-[15px] text-ink/60">
            Your order{" "}
            <span className="font-semibold tabular-nums text-ink">
              {submitted.orderId}
            </span>{" "}
            has been received. {store.name} will verify your payment and
            confirm shipping on WhatsApp or Instagram DM.
          </p>
          <p className="mt-3 text-[13px] text-ink/50">
            Save your order ID — use it to{" "}
            <Link
              href={`/track?orderId=${encodeURIComponent(submitted.orderId)}`}
              className="font-semibold text-ink underline-offset-2 hover:underline"
            >
              track this order
            </Link>
            .
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild variant="default" size="default">
              <Link href={`/s/${store.slug}`}>Back to shop</Link>
            </Button>
            {(() => {
              const link = buildWhatsAppLink(
                store.whatsapp,
                ownerContactMessage({
                  storeName: store.name,
                  orderId: submitted.orderId,
                  intent: "question",
                })
              );
              if (link) {
                return (
                  <Button
                    asChild
                    size="default"
                    className="bg-[#25D366] text-white hover:bg-[#1DAB55]"
                  >
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4" strokeWidth={2.25} />
                      Chat on WhatsApp
                    </a>
                  </Button>
                );
              }
              return (
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => {
                    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                      navigator.vibrate(10);
                    }
                    window.open(
                      `https://instagram.com/${store.ownerHandle.replace("@", "")}`,
                      "_blank"
                    );
                  }}
                >
                  DM on Instagram
                </Button>
              );
            })()}
          </div>
        </motion.div>
      </main>
    );
  }

  if (mounted && hydrated && lines.length === 0) {
    return (
      <main className="container-editorial flex min-h-[60vh] flex-col items-start justify-center py-20">
        <p className="eyebrow mb-6">Checkout</p>
        <h1 className="display-l text-ink text-balance">
          Nothing to check out,
          <br />
          <span className="text-ink/30">yet.</span>
        </h1>
        <p className="mt-6 max-w-md text-[15px] text-ink/60">
          Your bag is empty. Head back to the edit and pick a piece.
        </p>
        <Button asChild className="mt-10" size="default">
          <Link href={`/s/${store.slug}`}>Back to shop</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="container-editorial pb-24 pt-6 md:pt-10">
      <Link
        href={`/s/${store.slug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-ink/50 transition-colors hover:text-ink"
      >
        ← Back
      </Link>

      <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-10">
        <div className="md:col-span-7">
          <p className="eyebrow mb-3">Step 1 of 2</p>
          <h1 className="display-l text-ink text-balance">
            Pay via UPI
          </h1>
          <p className="mt-4 max-w-md text-[14.5px] text-ink/60">
            Scan the QR with any UPI app, or copy the UPI ID. Then add your
            details and upload a screenshot of the payment.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-[200px_1fr] sm:items-start">
            <div className="flex aspect-square w-full max-w-[200px] items-center justify-center overflow-hidden rounded-2xl border border-ink/10 bg-bone p-3">
              {qrSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrSrc}
                  alt={`UPI QR for ${store.upiId}`}
                  className="h-full w-full"
                />
              ) : (
                <p className="text-center text-[12px] text-ink/40">
                  Add items to
                  <br />
                  generate QR
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <p className="eyebrow-ink">UPI ID</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg border border-ink/10 bg-bone px-3 py-2.5 text-[14px] font-semibold text-ink">
                    {store.upiId}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyUpi}
                    aria-label="Copy UPI ID"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" strokeWidth={2.25} />
                    ) : (
                      <Copy className="h-4 w-4" strokeWidth={1.75} />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <p className="eyebrow-ink">Amount</p>
                <p className="mt-2 text-2xl font-bold tabular-nums tracking-[-0.02em] text-ink">
                  {formatINR(finalTotal)}
                </p>
                {discountAmount > 0 && (
                  <p className="mt-1 text-[12px] text-vermillion">
                    {formatINR(subtotal)} − {formatINR(discountAmount)} promo
                  </p>
                )}
              </div>
              <div>
                <p className="eyebrow-ink">Paying to</p>
                <p className="mt-2 text-[15px] text-ink">{store.name}</p>
              </div>
            </div>
          </div>

          <hr className="my-12 border-ink/10" />

          <p className="eyebrow mb-3">Step 2 of 2</p>
          <h2 className="display-m text-ink text-balance">Your details</h2>

          <form
            id="checkout-form"
            onSubmit={handleSubmit(onSubmit)}
            className="mt-8 space-y-5"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name" error={errors.name?.message}>
                <Input
                  {...register("name")}
                  placeholder="Your full name"
                  autoComplete="name"
                />
              </Field>
              <Field label="Phone" error={errors.phone?.message}>
                <Input
                  {...register("phone")}
                  placeholder="10-digit number"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </Field>
            </div>
            <Field label="Email (optional)" error={errors.email?.message}>
              <Input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Field>
            <Field label="Shipping address" error={errors.address?.message}>
              <Textarea
                {...register("address")}
                placeholder="House, street, city, pincode"
              />
            </Field>

            <Field label="Payment screenshot">
              {screenshot ? (
                <div className="relative h-40 w-full max-w-[200px] overflow-hidden rounded-xl border border-ink/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={screenshot}
                    alt="Payment screenshot preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setScreenshot(null)}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink/80 text-bone"
                    aria-label="Remove screenshot"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink/20 bg-bone text-ink/50 transition-colors hover:border-ink/40 hover:text-ink">
                  <Upload className="h-5 w-5" strokeWidth={1.75} />
                  <span className="text-[12.5px] font-medium">
                    Tap to upload
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => handleScreenshot(e.target.files?.[0])}
                  />
                </label>
              )}
            </Field>

            {error && (
              <p className="rounded-xl border border-vermillion/20 bg-vermillion/5 px-4 py-3 text-[13.5px] text-vermillion">
                {error}
              </p>
            )}
          </form>
        </div>

        <aside className="md:col-span-5">
          <div className="sticky top-24 rounded-2xl border border-ink/10 bg-bone p-6">
            <p className="eyebrow mb-4">Your bag</p>
            <AnimatePresence initial={false}>
              <ul className="divide-y divide-ink/5">
                {lines.map((line) => (
                  <motion.li
                    key={line.productId}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex gap-3 py-4"
                  >
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-ink/[0.04]">
                      <Image
                        src={line.product.images[0]?.url ?? ""}
                        alt={line.product.altText}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-[13.5px] font-semibold text-ink">
                          {line.product.title}
                        </p>
                        <p className="flex-shrink-0 text-[13.5px] font-semibold tabular-nums text-ink">
                          {formatINR(line.product.price * line.qty)}
                        </p>
                      </div>
                      <p className="text-[12px] text-ink/50">
                        Qty {line.qty}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </AnimatePresence>

            <hr className="my-5 border-ink/10" />

            <div className="mb-4">
              {appliedPromo ? (
                <div className="flex items-center justify-between rounded-xl border border-ink bg-ink/[0.04] px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <Tag className="h-3.5 w-3.5 flex-shrink-0 text-vermillion" strokeWidth={2.25} />
                    <span className="font-mono text-[12.5px] font-bold tracking-[0.04em] text-ink">
                      {appliedPromo.code}
                    </span>
                    <span className="text-[12px] text-ink/60">
                      −{formatINR(appliedPromo.discountAmount)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={removePromo}
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-ink/55 transition-colors hover:bg-ink/[0.06] hover:text-ink"
                    aria-label="Remove promo code"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              ) : (
                <form onSubmit={applyPromoCode} className="space-y-1.5">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag
                        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/40"
                        strokeWidth={2}
                      />
                      <Input
                        value={promoDraft}
                        onChange={(e) =>
                          setPromoDraft(e.target.value.toUpperCase())
                        }
                        placeholder="Promo code"
                        className="pl-8 font-mono tracking-[0.04em]"
                        maxLength={24}
                        disabled={promoPending}
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="outline"
                      size="default"
                      disabled={promoPending || !promoDraft.trim()}
                      className="flex-shrink-0"
                    >
                      {promoPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                  {promoError && (
                    <p className="text-[11.5px] text-vermillion">{promoError}</p>
                  )}
                </form>
              )}
            </div>

            <dl className="space-y-2 text-[13.5px] text-ink/60">
              <div className="flex justify-between">
                <dt>Items</dt>
                <dd className="tabular-nums text-ink">{itemCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="tabular-nums text-ink">{formatINR(subtotal)}</dd>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-vermillion">
                  <dt>Discount</dt>
                  <dd className="tabular-nums">−{formatINR(discountAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt>Shipping</dt>
                <dd className="text-ink/50">Calculated by seller</dd>
              </div>
            </dl>

            <div className="mt-5 flex items-baseline justify-between">
              <span className="text-[13.5px] text-ink/60">Total</span>
              <span
                className={cn(
                  "text-2xl font-bold tabular-nums tracking-[-0.02em] text-ink",
                  discountAmount > 0 && "text-vermillion"
                )}
              >
                {formatINR(finalTotal)}
              </span>
            </div>

            <Button
              type="submit"
              form="checkout-form"
              size="lg"
              variant="vermillion"
              className="mt-6 w-full"
              disabled={pending || lines.length === 0}
            >
              {pending ? "Placing order…" : "Place order"}
            </Button>

            <p className="mt-3 text-center text-[11px] text-ink/40">
              No payment is taken on this page. Owner verifies your screenshot.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
        {label}
      </span>
      {children}
      {error && (
        <span className="mt-1.5 block text-[12px] text-vermillion">
          {error}
        </span>
      )}
    </label>
  );
}
