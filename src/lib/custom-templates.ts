import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CustomField, CustomTemplate } from "@/types/custom-orders";

function rowToTemplate(
  row: Record<string, unknown>,
  options: CustomField[] = [],
): CustomTemplate {
  return {
    id: row.id as string,
    storeSlug: row.store_slug as string,
    name: row.name as string,
    description: (row.description as string) ?? "",
    imageUrl: (row.image_url as string) ?? "",
    basePrice: (row.base_price as number) ?? 0,
    fields: options,
    isActive: (row.is_active as boolean) ?? true,
    displayOrder: (row.display_order as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string) ?? (row.created_at as string),
  };
}

function rowToOption(row: Record<string, unknown>): CustomField {
  return {
    id: row.id as string,
    label: row.label as string,
    type: row.type as CustomField["type"],
    required: (row.required as boolean) ?? false,
    options: Array.isArray(row.options) ? (row.options as CustomField["options"]) : [],
    placeholder: (row.placeholder as string) ?? undefined,
    helpText: (row.help_text as string) ?? undefined,
    displayOrder: (row.display_order as number) ?? 0,
  };
}

async function loadOptionsForTemplates(
  templateIds: string[],
): Promise<Map<string, CustomField[]>> {
  const map = new Map<string, CustomField[]>();
  if (templateIds.length === 0) return map;
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("custom_template_options")
    .select("*")
    .in("template_id", templateIds)
    .order("display_order", { ascending: true });
  if (error) return map;
  for (const row of data ?? []) {
    const fid = row.template_id as string;
    const arr = map.get(fid) ?? [];
    arr.push(rowToOption(row));
    map.set(fid, arr);
  }
  return map;
}

export async function listTemplatesForStore(
  slug: string,
): Promise<CustomTemplate[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("custom_templates")
    .select("*")
    .eq("store_slug", slug)
    .order("display_order", { ascending: true });
  if (error || !data) return [];
  const ids = data.map((r) => r.id as string);
  const optionsMap = await loadOptionsForTemplates(ids);
  return data.map((r) => rowToTemplate(r, optionsMap.get(r.id as string) ?? []));
}

export async function listActiveTemplatesForStore(
  slug: string,
): Promise<CustomTemplate[]> {
  const all = await listTemplatesForStore(slug);
  return all.filter((t) => t.isActive);
}

export async function getTemplate(id: string): Promise<CustomTemplate | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("custom_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const optionsMap = await loadOptionsForTemplates([id]);
  return rowToTemplate(data, optionsMap.get(id) ?? []);
}

export async function getTemplateForStore(
  id: string,
  slug: string,
): Promise<CustomTemplate | null> {
  const t = await getTemplate(id);
  if (!t || t.storeSlug !== slug) return null;
  return t;
}

export async function addTemplate(
  slug: string,
  input: Omit<CustomTemplate, "id" | "storeSlug" | "createdAt" | "updatedAt">,
): Promise<CustomTemplate> {
  const sb = createAdminClient();
  const now = new Date().toISOString();
  const templateId = `tmpl_${randomUUID().slice(0, 8)}`;

  // Insert template first
  const { error: tErr } = await sb.from("custom_templates").insert({
    id: templateId,
    store_slug: slug,
    name: input.name,
    description: input.description || null,
    image_url: input.imageUrl || null,
    base_price: input.basePrice,
    is_active: input.isActive,
    display_order: input.displayOrder,
    created_at: now,
    updated_at: now,
  });
  if (tErr) throw tErr;

  // Insert options if any
  if (input.fields.length > 0) {
    const optionRows = input.fields.map((f, i) => ({
      id: f.id || `fld_${randomUUID().slice(0, 8)}`,
      template_id: templateId,
      label: f.label,
      type: f.type,
      required: f.required ?? false,
      options: f.options ?? [],
      placeholder: f.placeholder ?? null,
      help_text: f.helpText ?? null,
      display_order: f.displayOrder ?? i,
    }));
    const { error: oErr } = await sb
      .from("custom_template_options")
      .insert(optionRows);
    if (oErr) throw oErr;
  }

  return {
    ...input,
    id: templateId,
    storeSlug: slug,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateTemplate(
  id: string,
  slug: string,
  patch: Partial<Omit<CustomTemplate, "id" | "storeSlug" | "createdAt">>,
): Promise<CustomTemplate | null> {
  const sb = createAdminClient();
  // Verify ownership
  const existing = await getTemplateForStore(id, slug);
  if (!existing) return null;

  const now = new Date().toISOString();
  const rowPatch: Record<string, unknown> = { updated_at: now };
  if (patch.name !== undefined) rowPatch.name = patch.name;
  if (patch.description !== undefined)
    rowPatch.description = patch.description || null;
  if (patch.imageUrl !== undefined)
    rowPatch.image_url = patch.imageUrl || null;
  if (patch.basePrice !== undefined) rowPatch.base_price = patch.basePrice;
  if (patch.isActive !== undefined) rowPatch.is_active = patch.isActive;
  if (patch.displayOrder !== undefined)
    rowPatch.display_order = patch.displayOrder;

  const { error } = await sb
    .from("custom_templates")
    .update(rowPatch)
    .eq("id", id)
    .eq("store_slug", slug);
  if (error) throw error;

  // If fields are being replaced, delete and re-insert options
  if (patch.fields) {
    await sb
      .from("custom_template_options")
      .delete()
      .eq("template_id", id);
    if (patch.fields.length > 0) {
      const optionRows = patch.fields.map((f, i) => ({
        id: f.id || `fld_${randomUUID().slice(0, 8)}`,
        template_id: id,
        label: f.label,
        type: f.type,
        required: f.required ?? false,
        options: f.options ?? [],
        placeholder: f.placeholder ?? null,
        help_text: f.helpText ?? null,
        display_order: f.displayOrder ?? i,
      }));
      const { error: oErr } = await sb
        .from("custom_template_options")
        .insert(optionRows);
      if (oErr) throw oErr;
    }
  }

  return getTemplate(id);
}

export async function deleteTemplate(
  id: string,
  slug: string,
): Promise<boolean> {
  const sb = createAdminClient();
  const { error } = await sb
    .from("custom_templates")
    .delete()
    .eq("id", id)
    .eq("store_slug", slug);
  if (error) throw error;
  return true;
}

export async function toggleTemplateActive(
  id: string,
  slug: string,
): Promise<CustomTemplate | null> {
  const existing = await getTemplateForStore(id, slug);
  if (!existing) return null;
  return updateTemplate(id, slug, { isActive: !existing.isActive });
}

export async function reorderTemplates(
  slug: string,
  orderedIds: string[],
): Promise<void> {
  const sb = createAdminClient();
  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    await sb
      .from("custom_templates")
      .update({ display_order: i, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("store_slug", slug);
  }
}