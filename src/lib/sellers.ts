import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import type { PublicSeller, Seller } from "@/types/seller";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "sellers.json");

const BCRYPT_ROUNDS = 10;
const SELLER_ID_PREFIX = "sel_";

async function ensureFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf-8");
  }
}

async function readAll(): Promise<Seller[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Seller[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(sellers: Seller[]): Promise<void> {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(sellers, null, 2), "utf-8");
}

function toPublic(s: Seller): PublicSeller {
  return { id: s.id, email: s.email, createdAt: s.createdAt };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findSellerByEmail(
  email: string,
): Promise<Seller | null> {
  const norm = normalizeEmail(email);
  const all = await readAll();
  return all.find((s) => s.email === norm) ?? null;
}

export async function findSellerById(id: string): Promise<Seller | null> {
  const all = await readAll();
  return all.find((s) => s.id === id) ?? null;
}

export type CreateSellerInput = {
  email: string;
  password: string;
};

export type CreateSellerResult =
  | { ok: true; seller: PublicSeller }
  | { ok: false; error: "email_taken" | "invalid" };

export async function createSeller(
  input: CreateSellerInput,
): Promise<CreateSellerResult> {
  const norm = normalizeEmail(input.email);
  if (!norm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm)) {
    return { ok: false, error: "invalid" };
  }
  if (input.password.length < 8) {
    return { ok: false, error: "invalid" };
  }
  const existing = await findSellerByEmail(norm);
  if (existing) return { ok: false, error: "email_taken" };

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const seller: Seller = {
    id: `${SELLER_ID_PREFIX}${randomUUID().slice(0, 8)}`,
    email: norm,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  const all = await readAll();
  all.push(seller);
  await writeAll(all);
  return { ok: true, seller: toPublic(seller) };
}

export type VerifyPasswordResult =
  | { ok: true; seller: PublicSeller }
  | { ok: false; error: "not_found" | "bad_password" };

export async function verifyPassword(
  email: string,
  password: string,
): Promise<VerifyPasswordResult> {
  const seller = await findSellerByEmail(email);
  if (!seller) return { ok: false, error: "not_found" };
  const match = await bcrypt.compare(password, seller.passwordHash);
  if (!match) return { ok: false, error: "bad_password" };
  return { ok: true, seller: toPublic(seller) };
}
