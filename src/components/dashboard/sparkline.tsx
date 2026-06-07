import { cn } from "@/lib/utils";

type Point = { x: number; y: number };

function buildPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y}`;
  }
  return points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");
}

function buildSmoothPath(points: Point[]): string {
  if (points.length < 2) return buildPath(points);
  const first = points[0];
  let d = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const mx = (p0.x + p1.x) / 2;
    d += ` C ${mx.toFixed(2)} ${p0.y.toFixed(2)}, ${mx.toFixed(2)} ${p1.y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }
  return d;
}

export function Sparkline({
  values,
  width = 360,
  height = 96,
  ariaLabel,
  className,
  stroke = "var(--ink, #111111)",
  fill = "var(--ink, #111111)",
}: {
  values: number[];
  width?: number;
  height?: number;
  ariaLabel?: string;
  className?: string;
  stroke?: string;
  fill?: string;
}) {
  if (values.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-[12px] text-ink/40",
          className
        )}
        style={{ height }}
      >
        No data yet
      </div>
    );
  }

  const padX = 2;
  const padY = 8;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);
  const stepX = values.length > 1 ? innerW / (values.length - 1) : 0;
  const points: Point[] = values.map((v, i) => {
    const x = padX + i * stepX;
    const y = padY + innerH - ((v - min) / range) * innerH;
    return { x, y };
  });

  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${(height - padY).toFixed(2)} L ${points[0].x.toFixed(2)} ${(height - padY).toFixed(2)} Z`;

  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("h-24 w-full", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.18" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkline-fill)" />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {last && (
        <circle
          cx={last.x}
          cy={last.y}
          r="3"
          fill={stroke}
        />
      )}
    </svg>
  );
}

export function buildDailyRevenue(
  orders: { total: number; createdAt: string; status: string }[],
  days = 30,
  now = new Date()
): number[] {
  const soldStatuses = new Set(["verified", "shipped", "completed"]);
  const buckets: number[] = new Array(days).fill(0);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const startMs = start.getTime();
  for (const o of orders) {
    if (!soldStatuses.has(o.status)) continue;
    const t = new Date(o.createdAt).getTime();
    const idx = Math.floor((t - startMs) / (24 * 60 * 60 * 1000));
    if (idx >= 0 && idx < days) {
      buckets[idx] += o.total;
    }
  }
  return buckets;
}
