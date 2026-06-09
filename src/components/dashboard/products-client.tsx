"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Package,
  Upload,
  X,
  GripVertical,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatINR, cn } from "@/lib/utils";
import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
  uploadProductImageAction,
} from "@/app/dashboard/actions";
import type { Product, ProductImage } from "@/types/storefront";
import { MAX_PRODUCT_IMAGES } from "@/types/storefront";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  tagline: z.string().min(1, "Tagline is required"),
  price: z.coerce.number().int().min(0, "Price must be 0 or more"),
  altText: z.string().min(1, "Alt text is required"),
  images: z
    .array(
      z.object({
        id: z.string(),
        url: z.string(),
      })
    )
    .min(1, "Add at least one image")
    .max(MAX_PRODUCT_IMAGES, `Up to ${MAX_PRODUCT_IMAGES} images`),
  stockCount: z.coerce.number().int().min(0, "Stock must be 0 or more"),
  isAvailable: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  status: z.enum(["live", "draft"]).default("live"),
});

type FormValues = z.infer<typeof formSchema>;

const TAG_OPTIONS = [
  { id: "new", label: "New" },
  { id: "limited", label: "Limited" },
  { id: "sold-out", label: "Sold out" },
];

type Props = {
  storeSlug: string;
  products: Product[];
};

export function ProductsClient({ storeSlug, products }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const editing = editingId
    ? products.find((p) => p.id === editingId) ?? null
    : null;

  const close = () => {
    setEditingId(null);
    setCreating(false);
  };

  const onDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const result = await deleteProductAction(storeSlug, id);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Products</p>
          <h1 className="display-m text-ink">Your pieces</h1>
        </div>
        <Button
          variant="vermillion"
          size="default"
          onClick={() => setCreating(true)}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Add product
        </Button>
      </header>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 p-12 text-center">
          <p className="text-[15px] text-ink/60">No products yet.</p>
          <p className="mt-1 text-[13px] text-ink/45">
            Add your first piece to start selling.
          </p>
        </div>
      ) : (
        <ProductSections products={products} onEdit={setEditingId} onDelete={onDelete} />
      )}

      <ProductFormSheet
        open={creating || editingId !== null}
        onClose={close}
        storeSlug={storeSlug}
        product={editing}
      />
    </div>
  );
}

function ProductSections({
  products,
  onEdit,
  onDelete,
}: {
  products: Product[];
  onEdit: (id: string) => void;
  onDelete: (id: string, title: string) => void;
}) {
  const live = products.filter(
    (p) => (p.status ?? "live") === "live" || (p.status ?? "live") === "scheduled"
  );
  const drafts = products.filter((p) => p.status === "draft");
  const archived = products.filter((p) => p.status === "archived");

  return (
    <div className="space-y-8">
      {live.length > 0 && (
        <ProductGrid
          products={live}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
      {drafts.length > 0 && (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="eyebrow-ink">Drafts</p>
              <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] font-semibold text-ink/55">
                {drafts.length}
              </span>
            </div>
            <p className="text-[12px] text-ink/45">
              Hidden from your storefront. Publish to make them live.
            </p>
          </div>
          <ProductGrid
            products={drafts}
            onEdit={onEdit}
            onDelete={onDelete}
            draftStyle
          />
        </section>
      )}
      {archived.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <p className="eyebrow-ink">Archived</p>
            <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] font-semibold text-ink/55">
              {archived.length}
            </span>
          </div>
          <ProductGrid
            products={archived}
            onEdit={onEdit}
            onDelete={onDelete}
            draftStyle
          />
        </section>
      )}
    </div>
  );
}

