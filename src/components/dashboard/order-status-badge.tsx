import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/seller";

const styles: Record<OrderStatus, string> = {
  awaiting_payment: "bg-ink/[0.06] text-ink/60",
  awaiting_verification: "bg-vermillion/10 text-vermillion",
  verified: "bg-ink/[0.85] text-bone",
  shipped: "bg-ink/[0.06] text-ink",
  completed: "bg-ink/[0.04] text-ink/55",
  cancelled: "bg-ink/[0.04] text-ink/35 line-through",
};

const labels: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  awaiting_verification: "Verify payment",
  verified: "Verified",
  shipped: "Shipped",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.15em]",
        styles[status],
        className
      )}
    >
      {labels[status]}
    </span>
  );
}
