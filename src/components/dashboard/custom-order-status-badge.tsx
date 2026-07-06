import { cn } from "@/lib/utils";
import type { CustomOrderStatus } from "@/types/custom-orders";

type Props = {
  status: CustomOrderStatus;
  className?: string;
};

const STYLE: Record<CustomOrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  awaiting_payment: "bg-amber-100 text-amber-800 border-amber-200",
  awaiting_verification: "bg-blue-100 text-blue-800 border-blue-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  fulfilled: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  expired: "bg-ink/[0.06] text-ink/55 border-ink/10",
  cancelled: "bg-ink/[0.06] text-ink/55 border-ink/10",
};

const LABEL: Record<CustomOrderStatus, string> = {
  pending: "Pending",
  awaiting_payment: "Awaiting Payment",
  awaiting_verification: "Verifying",
  confirmed: "Confirmed",
  fulfilled: "Fulfilled",
  rejected: "Rejected",
  expired: "Expired",
  cancelled: "Cancelled",
};

export function CustomOrderStatusBadge({ status, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em]",
        STYLE[status],
        className,
      )}
    >
      {LABEL[status]}
    </span>
  );
}