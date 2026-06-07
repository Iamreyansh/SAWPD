// scripts/mint-seller-cookie.mjs
// Usage: node scripts/mint-seller-cookie.mjs <sellerId>
// Prints a valid `sawpd_seller` cookie value for the given seller id.
// Uses the same HMAC-SHA256 scheme as src/lib/seller-auth.ts.
//
// Reads ADMIN_SECRET from .env.local.

import { readFileSync } from "fs";
import { createHmac } from "crypto";
import path from "path";

const env = readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
const ADMIN_SECRET = env
  .split("\n")
  .map((l) => l.trim())
  .find((l) => l.startsWith("ADMIN_SECRET="))
  ?.slice("ADMIN_SECRET=".length);
if (!ADMIN_SECRET) {
  console.error("No ADMIN_SECRET in .env.local");
  process.exit(1);
}

const sellerId = process.argv[2];
if (!sellerId) {
  console.error("Usage: node scripts/mint-seller-cookie.mjs <sellerId>");
  process.exit(1);
}

const version = "v1";
const value = `${version}.${sellerId}`;
const sig = createHmac("sha256", ADMIN_SECRET).update(value).digest("hex");
console.log(`${value}.${sig}`);
