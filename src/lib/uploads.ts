import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_BYTES = 5 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type UploadResult =
  | { ok: true; url: string; filename: string }
  | { ok: false; error: string };

export async function uploadProductImage(file: File): Promise<UploadResult> {
  if (!(file instanceof File)) {
    return { ok: false, error: "No file received." };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return { ok: false, error: "Use a JPEG, PNG, WebP, or GIF." };
  }
  if (file.size === 0) {
    return { ok: false, error: "That file is empty." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Max file size is 5MB." };
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = EXT_BY_MIME[file.type] ?? "bin";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);
  return { ok: true, url: `/uploads/${filename}`, filename };
}

function isLocalUpload(url: string): boolean {
  return url.startsWith("/uploads/");
}

export async function deleteUploadIfLocal(url: string): Promise<void> {
  if (!isLocalUpload(url)) return;
  const filename = url.slice("/uploads/".length);
  if (!filename || filename.includes("..") || filename.includes("/")) return;
  const filepath = path.join(UPLOAD_DIR, filename);
  try {
    await unlink(filepath);
  } catch {
    // File may already be gone — fine.
  }
}
