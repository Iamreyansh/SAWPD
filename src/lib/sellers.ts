import "server-only";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import type { PublicSeller, Seller } from "@/types/seller";
import { createAdminClient } from "@/lib/supabase/admin";

const BCRYPT_ROUNDS = 10;
const SELLER_ID_PREFIX = "sel_";

function toPublic(s: Seller): PublicSeller {
  return { id: s.id, email: s.email, createdAt: s.createdAt };
}

function rowToSeller(row: Record<string, unknown>): Seller {
  return {
    id: row.id as string,
    email: row.email as string,
    passwordHash: row.password_hash as string,
    createdAt: row.created_at as string,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function findSellerByEmail(
  email: string,
): Promise<Seller | null> {
  const norm = normalizeEmail(email);
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("sellers")
    .select("*")
    .eq("email", norm)
    .single();
  if (error || !data) return null;
  return rowToSeller(data);
}

export async function findSellerById(id: string): Promise<Seller | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("sellers")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return rowToSeller(data);
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

  const sb = createAdminClient();
  const { error } = await sb.from("sellers").insert({
    id: seller.id,
    email: seller.email,
    password_hash: seller.passwordHash,
    created_at: seller.createdAt,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "email_taken" };
    throw error;
  }

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
