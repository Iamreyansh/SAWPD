"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateStoreAction } from "@/app/dashboard/actions";
import type { SellerStore } from "@/types/seller";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  ownerHandle: z.string().min(1, "Handle is required"),
  whatsapp: z.string().optional().default(""),
  upiId: z.string().min(3, "UPI ID is required"),
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

  const {
    register,
    handleSubmit,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: store.name,
      ownerHandle: store.ownerHandle,
      whatsapp: store.whatsapp ?? "",
      upiId: store.upiId,
      notifyEmail: store.notifyEmail ?? "",
      heroKicker: store.heroKicker,
      heroSub: store.heroSub,
      heroImage: store.heroImage,
      heroHeadline: store.heroHeadline.join("\n"),
    },
  });

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
            <Input {...register("ownerHandle")} placeholder="@yourhandle" />
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
          <Field label="Hero image URL" error={fieldErrors.heroImage}>
            <Input {...register("heroImage")} />
          </Field>
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