function ProductGrid({
  products,
  onEdit,
  onDelete,
  draftStyle = false,
}: {
  products: Product[];
  onEdit: (id: string) => void;
  onDelete: (id: string, title: string) => void;
  draftStyle?: boolean;
}) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => {
        const cover = p.images[0]?.url ?? "";
        const more = Math.max(0, p.images.length - 1);
        const isDraft = (p.status ?? "live") === "draft";
        return (
          <li
            key={p.id}
            className={
              "group overflow-hidden rounded-2xl border bg-bone transition-all " +
              (draftStyle
                ? "border-ink/10 opacity-90 hover:opacity-100 hover:border-ink/20"
                : "border-ink/10 hover:border-ink/20")
            }
          >
            <button
              onClick={() => onEdit(p.id)}
              className="block w-full text-left"
            >
              <div className="relative aspect-square overflow-hidden bg-ink/[0.04]">
                {cover ? (
                  <Image
                    src={cover}
                    alt={p.altText}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className={
                      "object-cover transition-transform duration-500 " +
                      (draftStyle ? "" : "group-hover:scale-105")
                    }
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-ink/40">
                    <ImageIcon className="h-10 w-10" strokeWidth={1} />
                  </div>
                )}
                {more > 0 && (
                  <span className="absolute bottom-3 right-3 rounded-full bg-ink/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-bone">
                    +{more} more
                  </span>
                )}
                {isDraft && (
                  <div className="absolute inset-0 flex items-center justify-center bg-bone/55 backdrop-blur-[1px]">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-bone px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-ink/75">
                      <FileText className="h-3 w-3" strokeWidth={2.5} />
                      Draft
                    </span>
                  </div>
                )}
                {!isDraft && !p.isAvailable && (
                  <div className="absolute inset-0 flex items-center justify-center bg-bone/40 backdrop-blur-[1px]">
                    <span className="rounded-full border border-ink/30 bg-bone/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/70">
                      Hidden
                    </span>
                  </div>
                )}
                {!isDraft && p.stockCount === 0 && p.isAvailable && (
                  <span className="absolute left-3 top-3 rounded-full bg-vermillion px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-bone">
                    Sold out
                  </span>
                )}
              </div>
            </button>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[14.5px] font-semibold text-ink">
                    {p.title}
                  </h3>
                  <p className="truncate text-[12.5px] text-ink/55">
                    {p.tagline}
                  </p>
                </div>
                <p className="flex-shrink-0 text-[14.5px] font-semibold tabular-nums text-ink">
                  {formatINR(p.price)}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between text-[12px] text-ink/55">
                <span>
                  {p.images.length === 0
                    ? "No images"
                    : p.images.length === 1
                    ? "1 image"
                    : `${p.images.length} images`}
                  {" · "}
                  {p.stockCount > 0 ? `${p.stockCount} in stock` : "No stock"}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => onEdit(p.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-ink/55 transition-colors hover:bg-ink/[0.06] hover:text-ink"
                    aria-label={`Edit ${p.title}`}
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={() => onDelete(p.id, p.title)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-ink/55 transition-colors hover:bg-vermillion/10 hover:text-vermillion"
                    aria-label={`Delete ${p.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ProductFormSheet({
  open,
  onClose,
  storeSlug,
  product,
}: {
  open: boolean;
  onClose: () => void;
  storeSlug: string;
  product: Product | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const defaultValues: FormValues = product
    ? {
        title: product.title,
        tagline: product.tagline,
        price: product.price,
        altText: product.altText,
        images: product.images,
        stockCount: product.stockCount,
        isAvailable: product.isAvailable,
        tags: product.tags ?? [],
        status: (product.status as "live" | "draft" | undefined) ?? "live",
      }
    : {
        title: "",
        tagline: "",
        price: 0,
        altText: "",
        images: [],
        stockCount: 0,
        isAvailable: true,
        tags: [],
        status: "live",
      };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      setError(null);
      setFieldErrors({});
      reset(defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  const onOpenChange = (next: boolean) => {
    // Don't close on outside click or escape — only on explicit close button
    if (!next) return;
  };

  const onSubmit = (data: FormValues) => {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = product
        ? await updateProductAction(storeSlug, product.id, data)
        : await createProductAction(storeSlug, data);
      if (result.ok) {
        onClose();
      } else {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      }
    });
  };

  const saveAsDraft = handleSubmit((d) => {
    onSubmit({ ...d, status: "draft" });
  });

  const isAvailable = watch("isAvailable");
  const tags = watch("tags") ?? [];
  const images = watch("images") ?? [];

  const toggleTag = (tagId: string) => {
    if (tags.includes(tagId)) {
      setValue(
        "tags",
        tags.filter((t) => t !== tagId),
        { shouldValidate: true }
      );
    } else {
      setValue("tags", [...tags, tagId], { shouldValidate: true });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-bone sm:max-w-md"
        showClose={false}
      >
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>{product ? "Edit product" : "Add product"}</SheetTitle>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <X className="h-5 w-5" strokeWidth={2} />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </SheetHeader>
        <SheetBody>
          <form
            id="product-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >
            <Field
              label={`Photos · ${images.length}/${MAX_PRODUCT_IMAGES}`}
              error={fieldErrors.images}
            >
              <MultiImageUploader
                value={images}
                onChange={(next) =>
                  setValue("images", next, { shouldValidate: true })
                }
                onError={setError}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4">
              <Field label="Title" error={fieldErrors.title}>
                <Input
                  {...register("title")}
                  placeholder="e.g. Linen Camp Shirt"
                />
              </Field>
              <Field label="Tagline" error={fieldErrors.tagline}>
                <Textarea
                  {...register("tagline")}
                  placeholder="e.g. Sand-washed, oversized fit"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (₹)" error={fieldErrors.price}>
                <Input
                  type="number"
                  {...register("price")}
                  inputMode="numeric"
                  min={0}
                />
              </Field>
              <Field label="Stock" error={fieldErrors.stockCount}>
                <Input
                  type="number"
                  {...register("stockCount")}
                  inputMode="numeric"
                  min={0}
                />
              </Field>
            </div>

            <Field label="Alt text" error={fieldErrors.altText}>
              <Input
                {...register("altText")}
                placeholder="Describe the photos for accessibility"
              />
            </Field>

            <div>
              <p className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
                Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((t) => {
                  const active = tags.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTag(t.id)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                        active
                          ? "bg-ink text-bone"
                          : "border border-ink/10 bg-bone text-ink/65 hover:text-ink"
                      )}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-ink/10 bg-bone p-4">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) =>
                  setValue("isAvailable", e.target.checked, {
                    shouldValidate: true,
                  })
                }
                className="h-5 w-5 rounded border-ink/20 text-ink focus:ring-ink"
              />
              <div>
                <p className="text-[14px] font-semibold text-ink">
                  Available on storefront
                </p>
                <p className="text-[12.5px] text-ink/55">
                  Hide this product to take it offline without deleting it.
                </p>
              </div>
            </label>

            {error && (
              <p className="rounded-xl border border-vermillion/20 bg-vermillion/5 px-4 py-3 text-[13px] text-vermillion">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-2 border-t border-ink/10 pt-5">
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={onClose}
                disabled={pending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={saveAsDraft}
                disabled={pending}
                className="flex-1"
              >
                <FileText className="h-4 w-4" strokeWidth={2} />
                Save as draft
              </Button>
              <Button
                type="submit"
                size="default"
                variant="vermillion"
                disabled={pending}
                className="flex-1"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Package className="h-4 w-4" strokeWidth={2.25} />
                )}
                {product ? "Save changes" : "Publish"}
              </Button>
            </div>
          </form>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
        {label}
      </span>
      {children}
      {error && (
        <span className="mt-1.5 block text-[12px] text-vermillion">{error}</span>
      )}
    </label>
  );
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type PendingImage = {
  tempId: string;
  preview: string;
  file: File;
};

function MultiImageUploader({
  value,
  onChange,
  onError,
}: {
  value: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  onError: (msg: string | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);

  const totalCount = value.length + pending.length;
  const canAddMore = totalCount < MAX_PRODUCT_IMAGES;
  const slotsRemaining = MAX_PRODUCT_IMAGES - totalCount;

  useEffect(() => {
    return () => {
      for (const p of pending) URL.revokeObjectURL(p.preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length === 0) return;
      e.preventDefault();
      void handleFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, pending]);

  const uploadFile = async (file: File): Promise<{ ok: true; img: ProductImage } | { ok: false; error: string }> => {
    const fd = new FormData();
    fd.append("file", file);
    const result = await uploadProductImageAction(fd);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, img: { id: result.filename, url: result.url } };
  };

  const handleFiles = async (files: File[]) => {
    const MAX_BYTES = 5 * 1024 * 1024; // 5MB
    const accepted: File[] = [];
    for (const f of files) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        onError(`"${f.name}" is not a supported image type.`);
        return;
      }
      if (f.size > MAX_BYTES) {
        onError(`"${f.name}" exceeds 5MB limit.`);
        return;
      }
      accepted.push(f);
      if (value.length + pending.length + accepted.length >= MAX_PRODUCT_IMAGES) {
        break;
      }
    }
    if (accepted.length === 0) return;
    if (accepted.length < files.length) {
      onError(`Only ${slotsRemaining} more image${slotsRemaining === 1 ? "" : "s"} allowed.`);
    }

    const temps: PendingImage[] = accepted.map((f) => ({
      tempId: crypto.randomUUID(),
      preview: URL.createObjectURL(f),
      file: f,
    }));
    setPending((p) => [...p, ...temps]);
    onError(null);

    const results = await Promise.all(temps.map((t) => uploadFile(t.file)));
    setPending((p) => p.filter((x) => !temps.some((t) => t.tempId === x.tempId)));
    for (const t of temps) URL.revokeObjectURL(t.preview);

    const newImages: ProductImage[] = [];
    for (const r of results) {
      if (r.ok) {
        newImages.push(r.img);
      } else {
        onError(r.error);
        break;
      }
    }
    if (newImages.length > 0) {
      onChange([...value, ...newImages]);
    }
  };

  const onDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) void handleFiles(files);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const onPick = () => fileInputRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) void handleFiles(files);
    e.target.value = "";
  };

  const removeImage = (id: string) => {
    onChange(value.filter((i) => i.id !== id));
  };

  const moveImage = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= value.length || to >= value.length) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const onSlotDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  };

  const onSlotDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dropTargetIdx !== idx) setDropTargetIdx(idx);
  };

  const onSlotDragLeave = () => {
    setDropTargetIdx(null);
  };

  const onSlotDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const from = draggedIdx;
    setDraggedIdx(null);
    setDropTargetIdx(null);
    if (from === null) return;
    moveImage(from, idx);
  };

  const onSlotDragEnd = () => {
    setDraggedIdx(null);
    setDropTargetIdx(null);
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        multiple
        onChange={onFileChange}
      />

      <div
        onDrop={onDropFiles}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          "rounded-xl border-2 border-dashed p-2 transition-colors",
          dragActive
            ? "border-ink bg-ink/[0.03]"
            : "border-transparent"
        )}
      >
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((img, idx) => {
            const isCover = idx === 0;
            const isDragging = draggedIdx === idx;
            const isDropTarget = dropTargetIdx === idx && draggedIdx !== null && draggedIdx !== idx;
            return (
              <div
                key={img.id}
                draggable
                onDragStart={(e) => onSlotDragStart(e, idx)}
                onDragOver={(e) => onSlotDragOver(e, idx)}
                onDragLeave={onSlotDragLeave}
                onDrop={(e) => onSlotDrop(e, idx)}
                onDragEnd={onSlotDragEnd}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-lg border bg-ink/[0.04] transition-all",
                  isDragging && "opacity-40",
                  isDropTarget
                    ? "border-ink border-2 scale-[0.97]"
                    : "border-ink/10"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                {isCover && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-bone/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-ink">
                    Cover
                  </span>
                )}
                <div className="absolute inset-0 bg-ink/0 transition-colors group-hover:bg-ink/20" />
                <div className="absolute right-1 top-1 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-bone/95 text-ink shadow-sm transition-colors hover:bg-vermillion hover:text-bone"
                    aria-label="Remove image"
                    tabIndex={-1}
                  >
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                </div>
                <div className="absolute bottom-1 left-1 flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => moveImage(idx, idx - 1)}
                    disabled={idx === 0}
                    className="flex h-5 w-5 items-center justify-center rounded bg-bone/95 text-ink/70 shadow-sm transition-colors hover:bg-bone hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Move earlier"
                    tabIndex={-1}
                  >
                    <GripVertical className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}

          {pending.map((p) => (
            <div
              key={p.tempId}
              className="relative aspect-square overflow-hidden rounded-lg border border-ink/10 bg-ink/[0.04]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.preview}
                alt=""
                className="h-full w-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-ink/30">
                <div className="flex items-center gap-1.5 rounded-full bg-bone px-2.5 py-1 text-[10.5px] font-semibold text-ink">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Uploading
                </div>
              </div>
            </div>
          ))}

          {canAddMore && (
            <button
              type="button"
              onClick={onPick}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ink/15 bg-bone text-ink/55 transition-colors hover:border-ink/30 hover:text-ink"
            >
              <Plus className="h-5 w-5" strokeWidth={1.75} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em]">
                Add
              </span>
            </button>
          )}
        </div>

        {!canAddMore && (
          <p className="mt-2 text-center text-[11px] text-ink/50">
            Max {MAX_PRODUCT_IMAGES} images. Remove one to add another.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 text-[11.5px] text-ink/55">
        <span className="inline-flex items-center gap-1">
          <Upload className="h-3 w-3" strokeWidth={2} />
          Drag, drop, or paste · JPEG/PNG/WebP/GIF · max 5MB each
        </span>
      </div>
    </div>
  );
}
