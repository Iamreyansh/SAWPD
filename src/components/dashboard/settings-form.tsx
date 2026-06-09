"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateStoreAction, uploadHeroImageAction } from "@/app/dashboard/actions";
import type { SellerStore } from "@/types/seller";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(60, "Name must be 60 characters or less"),
  ownerHandle: z.string().min(1, "Handle is required"),
  whatsapp: z.string().optional().default(""),
  upiId: z.string().min(3, "UPI ID is required").regex(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/, "Enter a valid UPI ID (e.g. name@bank)"),
  upiQrImage: z.string().optional().default(""),
  notifyEmail: z.string().email("Enter a valid email").or(z.literal("")),
  heroKicker: z.string().min(1, "Required"),
  heroSub: z.string().min(1, "Required"),
  heroImage: z.string().url("Enter a valid image URL"),
  heroHeadline: z.string().min(1, "At least one line"),
});

type FormValues = z.infer<typeof formSchema>;

export function SettingsForm({ store }: { store: SellerStore }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: store.name,
      ownerHandle: store.ownerHandle,
      whatsapp: store.whatsapp ?? "",
      upiId: store.upiId,
      upiQrImage: store.upiQrImage ?? "",
      notifyEmail: store.notifyEmail ?? "",
      heroKicker: store.heroKicker,
      heroSub: store.heroSub,
      heroImage: store.heroImage,
      heroHeadline: store.heroHeadline.join("\n"),
    },
  });

  const heroImageUrl = watch("heroImage");

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadHeroImageAction(formData);
    setUploading(false);
    if (result.ok) {
      setValue("heroImage", result.url, { shouldValidate: true });
    } else {
      setError(result.error);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onQrFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQr(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadHeroImageAction(formData);
    setUploadingQr(false);
    if (result.ok) {
      setValue("upiQrImage", result.url, { shouldValidate: true });
    } else {
      setError(result.error);
    }
    if (qrInputRef.current) qrInputRef.current.value = "";
  }

  const onSubmit = (data: FormValues) => {
    setError(null);
    setFieldErrors({});
    setSaved(false);
    const payload = {
      ...data,
      whatsapp: data.whatsapp?.trim() || undefined,
      heroHeadline: data.heroHeadline
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    startTransition(async () => {
      const result = await updateStoreAction(store.slug, payload);
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        router.refresh();
      } else {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <Section title="Identity" description="Your shop name and Instagram handle.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Shop name" error={fieldErrors.name}>
            <Input {...register("name")} />
          </Field>
          <Field label="Instagram handle" error={fieldErrors.ownerHandle}>
            <Input
              {...register("ownerHandle")}
              placeholder="yourhandle"
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (val && !val.startsWith("@")) {
                  setValue("ownerHandle", "@" + val);
                }
              }}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field
            label="WhatsApp number"
            error={fieldErrors.whatsapp}
            hint="Customers will be linked to chat with you on WhatsApp after ordering."
          >
            <Input {...register("whatsapp")} placeholder="+91 98765 43210" />
          </Field>
        </div>
      </Section>

      <Section title="Payments" description="Where customers pay you via UPI.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="UPI ID" error={fieldErrors.upiId} hint="e.g. yourname@oksbi">
            <Input {...register("upiId")} />
          </Field>
          <Field
            label="Notification email"
            error={fieldErrors.notifyEmail}
            hint="Where you receive new-order alerts."
          >
            <Input {...register("notifyEmail")} type="email" />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="UPI QR code" hint="Upload a screenshot of your QR code so customers can scan and pay.">
            <div>
              <input
                ref={qrInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onQrFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => qrInputRef.current?.click()}
                disabled={uploadingQr || pending}
              >
                {uploadingQr ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" strokeWidth={2} />
                )}
                {uploadingQr ? "Uploading…" : "Upload QR code"}
              </Button>
            </div>
          </Field>
          {watch("upiQrImage") && (
            <div className="mt-3 flex items-center gap-3">
              <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-ink/10 bg-ink/[0.04]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={watch("upiQrImage")}
                  alt="UPI QR code"
                  className="absolute inset-0 h-full w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = "0";
                  }}
                />
              </div>
              <p className="text-[11.5px] text-ink/45">Preview · saved on submit</p>
            </div>
          )}
        </div>
      </Section>

      <Section
        title="Hero"
        description="The big block at the top of your storefront. Headline is one line per row."
      >
        <Field label="Kicker" error={fieldErrors.heroKicker}>
          <Input {...register("heroKicker")} placeholder="e.g. Summer / 25" />
        </Field>
        <div className="mt-4">
          <Field label="Headline (one line per row)" error={fieldErrors.heroHeadline}>
            <Textarea {...register("heroHeadline")} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Sub" error={fieldErrors.heroSub}>
            <Textarea {...register("heroSub")} />
          </Field>
        </div>
        <div className="mt-4">
          <Field
            label="Hero image"
            error={fieldErrors.heroImage}
            hint="Upload a 4:5 or 5:4 portrait photo (1200×1600 or larger)."
          >
            <div>
              <input type="hidden" {...register("heroImage")} />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || pending}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" strokeWidth={2} />
                )}
                {uploading ? "Uploading…" : "Upload image"}
              </Button>
            </div>
          </Field>
          <HeroImagePreview
            url={heroImageUrl}
            onClear={() => setValue("heroImage", "", { shouldValidate: true })}
          />
        </div>
      </Section>

      {error && (
        <p className="rounded-xl border border-vermillion/20 bg-vermillion/5 px-4 py-3 text-[13.5px] text-vermillion">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-xl border border-ink/15 bg-ink/[0.04] px-4 py-3 text-[13.5px] text-ink">
          Saved. Your storefront is updated.
        </p>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-ink/10 pt-6">
        <Button
          type="submit"
          size="default"
          variant="vermillion"
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" strokeWidth={2.25} />
          )}
          Save changes
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-ink">
        {title}
      </h2>
      <p className="mt-1 text-[13.5px] text-ink/55">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function HeroImagePreview({ url, onClear }: { url: string; onClear?: () => void }) {
  if (!url) {
    return (
      <div className="mt-3 flex h-32 w-32 items-center justify-center rounded-xl border border-dashed border-ink/15 bg-ink/[0.02] text-[11px] text-ink/40">
        No image
      </div>
    );
  }
  let valid = false;
  try {
    new URL(url);
    valid = true;
  } catch {
    /* not a URL */
  }
  if (!valid) return null;
  return (
    <div className="mt-3 flex items-center gap-3">
      <div className="relative h-24 w-20 overflow-hidden rounded-lg border border-ink/10 bg-ink/[0.04]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Hero preview"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.opacity = "0";
          }}
        />
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-bone transition-colors hover:bg-ink"
          >
            <X className="h-3 w-3" strokeWidth={2.5} />
          </button>
        )}
      </div>
      <p className="text-[11.5px] text-ink/45">Preview · saved on submit</p>
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
        {label}
      </span>
      {children}
      {hint && !error && (
        <span className="mt-1.5 block text-[12px] text-ink/45">{hint}</span>
      )}
      {error && (
        <span className="mt-1.5 block text-[12px] text-vermillion">{error}</span>
      )}
    </label>
  );
}
