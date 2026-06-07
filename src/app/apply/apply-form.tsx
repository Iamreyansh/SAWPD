"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Mail,
  Circle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitApplication, type ApplyResult } from "./actions";
import type { Niche, SalesCadence } from "@/types/applications";
import { cn } from "@/lib/utils";

const niches: { id: Niche; label: string }[] = [
  { id: "fashion", label: "Fashion & apparel" },
  { id: "beauty", label: "Beauty & skincare" },
  { id: "jewelry", label: "Jewelry & accessories" },
  { id: "home", label: "Home & decor" },
  { id: "art", label: "Art & prints" },
  { id: "other", label: "Other" },
];

const cadences: { id: SalesCadence; label: string }[] = [
  { id: "daily", label: "Per day" },
  { id: "weekly", label: "Per week" },
  { id: "monthly", label: "Per month" },
];

const referralSources = [
  "Instagram",
  "A friend",
  "Google",
  "Twitter / X",
  "Reddit",
  "Other",
];

const STEPS = [
  { id: 0, title: "You", description: "Just so we know who we're talking to." },
  { id: 1, title: "Shop", description: "What you sell and who you sell to." },
  {
    id: 2,
    title: "Sales",
    description: "Your sales velocity and your current setup.",
  },
  { id: 3, title: "Why", description: "What problem are we solving for you?" },
] as const;

type FormState = {
  fullName: string;
  instagramHandle: string;
  email: string;
  phone: string;
  storeName: string;
  niche: Niche | "";
  followerCount: string;
  salesCadence: SalesCadence;
  salesCount: string;
  averageOrderValue: string;
  currentSetup: string;
  websiteUrl: string;
  topProducts: string;
  motivation: string;
  referralSource: string;
};

const DRAFT_KEY = "sawpd.applyDraft.v1";

const initialState: FormState = {
  fullName: "",
  instagramHandle: "",
  email: "",
  phone: "",
  storeName: "",
  niche: "",
  followerCount: "",
  salesCadence: "weekly",
  salesCount: "",
  averageOrderValue: "",
  currentSetup: "",
  websiteUrl: "",
  topProducts: "",
  motivation: "",
  referralSource: "",
};

function loadDraft(): FormState {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<FormState>;
    return { ...initialState, ...parsed };
  } catch {
    return initialState;
  }
}

