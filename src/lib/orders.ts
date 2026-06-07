import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Order, OrderStatus } from "@/types/seller";

const DATA_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

async function ensureFile<T>(file: string, fallback: T): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, JSON.stringify(fallback, null, 2), "utf-8");
  }
}

async function readAll(): Promise<Order[]> {
  await ensureFile(ORDERS_FILE, []);
  const raw = await fs.readFile(ORDERS_FILE, "utf-8");
  try {
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? (arr as Order[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(orders: Order[]): Promise<void> {
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf-8");
}

export async function listOrders(slug: string): Promise<Order[]> {
  const all = await readAll();
  return all
    .filter((o) => o.storeSlug === slug)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getOrder(id: string): Promise<Order | null> {
  const all = await readAll();
  return all.find((o) => o.id === id) ?? null;
}

export type CreateOrderInput = Omit<
  Order,
  "id" | "createdAt" | "status"
> & {
  status?: OrderStatus;
};

export async function addOrder(input: CreateOrderInput): Promise<Order> {
  const all = await readAll();
  const order: Order = {
    ...input,
    id: `ord_${randomUUID().slice(0, 8)}`,
    createdAt: new Date().toISOString(),
    status: input.status ?? "awaiting_verification",
  };
  all.unshift(order);
  await writeAll(all);
  return order;
}

export type OrderStatusUpdate = {
  status: OrderStatus;
  trackingNote?: string;
};

export async function updateOrderStatus(
  id: string,
  patch: OrderStatusUpdate
): Promise<Order | null> {
  const all = await readAll();
  const idx = all.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  const updated: Order = {
    ...all[idx],
    status: patch.status,
    trackingNote: patch.trackingNote ?? all[idx].trackingNote,
    resendRequestedAt:
      patch.status === "awaiting_payment" ? now : all[idx].resendRequestedAt,
    verifiedAt:
      patch.status === "verified" ? now : all[idx].verifiedAt,
    shippedAt: patch.status === "shipped" ? now : all[idx].shippedAt,
    completedAt:
      patch.status === "completed" ? now : all[idx].completedAt,
    cancelledAt:
      patch.status === "cancelled" ? now : all[idx].cancelledAt,
  };
  all[idx] = updated;
  await writeAll(all);
  return updated;
}
