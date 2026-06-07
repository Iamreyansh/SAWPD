import { Check, X, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type Cell = "yes" | "no" | "partial";

type Row = {
  feature: string;
  ours: Cell;
  shopify: Cell;
  linktree: Cell;
  selar: Cell;
};

const rows: Row[] = [
  {
    feature: "Per-sale commission",
    ours: "no",
    shopify: "yes",
    linktree: "no",
    selar: "yes",
  },
  {
    feature: "Flat subscription model",
    ours: "yes",
    shopify: "no",
    linktree: "partial",
    selar: "no",
  },
  {
    feature: "Native UPI / QR payments",
    ours: "yes",
    shopify: "partial",
    linktree: "no",
    selar: "no",
  },
  {
    feature: "You own your customer list",
    ours: "yes",
    shopify: "partial",
    linktree: "no",
    selar: "yes",
  },
  {
    feature: "Built for mobile checkout",
    ours: "yes",
    shopify: "partial",
    linktree: "yes",
    selar: "partial",
  },
  {
    feature: "Order dashboard",
    ours: "yes",
    shopify: "yes",
    linktree: "no",
    selar: "yes",
  },
  {
    feature: "Hand-reviewed creators",
    ours: "yes",
    shopify: "no",
    linktree: "no",
    selar: "no",
  },
];

const cols: { id: string; label: string; highlight: boolean }[] = [
  { id: "ours", label: "SAWPD", highlight: true },
  { id: "shopify", label: "Shopify Lite", highlight: false },
  { id: "linktree", label: "linktr.ee", highlight: false },
  { id: "selar", label: "Selar", highlight: false },
];

const legend: Record<Cell, { icon: typeof Check; label: string; cls: string }> = {
  yes: { icon: Check, label: "Yes", cls: "text-vermillion" },
  no: { icon: X, label: "No", cls: "text-ink/30" },
  partial: { icon: Minus, label: "Partial", cls: "text-ink/55" },
};

export function ComparisonTable() {
  return (
    <section id="compare" className="container-editorial py-24 md:py-32">
      <div className="mb-12 max-w-2xl md:mb-16">
        <p className="eyebrow mb-3">Why SAWPD</p>
        <h2 className="display-l text-ink text-balance">
          How we compare.
          <br />
          <span className="text-ink/30">No asterisks.</span>
        </h2>
        <p className="mt-5 max-w-md text-[15px] text-ink/60">
          Honest apples-to-apples against the platforms creators actually use
          today. We built SAWPD for Instagram sellers; they didn&apos;t.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-bone">
        <table className="w-full min-w-[640px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-ink/10">
              <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/45">
                Feature
              </th>
              {cols.map((c) => (
                <th
                  key={c.id}
                  className={cn(
                    "px-5 py-4 text-[12.5px] font-semibold",
                    c.highlight
                      ? "bg-ink text-bone"
                      : "text-ink/65"
                  )}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/[0.06]">
            {rows.map((r, i) => (
              <tr
                key={r.feature}
                className={cn(
                  "transition-colors hover:bg-ink/[0.02]",
                  i % 2 === 1 && "bg-ink/[0.01]"
                )}
              >
                <td className="px-5 py-4 text-ink/75">{r.feature}</td>
                <td
                  className={cn(
                    "px-5 py-4",
                    cols[0].highlight && "bg-ink/[0.03]"
                  )}
                >
                  <Cell value={r.ours} />
                </td>
                <td className="px-5 py-4">
                  <Cell value={r.shopify} />
                </td>
                <td className="px-5 py-4">
                  <Cell value={r.linktree} />
                </td>
                <td className="px-5 py-4">
                  <Cell value={r.selar} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-2xl text-[12.5px] text-ink/45">
        Competitor data based on publicly listed plans as of June 2026. UPI
        support is what the customer sees — Shopify Lite requires a third-party
        app for QR, and is not included in the Lite plan. A &ldquo;no&rdquo; in the
        per-sale-commission column means the platform does not take a cut on
        each transaction; &ldquo;yes&rdquo; means they do.
      </p>
    </section>
  );
}

function Cell({ value }: { value: Cell }) {
  const { icon: Icon, cls } = legend[value];
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-medium", cls)}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
    </span>
  );
}
