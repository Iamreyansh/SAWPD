import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Tag, MessageCircle, ShieldCheck, ShieldAlert, ImageOff } from "lucide-react";
import { requireSeller } from "@/lib/seller-auth";
import { getActiveStoreForSeller, getStoresForSeller } from "@/lib/store";
import { getOrder } from "@/lib/orders";
import { listReturnsForOrder } from "@/lib/returns";
import { formatINR, cn } from "@/lib/utils";
import { buildWhatsAppLink, ownerContactMessage } from "@/lib/whatsapp";
import { OrderStatusBadge } from "@/components/dashboard/order-status-badge";
import { OrderActionPanel } from "./order-action-panel";
import { OrderReturnsPanel } from "./order-returns-panel";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title: `Order ${id} · Dashboard`,
    description:
      "View order details, verify payment, mark shipped, and manage returns.",
  };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const seller = await requireSeller();
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const sellerStores = await getStoresForSeller(seller.id);
  const ownedSlugs = new Set(sellerStores.map((s) => s.slug));
  if (!ownedSlugs.has(order.storeSlug)) notFound();
  const store = await getActiveStoreForSeller(seller.id, order.storeSlug);
  if (!store) notFound();
  const returns = await listReturnsForOrder(order.id);

  const customerWhatsApp = buildWhatsAppLink(
    order.customer.phone,
    ownerContactMessage({
      storeName: store.name,
      orderId: order.id,
      customerName: order.customer.name,
      intent: "question",
    })
  );

  const c = order.customer;
  const check = order.paymentScreenshot;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link
          href="/dashboard/orders"
          className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-ink/50 transition-colors hover:text-ink"
        >
          ← All orders
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="display-m text-ink">
            {order.lines.map((l) => l.title).join(", ")}
          </h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-2 text-[14px] text-ink/60">
          {c.name} ·{" "}
          <a href={`tel:${c.phone}`} className="hover:underline">
            {c.phone}
          </a>
          {c.email && (
            <>
              {" · "}
              <a href={`mailto:${c.email}`} className="hover:underline">
                {c.email}
              </a>
            </>
          )}
        </p>
        {customerWhatsApp && (
          <a
            href={customerWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#1DAB55]"
          >
            <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.25} />
            Chat with {c.name.split(" ")[0]} on WhatsApp
          </a>
        )}
      </div>

      <section className="rounded-2xl border border-ink/10 bg-bone p-6">
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.18em] text-ink/60">
          Items
        </h2>
        <ul className="mt-3 divide-y divide-ink/5">
          {order.lines.map((l) => (
            <li
              key={l.productId + l.title}
              className="flex items-center gap-4 py-3"
            >
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-ink/[0.04]">
                <Image
                  src={l.imageUrl}
                  alt={l.title}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-semibold text-ink">
                  {l.title}
                </p>
                <p className="text-[12.5px] text-ink/55">
                  Qty {l.qty} · {formatINR(l.price)}
                </p>
              </div>
              <p className="text-[14.5px] font-semibold tabular-nums text-ink">
                {formatINR(l.price * l.qty)}
              </p>
            </li>
          ))}
        </ul>
        <hr className="my-4 border-ink/10" />
        {order.subtotal != null && order.discountAmount != null && order.discountAmount > 0 ? (
          <dl className="space-y-1.5 text-[14px] text-ink/60">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular-nums text-ink">{formatINR(order.subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between text-vermillion">
              <dt className="inline-flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" strokeWidth={2} />
                <span className="font-mono font-bold tracking-[0.04em]">
                  {order.promoCode}
                </span>
              </dt>
              <dd className="tabular-nums">−{formatINR(order.discountAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Shipping</dt>
              <dd className="text-ink/50">Calculated by seller</dd>
            </div>
          </dl>
        ) : null}
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-[14px] text-ink/60">Total</span>
          <span
            className={`text-2xl font-bold tabular-nums tracking-[-0.02em] ${
              order.discountAmount ? "text-vermillion" : "text-ink"
            }`}
          >
            {formatINR(order.total)}
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-bone p-6">
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.18em] text-ink/60">
          Shipping address
        </h2>
        <p className="mt-3 whitespace-pre-line text-[14.5px] leading-relaxed text-ink">
          {c.name}
          {"\n"}
          {c.address}
          {"\n"}
          {c.phone}
          {c.email && `\n${c.email}`}
        </p>
      </section>

      {order.screenshotDataUrl && (
        <section className="rounded-2xl border border-ink/10 bg-bone p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-[14px] font-semibold uppercase tracking-[0.18em] text-ink/60">
              Payment screenshot
            </h2>
            {check && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.15em]",
                  check.valid
                    ? "bg-ink/[0.06] text-ink"
                    : "bg-vermillion/10 text-vermillion"
                )}
              >
                {check.valid ? (
                  <ShieldCheck className="h-3 w-3" strokeWidth={2.5} />
                ) : (
                  <ShieldAlert className="h-3 w-3" strokeWidth={2.5} />
                )}
                {check.valid ? "Auto-check passed" : "Auto-check failed"}
              </span>
            )}
          </div>
          {check && (
            <p
              className={cn(
                "mt-2 text-[12.5px]",
                check.valid ? "text-ink/55" : "text-vermillion"
              )}
            >
              {check.reason ??
                `${check.mime ?? "image"} · ~${check.approxKb}KB · format and size look good.`}
            </p>
          )}
          <div className="mt-4 max-w-sm overflow-hidden rounded-xl border border-ink/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={order.screenshotDataUrl}
              alt="Payment screenshot from customer"
              className="h-auto w-full"
            />
          </div>
          <p className="mt-3 text-[12.5px] text-ink/50">
            Verify the amount matches the order total ({formatINR(order.total)}) and
            the UPI ID matches yours before approving.
          </p>
        </section>
      )}

      {!order.screenshotDataUrl && order.status === "awaiting_verification" && (
        <section className="flex items-start gap-3 rounded-2xl border border-vermillion/20 bg-vermillion/[0.04] p-5 text-[13.5px] text-vermillion">
          <ImageOff className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.25} />
          <p>
            No screenshot uploaded. Use <strong>Request resend</strong> below
            to ask the customer to re-upload, or cancel the order.
          </p>
        </section>
      )}

      {order.trackingNote && (
        <section className="rounded-2xl border border-ink/10 bg-bone p-6">
          <h2 className="text-[14px] font-semibold uppercase tracking-[0.18em] text-ink/60">
            Tracking
          </h2>
          <p className="mt-3 text-[14.5px] text-ink">{order.trackingNote}</p>
        </section>
      )}

      <OrderActionPanel
        orderId={order.id}
        currentStatus={order.status}
        hasScreenshot={Boolean(order.screenshotDataUrl)}
      />

      <OrderReturnsPanel returns={returns} />

      <section className="rounded-2xl border border-ink/10 bg-bone p-5 text-[12.5px] text-ink/55">
        <p>
          <span className="text-ink/45">Order ID: </span>
          <span className="tabular-nums text-ink">{order.id}</span>
        </p>
        <p className="mt-1">
          <span className="text-ink/45">Placed: </span>
          <span className="text-ink">
            {new Date(order.createdAt).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        </p>
        {order.verifiedAt && (
          <p className="mt-1">
            <span className="text-ink/45">Verified: </span>
            <span className="text-ink">
              {new Date(order.verifiedAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </p>
        )}
        {order.shippedAt && (
          <p className="mt-1">
            <span className="text-ink/45">Shipped: </span>
            <span className="text-ink">
              {new Date(order.shippedAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </p>
        )}
        {order.completedAt && (
          <p className="mt-1">
            <span className="text-ink/45">Completed: </span>
            <span className="text-ink">
              {new Date(order.completedAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </p>
        )}
      </section>
    </div>
  );
}
