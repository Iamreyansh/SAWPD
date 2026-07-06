"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Tag, Calendar, Users } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  createPromoAction,
  updatePromoAction,
  deletePromoAction,
  generatePromoCodeAction,
} from "@/app/dashboard/actions";
import type { PromoCode, PromoState } from "@/types/seller";

type Props = {
  storeSlug: string;
  promos: PromoCode[];
};

type Filter = "all" | "active" | "paused" | "expired" | "scheduled" | "exhausted";

export function PromotionsClient({ storeSlug, promos }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const close = () => {
    setEditingId(null);
    setCreating(false);
  };

  const editing = editingId
    ? promos.find((p) => p.id === editingId) ?? null
    : null;

  const onDelete = async (id: string, code: string) => {
    if (!confirm(`Delete promo "${code}"? Orders that already used it will keep showing it.`)) return;
    const result = await deletePromoAction(storeSlug, id);
    if (!result.ok) {
      alert(`Couldn't delete "${code}": ${result.error}`);
      return;
    }
    router.refresh();
  };

  const counts = countByState(promos);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Promotions</p>
          <h1 className="display-m text-ink">Discount codes</h1>
        </div>
        <Button
          variant="vermillion"
          size="default"
          onClick={() => setCreating(true)}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Create code
        </Button>
      </header>

      <FilterChips
        current={filter}
        onChange={setFilter}
        counts={counts}
        total={promos.length}
      />

      {promos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 p-12 text-center">
          <p className="text-[15px] text-ink/60">No promo codes yet.</p>
          <p className="mt-1 text-[13px] text-ink/45">
            Create your first code to give customers a reason to buy.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {promos
            .filter((p) => {
              if (filter === "all") return true;
              return getPromoState(p).state === filter;
            })
            .map((promo) => (
              <PromoRow
                key={promo.id}
                promo={promo}
                onEdit={() => setEditingId(promo.id)}
                onDelete={() => onDelete(promo.id, promo.code)}
              />
            ))}
        </ul>
      )}

      <PromoFormSheet
        open={creating || editingId !== null}
        onClose={close}
        storeSlug={storeSlug}
        promo={editing}
      />
    </div>
  );
}

function FilterChips({
  current,
  onChange,
  counts,
  total,
}: {
  current: Filter;
  onChange: (f: Filter) => void;
  counts: Record<PromoState, number>;
  total: number;
}) {
  const chips: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "All", count: total },
    { id: "active", label: "Active", count: counts.active },
    { id: "scheduled", label: "Scheduled", count: counts.scheduled },
    { id: "paused", label: "Paused", count: counts.paused },
    { id: "expired", label: "Expired", count: counts.expired },
    { id: "exhausted", label: "Exhausted", count: counts.exhausted },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          className={cn(
            "rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
            current === c.id
              ? "bg-ink text-bone"
              : "border border-ink/10 bg-bone text-ink/65 hover:text-ink"
          )}
        >
          {c.label}{" "}
          <span
            className={cn(
              "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
              current === c.id
                ? "bg-bone/15 text-bone"
                : "bg-ink/5 text-ink/55"
            )}
          >
            {c.count}
          </span>
        </button>
      ))}
    </div>
  );
}

function countByState(promos: PromoCode[]): Record<PromoState, number> {
  const out: Record<PromoState, number> = {
    active: 0,
    paused: 0,
    scheduled: 0,
    expired: 0,
    exhausted: 0,
  };
  for (const p of promos) {
    out[getPromoState(p).state] += 1;
  }
  return out;
}

function getPromoState(promo: PromoCode): { state: PromoState } {
  if (promo.status === "paused") return { state: "paused" };
  if (promo.usageLimit != null && promo.usageCount >= promo.usageLimit) {
    return { state: "exhausted" };
  }
  const now = new Date();
  if (promo.startsAt && new Date(promo.startsAt) > now) {
    return { state: "scheduled" };
  }
  if (promo.expiresAt && new Date(promo.expiresAt) < now) {
    return { state: "expired" };
  }
  return { state: "active" };
}

