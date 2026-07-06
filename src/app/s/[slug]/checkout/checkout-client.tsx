"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Copy,
  Upload,
  X,
  Tag,
  Loader2,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCartStore } from "@/store/cart-store";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { formatINR, cn, buildInstagramUrl } from "@/lib/utils";
import { buildWhatsAppLink, ownerContactMessage } from "@/lib/whatsapp";
import { loadLastOrderAddress, saveLastOrderAddress } from "@/lib/address-memory";
import { fireClientEvent, makeEvent } from "@/lib/pixels";
import { listPaymentApps, buildUniversalUpiLink } from "@/lib/payment-links";
import type { Product, Store } from "@/types/storefront";
import { placeOrder, validatePromoAction } from "./actions";
import {
  requestCheckoutOtpAction,
  verifyCheckoutOtpAction,
  devPeekOtpCodeAction,
} from "./otp-actions";
import { confirmPaymentAction } from "./confirm-actions";

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

type OtpStage = "idle" | "sending" | "sent" | "verifying" | "verified";

export function CheckoutClient({ store, products }: Props) {
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const hydrated = useCartStore((s) => s.hydrated);
  const mounted = useHasMounted();

  const [submitted, setSubmitted] = useState<
    {
      orderId: string;
      eventId: string;
      total: number;
      numItems: number;
      productIds: string[];
      phoneVerified: boolean;
    } | null
  >(null);
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

  // OTP gate
  const [otpStage, setOtpStage] = useState<OtpStage>("idle");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpDevCode, setOtpDevCode] = useState<string | null>(null);
  const [otpProviderId, setOtpProviderId] = useState<string>("console");

  const lines = useMemo(
    () =>
      (mounted && hydrated ? items : [])
        .map((i) => {
          const product = products.find((p) => p.id === i.productId);
          return product ? { ...i, product } : null;
        })
        .filter(
          (
            x,
          ): x is {
            productId: string;
            qty: number;
            slotId?: string;
            slotStartsAt?: string;
            slotEndsAt?: string;
            product: Product;
          } => x !== null,
        ),
    [items, products, mounted, hydrated],
  );

  const subtotal = lines.reduce((acc, l) => acc + l.product.price * l.qty, 0);
  const itemCount = lines.reduce((acc, l) => acc + l.qty, 0);
  const discountAmount = appliedPromo?.discountAmount ?? 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // InitiateCheckout event (deduped)
  const checkoutEventFiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!mounted || !hydrated) return;
    if (lines.length === 0) return;
    const key = lines
      .map((l) => `${l.productId}x${l.qty}`)
      .sort()
      .join(",");
    if (checkoutEventFiredRef.current === key) return;
    checkoutEventFiredRef.current = key;
    fireClientEvent(
      makeEvent("InitiateCheckout", {
        value: finalTotal,
        numItems: itemCount,
        contentIds: lines.map((l) => l.productId),
      }),
    );
  }, [mounted, hydrated, lines, finalTotal, itemCount]);

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
    watch,
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

  const watchedPhone = watch("phone");

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
          kind: l.product.kind ?? "product",
          slotId: l.slotId,
          slotStartsAt: l.slotStartsAt,
          slotEndsAt: l.slotEndsAt,
        })),
        subtotal,
        promoCode: appliedPromo?.code,
        // Phone-verified customers skip the screenshot requirement;
        // the order goes straight to the seller as verified.
        phoneVerified: otpStage === "verified",
      });
      if (result.ok) {
        saveLastOrderAddress({
          name: data.name.trim(),
          phone: data.phone.trim(),
          email: data.email?.trim() || undefined,
          address: data.address.trim(),
        });
        window.history.replaceState(null, "", `/s/${store.slug}`);
        setSubmitted({
          orderId: result.orderId,
          eventId: result.eventId,
          total: finalTotal,
          numItems: itemCount,
          productIds: lines.map((l) => l.productId),
          phoneVerified: otpStage === "verified",
        });
        fireClientEvent(
          makeEvent("Purchase", {
            eventId: result.eventId,
            orderId: result.orderId,
            value: finalTotal,
            numItems: itemCount,
            contentIds: lines.map((l) => l.productId),
          }),
        );
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

  // ── OTP actions ──────────────────────────────────────────────

  const handleSendOtp = () => {
    if (!watchedPhone || watchedPhone.replace(/\D/g, "").length < 10) {
      setOtpError("Enter a valid 10-digit phone number first.");
      return;
    }
    setOtpError(null);
    setOtpStage("sending");
    setOtpDevCode(null);
    startTransition(async () => {
      const result = await requestCheckoutOtpAction({ phone: watchedPhone });
      if (result.ok) {
        setOtpStage("sent");
        setOtpProviderId(result.providerId);
        if (result.devCode) setOtpDevCode(result.devCode);
      } else {
        setOtpStage("idle");
        setOtpError(result.error);
      }
    });
  };

  const handleVerifyOtp = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setOtpError("Enter the 6-digit code.");
      return;
    }
    setOtpError(null);
    setOtpStage("verifying");
    startTransition(async () => {
      const result = await verifyCheckoutOtpAction({
        phone: watchedPhone,
        code: otpCode,
      });
      if (result.ok) {
        setOtpStage("verified");
      } else {
        setOtpStage("sent");
        setOtpError(result.error);
      }
    });
  };

  const handleResendOtp = () => {
    setOtpCode("");
    setOtpDevCode(null);
    handleSendOtp();
  };

  // In dev mode, allow prefilling the code by clicking the dev banner.
  const handleUseDevCode = () => {
    if (!otpDevCode) return;
    startTransition(async () => {
      const result = await devPeekOtpCodeAction(watchedPhone);
      if (result.ok) setOtpCode(result.code);
    });
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

  // Payment deep links (GPay/PhonePe/Paytm/BHIM).
  const paymentApps = listPaymentApps({
    upiId: store.upiId,
    payeeName: store.name,
    amountInr: finalTotal,
    orderId: "pending",
    transactionNote: "SAWPD",
  });
  const universalUpi = buildUniversalUpiLink({
    upiId: store.upiId,
    payeeName: store.name,
    amountInr: finalTotal,
    orderId: "pending",
    transactionNote: "SAWPD",
  });

  // ── Success view ─────────────────────────────────────────────

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
            has been received. {store.name} will confirm shipping on
            WhatsApp or Instagram DM.
          </p>
          {submitted.phoneVerified && (
            <p className="mt-3 text-[12.5px] text-vermillion">
              Verified via phone OTP — your order is auto-confirmed.
            </p>
          )}
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
                    const ig = buildInstagramUrl(store.ownerHandle);
                    if (ig) window.open(ig, "_blank", "noopener,noreferrer");
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
          <p className="eyebrow mb-3">Checkout</p>
          <h1 className="display-l text-ink text-balance">
            Pay via UPI
          </h1>
          <p className="mt-4 max-w-md text-[14.5px] text-ink/60">
            Scan the QR with any UPI app, or pick your preferred app below.
            {otpStage === "verified" ? (
              <span className="block mt-1 text-vermillion">
                Phone verified — your order is auto-confirmed after payment.
              </span>
            ) : (
              <span className="block mt-1">
                Verify your phone first for instant confirmation.
              </span>
            )}
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

          {/* Pay-with app picker */}
          <div className="mt-8">
            <p className="eyebrow-ink mb-3">Pay with</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {paymentApps.map((app) => (
                <a
                  key={app.id}
                  href={app.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-14 items-center justify-center rounded-xl border border-ink/10 bg-white text-[12.5px] font-semibold text-ink transition-all hover:border-vermillion hover:text-vermillion active:scale-[0.98]"
                >
                  {app.label}
                </a>
              ))}
            </div>
            <a
              href={universalUpi}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block text-center text-[12px] text-ink/55 underline-offset-2 hover:text-ink hover:underline"
            >
              Or open any UPI app
            </a>
          </div>

          <hr className="my-12 border-ink/10" />

          <p className="eyebrow mb-3">Your details</p>
          <h2 className="display-m text-ink text-balance">Where should we ship?</h2>

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
              <Field
                label="Phone"
                error={errors.phone?.message}
                hint="We'll text a verification code here."
              >
                <Input
                  {...register("phone")}
                  placeholder="10-digit number"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </Field>
            </div>

            {/* Phone OTP verification */}
            <div className="rounded-2xl border border-ink/10 bg-bone p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck
                  className={cn(
                    "h-4 w-4",
                    otpStage === "verified"
                      ? "text-vermillion"
                      : "text-ink/45",
                  )}
                />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
                  Phone verification
                </p>
              </div>

              {otpStage === "idle" && (
                <Button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpStage !== "idle"}
                  variant="outline"
                  className="w-full"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Send verification code
                </Button>
              )}

              {otpStage === "sending" && (
                <Button type="button" variant="outline" disabled className="w-full">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Sending code…
                </Button>
              )}

              {(otpStage === "sent" || otpStage === "verifying") && (
                <form onSubmit={handleVerifyOtp} className="space-y-2">
                  <p className="text-[12.5px] text-ink/60">
                    Code sent to {watchedPhone}.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) =>
                        setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="6-digit code"
                      className="text-center font-mono text-[16px] tracking-[0.4em]"
                      disabled={otpStage === "verifying"}
                      autoFocus
                    />
                    <Button
                      type="submit"
                      variant="vermillion"
                      disabled={otpStage === "verifying" || otpCode.length !== 6}
                    >
                      {otpStage === "verifying" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  </div>
                  {otpDevCode && (
                    <button
                      type="button"
                      onClick={handleUseDevCode}
                      className="text-[11px] text-vermillion underline-offset-2 hover:underline"
                    >
                      Dev: use code {otpDevCode}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={otpStage === "verifying"}
                    className="block text-[11.5px] text-ink/55 hover:text-ink"
                  >
                    Send a new code
                  </button>
                </form>
              )}

              {otpStage === "verified" && (
                <div className="flex items-center gap-2 text-[13px] text-vermillion">
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                  <span>Phone verified · {otpProviderId}</span>
                </div>
              )}

              {otpError && (
                <p className="mt-2 text-[12px] text-vermillion">{otpError}</p>
              )}
            </div>

            <Field label="Email (optional)" error={errors.email?.message}>
              <Input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Field>
            <Field
              label="Shipping address"
              error={errors.address?.message}
            >
              <Textarea
                {...register("address")}
                placeholder="House, street, city, pincode"
              />
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
                      <p className="text-[12px] text-ink/50">Qty {line.qty}</p>
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
                  <dd className="tabular-nums">
                    −{formatINR(discountAmount)}
                  </dd>
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
                  discountAmount > 0 && "text-vermillion",
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
              {otpStage === "verified"
                ? "Phone-verified · order auto-confirmed."
                : "Verify phone to auto-confirm your order, or the seller will confirm manually."}
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
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
        {label}
      </span>
      {children}
      {hint && !error && (
        <span className="mt-1.5 block text-[11.5px] text-ink/45">{hint}</span>
      )}
      {error && (
        <span className="mt-1.5 block text-[12px] text-vermillion">
          {error}
        </span>
      )}
    </label>
  );
}