export function ApplyForm() {
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setForm(loadDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      // ignore quota / disabled storage
    }
  }, [form, hydrated]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep(idx: number): string[] {
    const e: Record<string, string> = {};
    if (idx === 0) {
      if (form.fullName.trim().length < 2) e.fullName = "Required";
      if (!form.instagramHandle.trim()) e.instagramHandle = "Required";
      if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email";
      if (form.phone.replace(/\D/g, "").length < 10) e.phone = "Min 10 digits";
    } else if (idx === 1) {
      if (form.storeName.trim().length < 2) e.storeName = "Required";
      if (!form.niche) e.niche = "Pick one";
      if (form.followerCount && Number(form.followerCount) < 0)
        e.followerCount = "Cannot be negative";
      if (
        form.averageOrderValue &&
        Number(form.averageOrderValue) < 0
      )
        e.averageOrderValue = "Cannot be negative";
    } else if (idx === 2) {
      if (form.salesCount && Number(form.salesCount) < 0)
        e.salesCount = "Cannot be negative";
      if (form.currentSetup.trim().length < 2) e.currentSetup = "Tell us briefly";
      if (form.websiteUrl && !/^https?:\/\//.test(form.websiteUrl))
        e.websiteUrl = "Use a full URL (https://...)";
    } else if (idx === 3) {
      if (form.topProducts.trim().length < 8) e.topProducts = "List your top pieces";
      if (form.motivation.trim().length < 12) e.motivation = "Tell us a bit more";
      if (!form.referralSource) e.referralSource = "Pick one";
    }
    setFieldErrors(e);
    return Object.keys(e);
  }

  function next() {
    if (validateStep(step).length > 0) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      void submit();
    }
  }

  function back() {
    if (step > 0) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function submit() {
    setError(null);
    const payload: Record<string, unknown> = {
      fullName: form.fullName.trim(),
      instagramHandle: form.instagramHandle.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      storeName: form.storeName.trim(),
      niche: form.niche || "other",
      followerCount: form.followerCount || "0",
      salesCadence: form.salesCadence,
      salesCount: form.salesCount || "0",
      averageOrderValue: form.averageOrderValue || "0",
      currentSetup: form.currentSetup.trim(),
      websiteUrl: form.websiteUrl.trim(),
      topProducts: form.topProducts.trim(),
      referralSource: form.referralSource,
      motivation: form.motivation.trim(),
    };
    startTransition(async () => {
      const result: ApplyResult = await submitApplication(payload);
      if (result.ok) {
        setSubmittedId(result.id);
        setSubmittedEmail(String(payload.email));
        try {
          window.localStorage.removeItem(DRAFT_KEY);
        } catch {
          // ignore
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        setStep(0);
      }
    });
  }

  if (submittedId) {
    return (
      <SuccessView
        referenceId={submittedId}
        email={submittedEmail ?? ""}
        onStartOver={() => {
          setForm(initialState);
          setSubmittedId(null);
          setSubmittedEmail(null);
          setStep(0);
        }}
      />
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <main className="container-editorial pb-24 pt-10 md:pt-16">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow mb-3">Apply for access</p>
        <h1 className="display-l text-ink text-balance">
          Tell us about your shop.
        </h1>
        <p className="mt-4 max-w-xl text-[15px] text-ink/60">
          We approve by hand. The more specific you are, the faster we say yes.
          Most decisions land within 24 hours.
        </p>

        <div className="mt-10">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/55">
            <span>
              Step {step + 1} of {STEPS.length} · {STEPS[step].title}
            </span>
            <span className="tabular-nums text-ink/40">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.06]">
            <motion.div
              className="h-full bg-ink"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-ink/55">
            {STEPS.map((s) => {
              const isDone = step > s.id;
              const isCurrent = step === s.id;
              return (
                <span
                  key={s.id}
                  className={cn(
                    "flex items-center gap-1.5 transition-colors",
                    isCurrent
                      ? "font-semibold text-ink"
                      : isDone
                        ? "text-vermillion"
                        : "text-ink/45"
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                  ) : isCurrent ? (
                    <Circle className="h-3.5 w-3.5 fill-vermillion text-vermillion" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                  {s.title}
                </span>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8"
          >
            <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-ink">
              {STEPS[step].title}
            </h2>
            <p className="mt-1 text-[13.5px] text-ink/55">
              {STEPS[step].description}
            </p>

            <div className="mt-6 space-y-5">
              {step === 0 && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Full name" error={fieldErrors.fullName}>
                      <Input
                        value={form.fullName}
                        onChange={(e) => patch("fullName", e.target.value)}
                        placeholder="Riya Sharma"
                        autoComplete="name"
                      />
                    </Field>
                    <Field
                      label="Instagram handle"
                      error={fieldErrors.instagramHandle}
                    >
                      <Input
                        value={form.instagramHandle}
                        onChange={(e) => patch("instagramHandle", e.target.value)}
                        placeholder="@yourbrand"
                      />
                    </Field>
                    <Field label="Email" error={fieldErrors.email}>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => patch("email", e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </Field>
                    <Field label="Phone" error={fieldErrors.phone}>
                      <Input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => patch("phone", e.target.value)}
                        placeholder="+91 98765 43210"
                        autoComplete="tel"
                      />
                    </Field>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Shop name" error={fieldErrors.storeName}>
                      <Input
                        value={form.storeName}
                        onChange={(e) => patch("storeName", e.target.value)}
                        placeholder="e.g. Riya Studio"
                      />
                    </Field>
                    <Field label="Niche" error={fieldErrors.niche}>
                      <Select
                        value={form.niche}
                        onChange={(v) => patch("niche", v as Niche | "")}
                        options={niches}
                        placeholder="Choose a niche"
                      />
                    </Field>
                    <Field
                      label="Instagram followers"
                      error={fieldErrors.followerCount}
                      hint="Approximate is fine."
                    >
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={form.followerCount}
                        onChange={(e) => patch("followerCount", e.target.value)}
                        placeholder="e.g. 4200"
                        min={0}
                      />
                    </Field>
                    <Field
                      label="Average order value (₹)"
                      error={fieldErrors.averageOrderValue}
                    >
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={form.averageOrderValue}
                        onChange={(e) =>
                          patch("averageOrderValue", e.target.value)
                        }
                        placeholder="e.g. 1500"
                        min={0}
                      />
                    </Field>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
                      How many orders do you currently do?
                    </span>
                    <div className="grid grid-cols-3 gap-2 rounded-xl border border-ink/10 bg-bone p-1">
                      {cadences.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => patch("salesCadence", c.id)}
                          className={
                            "h-10 rounded-lg text-[13px] font-semibold transition-colors " +
                            (form.salesCadence === c.id
                              ? "bg-ink text-bone"
                              : "text-ink/60 hover:text-ink")
                          }
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4">
                      <Field
                        label="Number"
                        error={fieldErrors.salesCount}
                        hint="Approximate is fine."
                      >
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={form.salesCount}
                          onChange={(e) => patch("salesCount", e.target.value)}
                          placeholder="e.g. 12"
                          min={0}
                        />
                      </Field>
                    </div>
                  </div>
                  <Field
                    label="How do you sell today?"
                    error={fieldErrors.currentSetup}
                    hint="e.g. DMs only, WhatsApp catalog, Shopify, etc."
                  >
                    <Textarea
                      value={form.currentSetup}
                      onChange={(e) => patch("currentSetup", e.target.value)}
                      placeholder="Today I sell via DMs and WhatsApp. I ship from Bangalore."
                    />
                  </Field>
                  <Field
                    label="Website (optional)"
                    error={fieldErrors.websiteUrl}
                    hint="If you have one — Instagram-only is totally fine."
                  >
                    <Input
                      value={form.websiteUrl}
                      onChange={(e) => patch("websiteUrl", e.target.value)}
                      type="url"
                      placeholder="https://"
                    />
                  </Field>
                </>
              )}

              {step === 3 && (
                <>
                  <Field
                    label="Your top 3 best-sellers"
                    error={fieldErrors.topProducts}
                    hint="The single most important field. List 3 products and roughly what they sell for."
                  >
                    <Textarea
                      value={form.topProducts}
                      onChange={(e) => patch("topProducts", e.target.value)}
                      placeholder="1. Linen camp shirt — ₹1,899 · 2. Pleated trouser — ₹2,299 · 3. Canvas tote — ₹899"
                    />
                  </Field>
                  <Field
                    label="Why do you want to join SAWPD?"
                    error={fieldErrors.motivation}
                    hint="One short paragraph. What problem are we solving for you?"
                  >
                    <Textarea
                      value={form.motivation}
                      onChange={(e) => patch("motivation", e.target.value)}
                      placeholder="I lose sales in DMs because people ghost. A real checkout link would help me convert."
                    />
                  </Field>
                  <Field
                    label="How did you hear about us?"
                    error={fieldErrors.referralSource}
                  >
                    <Select
                      value={form.referralSource}
                      onChange={(v) => patch("referralSource", v)}
                      options={referralSources.map((s) => ({ id: s, label: s }))}
                      placeholder="Choose one"
                    />
                  </Field>
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {error && (
          <p className="mt-6 rounded-xl border border-vermillion/20 bg-vermillion/5 px-4 py-3 text-[13.5px] text-vermillion">
            {error}
          </p>
        )}

        <div className="mt-10 flex items-center justify-between border-t border-ink/10 pt-6">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || pending}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold transition-colors",
              step === 0
                ? "cursor-not-allowed text-ink/30"
                : "text-ink/65 hover:text-ink"
            )}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
            Back
          </button>
          <Button
            type="button"
            onClick={next}
            size="default"
            variant="vermillion"
            disabled={pending}
            className="min-w-[180px]"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                Submitting…
              </>
            ) : step === STEPS.length - 1 ? (
              <>
                Submit application
                <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
              </>
            )}
          </Button>
        </div>
        <p className="mt-4 text-center text-[12px] text-ink/45">
          Your draft is saved as you type. Close this tab and come back —
          you&apos;ll pick up where you left off.
        </p>
      </div>
    </main>
  );
}

function SuccessView({
  referenceId,
  email,
  onStartOver,
}: {
  referenceId: string;
  email: string;
  onStartOver: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="container-editorial flex min-h-[70vh] flex-col items-start justify-center py-20"
      >
        <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-bone">
          <Check className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <p className="eyebrow mb-3">Application received</p>
        <h1 className="display-l text-ink text-balance">
          Got it. <span className="text-ink/30">We&apos;ll be in touch.</span>
        </h1>
        <p className="mt-6 max-w-md text-[15px] text-ink/60">
          Your reference is{" "}
          <span className="font-semibold tabular-nums text-ink">
            {referenceId}
          </span>
          . We review every application by hand and most decisions land within
          24 hours.
        </p>
        {email && (
          <div className="mt-6 flex max-w-md items-start gap-3 rounded-2xl border border-ink/10 bg-bone p-4">
            <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-vermillion" strokeWidth={2.25} />
            <p className="text-[13.5px] leading-relaxed text-ink/70">
              A confirmation will land in{" "}
              <span className="font-semibold text-ink">{email}</span> shortly.
              If it doesn&apos;t arrive in 30 minutes, check your spam folder or
              ping us on Instagram.
            </p>
          </div>
        )}
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="default">
            <Link href="/">Back to home</Link>
          </Button>
          <Button asChild variant="ghost" size="default">
            <Link href="/s/riya">Peek at a live shop</Link>
          </Button>
          <button
            type="button"
            onClick={onStartOver}
            className="text-[13.5px] font-semibold text-ink/55 transition-colors hover:text-ink"
          >
            Apply again
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
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

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  options: { id: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-12 w-full rounded-xl border border-ink/10 bg-bone px-4 text-base text-ink transition-all duration-200 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/5"
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
