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
import {
  sellerSignupAction,
  type SellerAuthResult,
} from "@/app/seller/actions";
import { cn } from "@/lib/utils";

type FormState = {
  accountEmail: string;
  accountPassword: string;
  fullName: string;
  instagramHandle: string;
  email: string;
  phone: string;
  storeName: string;
  niche: string;
  followerCount: string;
  salesCadence: string;
  salesCount: string;
  averageOrderValue: string;
  currentSetup: string;
  topProducts: string;
  referralSource: string;
  motivation: string;
};

const DRAFT_KEY = "sawpd.applyDraft.v3";
const SUBMITTED_KEY = "sawpd.applySubmitted";

const initialState: FormState = {
  accountEmail: "",
  accountPassword: "",
  fullName: "",
  instagramHandle: "",
  email: "",
  phone: "",
  storeName: "",
  niche: "",
  followerCount: "",
  salesCadence: "",
  salesCount: "",
  averageOrderValue: "",
  currentSetup: "",
  topProducts: "",
  referralSource: "",
  motivation: "",
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

export function ApplyForm({ signedIn = false }: { signedIn?: boolean } = {}) {
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  const steps = signedIn
    ? [
        { id: 0, title: "You", description: "Your name, handle, and contact." },
        { id: 1, title: "Shop", description: "Your shop name and category." },
      ]
    : [
        { id: -1, title: "Account", description: "Create a free seller account — it takes 10 seconds." },
        { id: 0, title: "You", description: "Your name, handle, and contact." },
        { id: 1, title: "Shop", description: "Your shop name and category." },
      ];

  useEffect(() => {
    setForm(loadDraft());
    try {
      const raw = window.localStorage.getItem(SUBMITTED_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { id: string; email: string };
        setSubmittedId(parsed.id);
        setSubmittedEmail(parsed.email);
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      // ignore
    }
  }, [form, hydrated]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep(idx: number): string[] {
    const e: Record<string, string> = {};
    if (!signedIn && idx === 0) {
      if (!/^\S+@\S+\.\S+$/.test(form.accountEmail)) e.accountEmail = "Enter a valid email";
      if (form.accountPassword.length < 8) e.accountPassword = "At least 8 characters";
    } else {
      const realIdx = signedIn ? idx : idx - 1;
      if (realIdx === 0) {
        // "You" step
        if (form.fullName.trim().length < 2) e.fullName = "Required";
        const handle = form.instagramHandle.trim();
        if (!handle) e.instagramHandle = "Required";
        else if (!handle.startsWith("@")) e.instagramHandle = "Must start with @";
        if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email";
        const phoneDigits = form.phone.replace(/\D/g, "");
        if (phoneDigits.length < 10) e.phone = "Min 10 digits";
      } else if (realIdx === 1) {
        // "Shop" step
        if (form.storeName.trim().length < 2) e.storeName = "Shop name is required";
        if (!form.niche) e.niche = "Pick a niche";
      }
    }
    setFieldErrors(e);
    return Object.keys(e);
  }

  function next() {
    if (validateStep(step).length > 0) return;
    if (!signedIn && step === 0) {
      setError(null);
      startTransition(async () => {
        const result: SellerAuthResult = await sellerSignupAction({
          email: form.accountEmail.trim(),
          password: form.accountPassword,
        });
        if (result.ok) {
          setStep(step + 1);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          setError(result.error);
          if (result.fieldErrors) {
            const mapped: Record<string, string> = {};
            for (const [k, v] of Object.entries(result.fieldErrors)) {
              if (k === "email") mapped.accountEmail = v;
              else if (k === "password") mapped.accountPassword = v;
              else mapped[k] = v;
            }
            setFieldErrors(mapped);
          }
        }
      });
      return;
    }
    if (step < steps.length - 1) {
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
    // Auto-prepend +91 if phone doesn't start with +
    let phoneValue = form.phone.trim();
    if (phoneValue && !phoneValue.startsWith("+")) {
      phoneValue = "+91" + phoneValue.replace(/\s/g, "");
    }
    // Auto-prepend @ for Instagram handle if missing
    let handleValue = form.instagramHandle.trim();
    if (handleValue && !handleValue.startsWith("@")) {
      handleValue = "@" + handleValue;
    }
    const payload: Record<string, unknown> = {
      fullName: form.fullName.trim(),
      instagramHandle: handleValue,
      email: form.email.trim(),
      phone: phoneValue,
      storeName: form.storeName.trim(),
      niche: form.niche || undefined,
      followerCount: form.followerCount ? Number(form.followerCount) : undefined,
      salesCadence: form.salesCadence || undefined,
      salesCount: form.salesCount ? Number(form.salesCount) : undefined,
      averageOrderValue: form.averageOrderValue ? Number(form.averageOrderValue) : undefined,
      currentSetup: form.currentSetup || undefined,
      topProducts: form.topProducts || undefined,
      referralSource: form.referralSource || undefined,
      motivation: form.motivation || undefined,
    };
    startTransition(async () => {
      const result: ApplyResult = await submitApplication(payload);
      if (result.ok) {
        setSubmittedId(result.id);
        setSubmittedEmail(String(payload.email));
        try {
          window.localStorage.removeItem(DRAFT_KEY);
          window.localStorage.setItem(
            SUBMITTED_KEY,
            JSON.stringify({ id: result.id, email: String(payload.email) })
          );
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
      />
    );
  }

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <main className="container-editorial pb-24 pt-10 md:pt-16">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow mb-3">Apply for access</p>
        <h1 className="display-l text-ink text-balance">
          Tell us about yourself.
        </h1>
        <p className="mt-4 max-w-xl text-[15px] text-ink/60">
          We approve by hand. Most decisions land within 24 hours.
          You can add shop details later from your dashboard.
        </p>

        <div className="mt-10">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/55">
            <span>
              Step {step + 1} of {steps.length} · {steps[step].title}
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
            {steps.map((s, i) => {
              const isDone = step > i;
              const isCurrent = step === i;
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
              {steps[step].title}
            </h2>
            <p className="mt-1 text-[13.5px] text-ink/55">
              {steps[step].description}
            </p>

            <div className="mt-6 space-y-5">
              {!signedIn && step === 0 && (
                <>
                  <p className="text-[13.5px] text-ink/55">
                    This links your application to your seller dashboard. Takes 10 seconds.
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Email" error={fieldErrors.accountEmail}>
                      <Input
                        type="email"
                        value={form.accountEmail}
                        onChange={(e) => patch("accountEmail", e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </Field>
                    <Field label="Password" error={fieldErrors.accountPassword}>
                      <Input
                        type="password"
                        value={form.accountPassword}
                        onChange={(e) => patch("accountPassword", e.target.value)}
                        placeholder="8+ chars, 1 cap, 2 digits, 1 symbol"
                        autoComplete="new-password"
                        minLength={8}
                      />
                    </Field>
                  </div>
                  <p className="text-[12px] text-ink/45">
                    Already have an account?{" "}
                    <Link href="/seller/login" className="font-semibold text-vermillion hover:underline">
                      Log in instead
                    </Link>
                  </p>
                </>
              )}

              {(signedIn || step > 0) && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Full name" error={fieldErrors.fullName}>
                    <Input
                      value={form.fullName}
                      onChange={(e) => patch("fullName", e.target.value)}
                      placeholder="Riya Sharma"
                      autoComplete="name"
                    />
                  </Field>
                  <Field label="Instagram handle" error={fieldErrors.instagramHandle}>
                    <Input
                      value={form.instagramHandle}
                      onChange={(e) => patch("instagramHandle", e.target.value)}
                      onBlur={(e) => {
                        const val = e.target.value.trim();
                        if (val && !val.startsWith("@")) {
                          patch("instagramHandle", "@" + val);
                        }
                      }}
                      placeholder="yourbrand"
                    />
                    {!form.instagramHandle && (
                      <span className="mt-1 block text-[11px] text-ink/45">@ added automatically</span>
                    )}
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
                      placeholder="98765 43210"
                      autoComplete="tel"
                    />
                    {!form.phone && (
                      <span className="mt-1 block text-[11px] text-ink/45">+91 added automatically</span>
                    )}
                  </Field>
                  <Field label="How did you hear about us?" error={fieldErrors.referralSource}>
                    <select
                      value={form.referralSource}
                      onChange={(e) => patch("referralSource", e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-ink/15 bg-bone px-3 py-2 text-[14px] text-ink outline-none transition-colors focus:border-ink/40"
                    >
                      <option value="">Select (optional)</option>
                      <option value="instagram">Instagram</option>
                      <option value="friend">Friend / word of mouth</option>
                      <option value="google">Google search</option>
                      <option value="youtube">YouTube</option>
                      <option value="twitter">Twitter / X</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                </div>
              )}
            </div>

            {/* Shop step */}
            {(signedIn || step > 0) && (signedIn ? step === 1 : step === 2) && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Shop name" error={fieldErrors.storeName}>
                    <Input
                      value={form.storeName}
                      onChange={(e) => patch("storeName", e.target.value)}
                      placeholder="Riya's Closet"
                    />
                  </Field>
                  <Field label="Niche" error={fieldErrors.niche}>
                    <select
                      value={form.niche}
                      onChange={(e) => patch("niche", e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-ink/15 bg-bone px-3 py-2 text-[14px] text-ink outline-none transition-colors focus:border-ink/40"
                    >
                      <option value="">Select a niche</option>
                      <option value="fashion">Fashion</option>
                      <option value="beauty">Beauty</option>
                      <option value="home">Home decor</option>
                      <option value="art">Art & craft</option>
                      <option value="jewelry">Jewelry</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                </div>

                <p className="text-[12px] text-ink/45">Optional — helps us personalize your experience.</p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Instagram followers">
                    <Input
                      type="number"
                      value={form.followerCount}
                      onChange={(e) => patch("followerCount", e.target.value)}
                      placeholder="e.g. 5000"
                      min="0"
                    />
                  </Field>
                  <Field label="How often do you sell?">
                    <select
                      value={form.salesCadence}
                      onChange={(e) => patch("salesCadence", e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-ink/15 bg-bone px-3 py-2 text-[14px] text-ink outline-none transition-colors focus:border-ink/40"
                    >
                      <option value="">Select (optional)</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </Field>
                  <Field label="Typical orders per cycle">
                    <Input
                      type="number"
                      value={form.salesCount}
                      onChange={(e) => patch("salesCount", e.target.value)}
                      placeholder="e.g. 20"
                      min="0"
                    />
                  </Field>
                  <Field label="Avg order value (₹)">
                    <Input
                      type="number"
                      value={form.averageOrderValue}
                      onChange={(e) => patch("averageOrderValue", e.target.value)}
                      placeholder="e.g. 500"
                      min="0"
                    />
                  </Field>
                </div>
                <Field label="What do you sell?">
                  <Input
                    value={form.topProducts}
                    onChange={(e) => patch("topProducts", e.target.value)}
                    placeholder="e.g. Handmade earrings, custom tees"
                  />
                </Field>
                <Field label="Current selling setup">
                  <Input
                    value={form.currentSetup}
                    onChange={(e) => patch("currentSetup", e.target.value)}
                    placeholder="e.g. Instagram DMs, link in bio, Shopify"
                  />
                </Field>
                <Field label="Why do you want to sell on SAWPD?">
                  <Textarea
                    value={form.motivation}
                    onChange={(e) => patch("motivation", e.target.value)}
                    placeholder="Tell us briefly (optional)"
                    rows={3}
                  />
                </Field>
              </div>
            )}
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
            ) : step === steps.length - 1 ? (
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
}: {
  referenceId: string;
  email: string;
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
        </div>
        <p className="mt-6 text-[13.5px] text-ink/50">
          You&apos;ll receive an email once your application is reviewed. You can apply for additional shops after your current application is decided.
        </p>
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