function formatDate(s?: string): string {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function PromoRow({
  promo,
  onEdit,
  onDelete,
}: {
  promo: PromoCode;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { state } = getPromoState(promo);
  const valueText =
    promo.type === "percent" ? `${promo.value}% off` : `₹${promo.value} off`;
  const usagePct =
    promo.usageLimit != null
      ? Math.min(100, Math.round((promo.usageCount / promo.usageLimit) * 100))
      : null;

  return (
    <li className="rounded-2xl border border-ink/10 bg-bone p-4 transition-all hover:border-ink/20">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-vermillion/10 text-vermillion">
          <Tag className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[15px] font-bold tracking-[0.04em] text-ink">
              {promo.code}
            </p>
            <StateBadge state={state} />
          </div>
          {promo.description && (
            <p className="mt-1 text-[13px] text-ink/60">{promo.description}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-ink/55">
            <span className="font-semibold text-ink">{valueText}</span>
            {promo.minOrderAmount != null && (
              <span>Min ₹{promo.minOrderAmount}</span>
            )}
            {promo.usageLimit != null ? (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3 w-3" strokeWidth={2} />
                {promo.usageCount} / {promo.usageLimit}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3 w-3" strokeWidth={2} />
                {promo.usageCount} used
              </span>
            )}
            {(promo.startsAt || promo.expiresAt) && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3 w-3" strokeWidth={2} />
                {promo.startsAt ? formatDate(promo.startsAt) : "Always"} →{" "}
                {promo.expiresAt ? formatDate(promo.expiresAt) : "No end"}
              </span>
            )}
          </div>
          {usagePct != null && (
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink/[0.06]">
              <div
                className={cn(
                  "h-full transition-all",
                  usagePct >= 90 ? "bg-vermillion" : "bg-ink"
                )}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          )}
        </div>
        <div className="flex flex-shrink-0 gap-1">
          <button
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink/55 transition-colors hover:bg-ink/[0.06] hover:text-ink"
            aria-label={`Edit ${promo.code}`}
          >
            <Pencil className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink/55 transition-colors hover:bg-vermillion/10 hover:text-vermillion"
            aria-label={`Delete ${promo.code}`}
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </li>
  );
}

function StateBadge({ state }: { state: PromoState }) {
  const map: Record<PromoState, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-ink text-bone" },
    paused: { label: "Paused", className: "bg-ink/10 text-ink/65" },
    scheduled: { label: "Scheduled", className: "bg-vermillion/10 text-vermillion" },
    expired: { label: "Expired", className: "bg-ink/5 text-ink/45 line-through" },
    exhausted: { label: "Exhausted", className: "bg-ink/5 text-ink/45" },
  };
  const { label, className } = map[state];
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em]",
        className
      )}
    >
      {label}
    </span>
  );
}

