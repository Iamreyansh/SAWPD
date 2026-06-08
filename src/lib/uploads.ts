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

  const ext = EXT_BY_MIME[file.type] ?? "bin";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const sb = createAdminClient();
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType: file.type });
  if (error) return { ok: false, error: error.message };

  const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(filename);
  return { ok: true, url: urlData.publicUrl, filename };
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
