import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Order } from "@/types/seller";

const DATA_DIR = path.join(process.cwd(), "data");
const RETURNS_FILE = path.join(DATA_DIR, "returns.json");

export type ReturnStatus = "pending" | "approved" | "rejected" | "refunded";

export type ReturnRequest = {
  id: string;
  storeSlug: string;
  orderId: string;
  productId: string;
  productTitle: string;
  qty: number;
  amountInr: number;
  reason: string;
  customerName: string;
  customerPhone: string;
  status: ReturnStatus;
  requestedAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  refundAmount: number | null;
};

async function ensureFile(file: string, fallback: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, JSON.stringify(fallback, null, 2), "utf-8");
  }
}

async function readAll(): Promise<ReturnRequest[]> {
  await ensureFile(RETURNS_FILE, []);
  const raw = await fs.readFile(RETURNS_FILE, "utf-8");
  try {
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr as ReturnRequest[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(items: ReturnRequest[]): Promise<void> {
  await fs.writeFile(RETURNS_FILE, JSON.stringify(items, null, 2), "utf-8");
}

export async function listReturnsForStore(
  storeSlug: string
): Promise<ReturnRequest[]> {
  const all = await readAll();
  return all
    .filter((r) => r.storeSlug === storeSlug)
    .sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
}

export async function listReturnsForOrder(
  orderId: string
): Promise<ReturnRequest[]> {
  const all = await readAll();
  return all
    .filter((r) => r.orderId === orderId)
    .sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
}

export async function getReturn(id: string): Promise<ReturnRequest | null> {
  const all = await readAll();
  return all.find((r) => r.id === id) ?? null;
}

export type CreateReturnInput = {
  storeSlug: string;
  orderId: string;
  productId: string;
  productTitle: string;
  qty: number;
  amountInr: number;
  reason: string;
  customerName: string;
  customerPhone: string;
};

export async function addReturn(
  input: CreateReturnInput
): Promise<ReturnRequest> {
  const all = await readAll();
  const req: ReturnRequest = {
    id: `ret_${randomUUID().slice(0, 8)}`,
    storeSlug: input.storeSlug,
    orderId: input.orderId,
    productId: input.productId,
    productTitle: input.productTitle,
    qty: input.qty,
    amountInr: input.amountInr,
    reason: input.reason.trim(),
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    status: "pending",
    requestedAt: new Date().toISOString(),
    decidedAt: null,
    decisionNote: null,
    refundAmount: null,
  };
  all.unshift(req);
  await writeAll(all);
  return req;
}

export type UpdateReturnDecisionInput = {
  id: string;
  status: "approved" | "rejected" | "refunded";
  note?: string;
  refundAmount?: number;
};

export async function updateReturnStatus(
  input: UpdateReturnDecisionInput
): Promise<ReturnRequest | null> {
  const all = await readAll();
  const idx = all.findIndex((r) => r.id === input.id);
  if (idx === -1) return null;
  const next: ReturnRequest = {
    ...all[idx],
    status: input.status,
    decidedAt: new Date().toISOString(),
    decisionNote: input.note?.trim() || all[idx].decisionNote || null,
    refundAmount:
      input.status === "refunded"
        ? input.refundAmount ?? all[idx].amountInr
        : input.refundAmount ?? all[idx].refundAmount,
  };
  all[idx] = next;
  await writeAll(all);
  return next;
}

export type ReturnEligibility = {
  eligible: boolean;
  reason?:
    | "policy_disabled"
    | "outside_window"
    | "order_not_deliverable"
    | "phone_mismatch"
    | "no_policy";
  daysLeft?: number;
  policy: {
    enabled: boolean;
    windowDays: number;
    mode: "any" | "defective_only";
  } | null;
};

export type CheckReturnEligibilityArgs = {
  order: Order;
  customerPhoneLast7: string;
  now?: Date;
  policy?: {
    enabled: boolean;
    windowDays: number;
    mode: "any" | "defective_only";
  } | null;
};

/**
 * Whether the customer with the last-7 phone digits of `customerPhoneLast7`
 * is allowed to file a return for `order`, given the store's policy and
 * current time.
 */
export function checkReturnEligibility(
  args: CheckReturnEligibilityArgs
): ReturnEligibility {
  const { order, customerPhoneLast7, now = new Date() } = args;
  const policy = args.policy ?? null;
  if (!policy || !policy.enabled) {
    return { eligible: false, reason: policy ? "policy_disabled" : "no_policy", policy };
  }
  // Only delivered / completed orders are returnable.
  if (
    order.status !== "shipped" &&
    order.status !== "completed"
  ) {
    return { eligible: false, reason: "order_not_deliverable", policy };
  }
  // Phone match: at least 7 shared trailing digits between the order's stored
  // phone and the submitted `customerPhoneLast7`. Same leniency the track
  // page uses — country-code prefixes are tolerated.
  const stored = (order.customer?.phone || "").replace(/\D/g, "");
  const submitted = (customerPhoneLast7 || "").replace(/\D/g, "");
  const min = 7;
  if (stored.length < min || submitted.length < min) {
    return { eligible: false, reason: "phone_mismatch", policy };
  }
  const okMatch =
    stored.endsWith(submitted.slice(-min)) ||
    submitted.endsWith(stored.slice(-min));
  if (!okMatch) {
    return { eligible: false, reason: "phone_mismatch", policy };
  }
  // Window: from `createdAt` + windowDays.
  const created = new Date(order.createdAt).getTime();
  const deadline = created + policy.windowDays * 24 * 60 * 60 * 1000;
  if (now.getTime() > deadline) {
    return { eligible: false, reason: "outside_window", policy };
  }
  const daysLeft = Math.max(
    0,
    Math.ceil((deadline - now.getTime()) / (24 * 60 * 60 * 1000))
  );
  return { eligible: true, policy, daysLeft };
}
