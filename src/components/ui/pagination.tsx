import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PageItem = number | "ellipsis";

function buildPageItems(current: number, total: number): PageItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const items: PageItem[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) items.push("ellipsis");
  for (let i = left; i <= right; i++) items.push(i);
  if (right < total - 1) items.push("ellipsis");
  items.push(total);
  return items;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  basePath,
  paramName = "page",
  extraParams = {},
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  basePath: string;
  paramName?: string;
  extraParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) {
    return totalItems === 0 ? null : (
      <p className="text-right text-xs text-ink/40">
        Showing {totalItems} of {totalItems}
      </p>
    );
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(extraParams)) {
      if (v) params.set(k, v);
    }
    if (p > 1) params.set(paramName, String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const items = buildPageItems(currentPage, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-ink/40 tabular-nums">
        Showing {start}–{end} of {totalItems}
      </p>
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <Link
          href={hrefFor(Math.max(1, currentPage - 1))}
          aria-disabled={currentPage === 1}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 text-ink/60 transition-colors hover:border-ink/30 hover:text-ink",
            currentPage === 1 && "pointer-events-none opacity-30"
          )}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </Link>
        {items.map((it, i) =>
          it === "ellipsis" ? (
            <span
              key={`e-${i}`}
              className="px-1 text-[12px] text-ink/30"
              aria-hidden
            >
              …
            </span>
          ) : (
            <Link
              key={it}
              href={hrefFor(it)}
              aria-current={it === currentPage ? "page" : undefined}
              className={cn(
                "flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-[12.5px] font-semibold tabular-nums transition-colors",
                it === currentPage
                  ? "bg-ink text-bone"
                  : "text-ink/60 hover:bg-ink/[0.04] hover:text-ink"
              )}
            >
              {it}
            </Link>
          )
        )}
        <Link
          href={hrefFor(Math.min(totalPages, currentPage + 1))}
          aria-disabled={currentPage === totalPages}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 text-ink/60 transition-colors hover:border-ink/30 hover:text-ink",
            currentPage === totalPages && "pointer-events-none opacity-30"
          )}
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </nav>
    </div>
  );
}
