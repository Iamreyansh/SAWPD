import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "product-images";

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

// Magic byte signatures for image format verification
const MAGIC_BYTES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/gif": [[0x47, 0x49, 0x46, 0x38]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header (first 4 bytes)
};

function matchesMagicBytes(buffer: Uint8Array, mimeType: string): boolean {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return true; // No signature to check
  return signatures.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte)
  );
}

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

  const buffer = new Uint8Array(await file.arrayBuffer());

  // Verify magic bytes match declared MIME type
  if (!matchesMagicBytes(buffer, file.type)) {
    return { ok: false, error: "File content doesn't match the declared type. Upload the actual image file." };
  }

  const ext = EXT_BY_MIME[file.type] ?? "bin";
  const filename = `${crypto.randomUUID()}.${ext}`;

  const sb = createAdminClient();
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType: file.type });
  if (error) return { ok: false, error: error.message };

  const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(filename);
  return { ok: true, url: urlData.publicUrl, filename };
}

export async function uploadHeroImage(file: File): Promise<UploadResult> {
  return uploadProductImage(file);
}

function isSupabaseUpload(url: string): boolean {
  return url.includes(".supabase.co/storage/v1/object/public/");
}

function extractFilename(url: string): string | null {
  // Extract filename from Supabase storage URL
  const match = url.match(/\/object\/public\/[^/]+\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function deleteUploadIfLocal(url: string): Promise<void> {
  if (!isSupabaseUpload(url)) return;
  const filename = extractFilename(url);
  if (!filename) return;
  const sb = createAdminClient();
  await sb.storage.from(BUCKET).remove([filename]);
}
