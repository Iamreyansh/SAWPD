import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/types/applications";

const styles: Record<ApplicationStatus, string> = {
  pending: "bg-ink/[0.06] text-ink/70",
  approved: "bg-vermillion/10 text-vermillion",
  rejected: "bg-ink/[0.04] text-ink/40 line-through",
};

const labels: Record<ApplicationStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus;
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
