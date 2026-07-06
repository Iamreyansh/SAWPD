"use client";

import { useEffect, useMemo, useState, useTransition, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/storefront";
import type { CardDensity } from "@/lib/themes";
import { ProductCard } from "./product-card";

type Tag = "new" | "limited" | "sold-out" | "sale";

const TAG_FILTERS: { id: Tag | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "limited", label: "Limited" },
  { id: "sale", label: "Sale" },
];

function matchesTag(p: Product, tag: Tag): boolean {
  return Boolean(p.tags?.includes(tag));
}

function matchesQuery(p: Product, q: string): boolean {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return (
    p.title.toLowerCase().includes(needle) ||
    p.tagline.toLowerCase().includes(needle) ||
    p.altText.toLowerCase().includes(needle)
  );
}

export function ProductGrid({
  products,
  density = "comfortable",
}: {
  products: Product[];
  density?: CardDensity;
}) {
  const gridCols =
    density === "compact"
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
      : density === "spacious"
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const active = (params.get("tag") ?? "all") as Tag | "all";
  const urlQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  const visible = useMemo(() => {
    if (active === "all" && !query) return products;
    return products.filter(
      (p) =>
        (active === "all" || matchesTag(p, active as Tag)) &&
        matchesQuery(p, query)
    );
  }, [products, active, query]);

  const writeParams = useCallback((tag: Tag | "all", q: string) => {
    const sp = new URLSearchParams(params.toString());
    if (tag === "all") sp.delete("tag");
    else sp.set("tag", tag);
    if (q) sp.set("q", q);
    else sp.delete("q");
    const qs = sp.toString();
    startTransition(() => {
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    });
  }, [params, router, startTransition]);

  const setTag = useCallback((tag: Tag | "all") => writeParams(tag, query), [writeParams, query]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onQueryChange = useCallback((next: string) => {
    setQuery(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      writeParams(active, next);
    }, 300);
  }, [active, writeParams]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const counts = useMemo(() => {
    const c: Record<Tag | "all", number> = {
      all: products.length,
      new: 0,
      limited: 0,
      "sold-out": 0,
      sale: 0,
    };
    for (const p of products) {
      for (const t of (p.tags ?? []) as Tag[]) {
        if (t in c) c[t] += 1;
      }
    }
    return c;
  }, [products]);

  return (
    <section id="shop" className="container-editorial py-16 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-8 flex flex-col gap-6 md:mb-12 md:flex-row md:items-end md:justify-between"
      >
        <div>
          <p className="eyebrow mb-3">The Edit</p>
          <h2 className="display-l text-ink text-balance">
            All pieces
            <span className="text-ink/30"> · {visible.length}</span>
          </h2>
        </div>
        <p className="hidden text-right text-[12.5px] text-ink/50 md:block">
          Handpicked
          <br />
          Limited runs
        </p>
      </motion.div>

      <div className="mb-6 flex flex-col gap-4 md:mb-10 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {TAG_FILTERS.map((f) => {
            const isActive = active === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setTag(f.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                  isActive
                    ? "bg-ink text-bone"
                    : "border border-ink/10 bg-bone text-ink/65 hover:text-ink"
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                    isActive ? "bg-bone/15 text-bone" : "bg-ink/[0.06] text-ink/55"
                  )}
                >
                  {counts[f.id]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full md:w-72">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
            strokeWidth={2}
          />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search pieces"
            aria-label="Search pieces"
            className="h-10 w-full rounded-full border border-ink/10 bg-bone pl-10 pr-9 text-[13.5px] text-ink placeholder:text-ink/35 outline-none transition-colors focus:border-ink/30"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-ink/50 transition-colors hover:bg-ink/[0.06] hover:text-ink"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.25} />
            </button>
          )}
          {pending && (
            <span className="pointer-events-none absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 animate-pulse rounded-full bg-vermillion" />
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 p-12 text-center">
          <p className="text-[15px] text-ink/60">
            {query
              ? `No pieces match "${query}"${active !== "all" ? ` in ${active}` : ""}.`
              : "No pieces match that filter."}
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              writeParams("all", "");
            }}
            className="mt-3 text-[12.5px] font-semibold text-vermillion underline-offset-4 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className={`grid ${gridCols} gap-x-4 gap-y-12 md:gap-x-5 md:gap-y-14`}>
          {visible.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
