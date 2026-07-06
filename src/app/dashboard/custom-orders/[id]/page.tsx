import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireActiveStore } from "@/lib/seller-auth";
import { getOrder } from "@/lib/custom-orders";
import { getTemplate } from "@/lib/custom-templates";
import { CustomOrderStatusBadge } from "@/components/dashboard/custom-order-status-badge";
import { CustomOrderActions } from "@/components/dashboard/custom-order-actions";
import { formatINR, timeAgo } from "@/lib/utils";
import { ArrowLeft, Phone, Mail, Calendar, FileText, ImageIcon } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return { title: "Order Not Found" };
  return { title: `Custom Order ${order.id}` };
}

export const dynamic = "force-dynamic";

export default async function CustomOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const store = await requireActiveStore();
  if (!store.customOrdersEnabled) {
    redirect("/dashboard/settings?feature=custom_orders");
  }
  const { id } = await params;
  const order = await getOrder(id);

  if (!order || order.storeSlug !== store.slug) {
    notFound();
  }

  const template = await getTemplate(order.templateId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/dashboard/custom-orders"
        className="inline-flex items-center gap-1 text-[12px] text-ink/45 hover:text-ink transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        All custom orders
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Custom Order</p>
          <h1 className="display-s text-ink">{order.templateName}</h1>
          <p className="text-[12px] text-ink/45 mt-1 font-mono">{order.id}</p>
        </div>
        <CustomOrderStatusBadge status={order.status} />
      </div>

      {/* Customer Info */}
      <div className="rounded-2xl border border-ink/10 bg-white p-5 space-y-3">
        <h2 className="text-[13px] font-semibold text-ink">Customer</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-[13px]">
            <Phone className="h-3.5 w-3.5 text-ink/30" />
            <span className="text-ink">{order.customerName}</span>
            <span className="text-ink/40">·</span>
            <span className="text-ink/60">{order.customerPhone}</span>
          </div>
          {order.customerEmail && (
            <div className="flex items-center gap-2 text-[13px]">
              <Mail className="h-3.5 w-3.5 text-ink/30" />
              <span className="text-ink/60">{order.customerEmail}</span>
            </div>
          )}
        </div>
      </div>

      {/* Selections */}
      <div className="rounded-2xl border border-ink/10 bg-white p-5 space-y-4">
        <h2 className="text-[13px] font-semibold text-ink">Order Details</h2>
        <div className="space-y-2">
          {Object.entries(order.selections).map(([fieldId, value]) => {
            const field = template?.fields.find((f) => f.id === fieldId);
            if (!field) return null;
            const displayValue = Array.isArray(value)
              ? value.join(", ")
              : String(value);
            if (
              !displayValue ||
              displayValue === "" ||
              displayValue === "0"
            )
              return null;
            return (
              <div
                key={fieldId}
                className="flex justify-between text-[13px] py-1 border-b border-ink/5 last:border-0"
              >
                <span className="text-ink/55">{field.label}</span>
                <span className="text-ink font-medium">{displayValue}</span>
              </div>
            );
          })}
          {order.preferredDate && (
            <div className="flex justify-between text-[13px] py-1 border-b border-ink/5">
              <span className="text-ink/55 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Preferred Date
              </span>
              <span className="text-ink font-medium">{order.preferredDate}</span>
            </div>
          )}
          {order.quantity > 1 && (
            <div className="flex justify-between text-[13px] py-1 border-b border-ink/5">
              <span className="text-ink/55">Quantity</span>
              <span className="text-ink font-medium">×{order.quantity}</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="rounded-xl bg-ink/[0.03] p-4">
          <div className="flex justify-between">
            <span className="text-[14px] font-semibold text-ink">Total</span>
            <span className="text-[20px] font-bold text-ink tabular-nums">
              {formatINR(order.totalPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Special Instructions */}
      {order.specialInstructions && (
        <div className="rounded-2xl border border-ink/10 bg-white p-5 space-y-2">
          <h2 className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Special Instructions
          </h2>
          <p className="text-[13px] text-ink/70">
            {order.specialInstructions}
          </p>
        </div>
      )}

      {/* Reference Image */}
      {order.referenceImage && (
        <div className="rounded-2xl border border-ink/10 bg-white p-5 space-y-2">
          <h2 className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            Reference Image
          </h2>
          <div className="relative w-40 h-52 rounded-lg overflow-hidden border border-ink/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={order.referenceImage}
              alt="Reference"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Seller Note */}
      {order.sellerNote && (
        <div className="rounded-2xl border border-ink/10 bg-white p-5 space-y-2">
          <h2 className="text-[13px] font-semibold text-ink">Seller Note</h2>
          <p className="text-[13px] text-ink/70">{order.sellerNote}</p>
        </div>
      )}

      {/* Timestamps */}
      <div className="rounded-2xl border border-ink/10 bg-white p-5">
        <h2 className="text-[13px] font-semibold text-ink mb-3">Timeline</h2>
        <div className="space-y-2 text-[12px]">
          <div className="flex justify-between">
            <span className="text-ink/50">Submitted</span>
            <span className="text-ink">{timeAgo(order.createdAt)}</span>
          </div>
          {order.confirmedAt && (
            <div className="flex justify-between">
              <span className="text-ink/50">Confirmed</span>
              <span className="text-ink">{timeAgo(order.confirmedAt)}</span>
            </div>
          )}
          {order.fulfilledAt && (
            <div className="flex justify-between">
              <span className="text-ink/50">Fulfilled</span>
              <span className="text-ink">{timeAgo(order.fulfilledAt)}</span>
            </div>
          )}
          {order.rejectedAt && (
            <div className="flex justify-between">
              <span className="text-ink/50">Rejected</span>
              <span className="text-ink">{timeAgo(order.rejectedAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <CustomOrderActions orderId={order.id} status={order.status} />
    </div>
  );
}