function PromoFormSheet({
  open,
  onClose,
  storeSlug,
  promo,
}: {
  open: boolean;
  onClose: () => void;
  storeSlug: string;
  promo: PromoCode | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [code, setCode] = useState(promo?.code ?? "");
  const [description, setDescription] = useState(promo?.description ?? "");
  const [type, setType] = useState<"percent" | "fixed">(promo?.type ?? "percent");
  const [value, setValue] = useState<string>(String(promo?.value ?? ""));
  const [minOrder, setMinOrder] = useState<string>(
    promo?.minOrderAmount != null ? String(promo.minOrderAmount) : ""
  );
  const [usageLimit, setUsageLimit] = useState<string>(
    promo?.usageLimit != null ? String(promo.usageLimit) : ""
  );
  const [startsAt, setStartsAt] = useState(
    promo?.startsAt ? promo.startsAt.slice(0, 10) : ""
  );
  const [expiresAt, setExpiresAt] = useState(
    promo?.expiresAt ? promo.expiresAt.slice(0, 10) : ""
  );
  const [status, setStatus] = useState<"active" | "paused">(
    promo?.status ?? "active"
  );

  const resetForm = () => {
    if (promo) {
      setCode(promo.code);
      setDescription(promo.description ?? "");
      setType(promo.type);
      setValue(String(promo.value));
      setMinOrder(promo.minOrderAmount != null ? String(promo.minOrderAmount) : "");
      setUsageLimit(promo.usageLimit != null ? String(promo.usageLimit) : "");
      setStartsAt(promo.startsAt ? promo.startsAt.slice(0, 10) : "");
      setExpiresAt(promo.expiresAt ? promo.expiresAt.slice(0, 10) : "");
      setStatus(promo.status);
    } else {
      setCode("");
      setDescription("");
      setType("percent");
      setValue("");
      setMinOrder("");
      setUsageLimit("");
      setStartsAt("");
      setExpiresAt("");
      setStatus("active");
    }
    setError(null);
    setFieldErrors({});
  };

  // Reset on open / promo change
  useEffect(() => {
    if (open) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, promo?.id]);

  const generate = async () => {
    const c = await generatePromoCodeAction();
    setCode(c);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const payload = {
      code,
      description,
      type,
      value,
      minOrderAmount: minOrder || undefined,
      usageLimit: usageLimit || undefined,
      startsAt: startsAt || "",
      expiresAt: expiresAt || "",
      status,
    };
    startTransition(async () => {
      const result = promo
        ? await updatePromoAction(storeSlug, promo.id, payload)
        : await createPromoAction(storeSlug, payload);
      if (result.ok) {
        onClose();
      } else {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="bg-bone sm:max-w-md"
        showClose
      >
        <SheetHeader>
          <SheetTitle>{promo ? "Edit code" : "New code"}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
                  Code
                </span>
                <div className="flex gap-2">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="SUMMER20"
                    className="flex-1 font-mono tracking-[0.04em]"
                    maxLength={24}
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    onClick={generate}
                    disabled={pending}
                  >
                    Generate
                  </Button>
                </div>
                {fieldErrors.code && (
                  <span className="mt-1.5 block text-[12px] text-vermillion">
                    {fieldErrors.code}
                  </span>
                )}
              </label>
            </div>

            <div>
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
                  Description (optional)
                </span>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Launch week special"
                  maxLength={120}
                />
              </label>
            </div>

            <div>
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
                Discount
              </span>
              <div className="flex gap-2">
                <div className="flex rounded-xl border border-ink/10 bg-bone p-1">
                  <button
                    type="button"
                    onClick={() => setType("percent")}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                      type === "percent"
                        ? "bg-ink text-bone"
                        : "text-ink/65 hover:text-ink"
                    )}
                  >
                    Percent
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("fixed")}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                      type === "fixed"
                        ? "bg-ink text-bone"
                        : "text-ink/65 hover:text-ink"
                    )}
                  >
                    Fixed ₹
                  </button>
                </div>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={type === "percent" ? "20" : "200"}
                    min={1}
                    max={type === "percent" ? 100 : undefined}
                    inputMode="numeric"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-ink/45">
                    {type === "percent" ? "%" : "₹"}
                  </span>
                </div>
              </div>
              {fieldErrors.value && (
                <span className="mt-1.5 block text-[12px] text-vermillion">
                  {fieldErrors.value}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
                  Min order (optional)
                </span>
                <Input
                  type="number"
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                  placeholder="0"
                  min={0}
                  inputMode="numeric"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
                  Usage limit (optional)
                </span>
                <Input
                  type="number"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  placeholder="Unlimited"
                  min={1}
                  inputMode="numeric"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
                  Starts (optional)
                </span>
                <Input
                  type="date"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
                  Expires (optional)
                </span>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
                {fieldErrors.expiresAt && (
                  <span className="mt-1.5 block text-[12px] text-vermillion">
                    {fieldErrors.expiresAt}
                  </span>
                )}
              </label>
            </div>

            <div>
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
                Status
              </span>
              <div className="flex gap-2">
                {(["active", "paused"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn(
                      "flex-1 rounded-xl border px-3 py-2 text-[13px] font-semibold transition-colors",
                      status === s
                        ? "border-ink bg-ink text-bone"
                        : "border-ink/10 bg-bone text-ink/65 hover:text-ink"
                    )}
                  >
                    {s === "active" ? "Active" : "Paused"}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-vermillion/20 bg-vermillion/5 px-4 py-3 text-[13px] text-vermillion">
                {error}
              </p>
            )}

            <div className="flex gap-2 border-t border-ink/10 pt-5">
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={onClose}
                disabled={pending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="default"
                variant="vermillion"
                disabled={pending || !code || !value}
                className="flex-1"
              >
                {promo ? "Save changes" : "Create code"}
              </Button>
            </div>
          </form>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
