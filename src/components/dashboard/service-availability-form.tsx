"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateAvailabilityAction } from "@/app/dashboard/actions";

type Props = {
  productId: string;
  slotMinutes: number;
};

const schema = z
  .object({
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a start date"),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick an end date"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Pick an end time"),
    slotMinutes: z.coerce.number().int().min(5).max(24 * 60),
    capacity: z.coerce.number().int().min(1).max(100).default(1),
  })
  .refine(
    (data) => {
      if (!data.fromDate || !data.toDate) return true;
      return data.toDate >= data.fromDate;
    },
    { message: "End date must be on or after start date.", path: ["toDate"] },
  )
  .refine(
    (data) => {
      if (!data.startTime || !data.endTime) return true;
      return data.endTime > data.startTime;
    },
    { message: "End time must be after start time.", path: ["endTime"] },
  );

type FormValues = z.infer<typeof schema>;

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function twoWeeksOut(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ServiceAvailabilityForm({ productId, slotMinutes }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { kind: "success" | "error"; message: string } | null
  >(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fromDate: today(),
      toDate: twoWeeksOut(),
      startTime: "09:00",
      endTime: "18:00",
      slotMinutes,
      capacity: 1,
    },
  });

  const onSubmit = (data: FormValues) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await generateAvailabilityAction({
        productId,
        fromDate: data.fromDate,
        toDate: data.toDate,
        startTime: data.startTime,
        endTime: data.endTime,
        slotMinutes: data.slotMinutes,
        capacity: data.capacity,
      });
      if (result.ok) {
        setFeedback({
          kind: "success",
          message: `Added ${result.created} slot${result.created === 1 ? "" : "s"}${result.skipped > 0 ? ` (${result.skipped} already existed)` : ""}.`,
        });
        router.refresh();
      } else {
        setFeedback({ kind: "error", message: result.error });
      }
    });
  };

  return (
    <section className="rounded-2xl border border-ink/10 bg-bone p-6 space-y-4">
      <div>
        <h2 className="text-[14px] font-semibold text-ink flex items-center gap-2">
          <CalendarPlus className="h-4 w-4" />
          Add availability
        </h2>
        <p className="mt-1 text-[12px] text-ink/55 max-w-md">
          Pick a date range and time-of-day window. We&apos;ll create bookable
          slots every {slotMinutes} minutes inside it.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <Field label="From" error={errors.fromDate?.message}>
          <Input type="date" {...register("fromDate")} />
        </Field>
        <Field label="To" error={errors.toDate?.message}>
          <Input type="date" {...register("toDate")} />
        </Field>
        <Field label="From time" error={errors.startTime?.message}>
          <Input type="time" {...register("startTime")} />
        </Field>
        <Field label="To time" error={errors.endTime?.message}>
          <Input type="time" {...register("endTime")} />
        </Field>
        <Field label="Slot length (min)" error={errors.slotMinutes?.message}>
          <Input
            type="number"
            min={5}
            max={1440}
            {...register("slotMinutes", { valueAsNumber: true })}
          />
        </Field>
        <Field
          label="Per-slot capacity"
          hint="Set >1 for group bookings."
          error={errors.capacity?.message}
        >
          <Input
            type="number"
            min={1}
            max={100}
            {...register("capacity", { valueAsNumber: true })}
          />
        </Field>
        <div className="col-span-2 flex items-end justify-end gap-3 sm:col-span-2">
          {feedback && (
            <p
              className={
                "text-[12px] " +
                (feedback.kind === "success" ? "text-vermillion" : "text-vermillion-deep")
              }
            >
              {feedback.message}
            </p>
          )}
          <Button type="submit" disabled={pending} className="bg-vermillion">
            {pending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CalendarPlus className="h-4 w-4 mr-2" />
            )}
            Add slots
          </Button>
        </div>
      </form>
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
      <span className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink/55">
        {label}
      </span>
      {children}
      {hint && !error && (
        <span className="mt-1 block text-[11px] text-ink/40">{hint}</span>
      )}
      {error && (
        <span className="mt-1 block text-[11px] text-vermillion">{error}</span>
      )}
    </label>
  );
}