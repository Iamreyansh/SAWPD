"use client";

import { useState, useMemo, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  CustomTemplate,
  CustomField,
  CustomOrderSelections,
} from "@/types/custom-orders";
import { calculatePrice, type PriceBreakdown } from "@/lib/custom-order-utils";
import { submitCustomerCustomOrder } from "@/app/dashboard/actions";
import { formatINR } from "@/lib/utils";

type Props = {
  template: CustomTemplate;
  storeSlug: string;
};

const ALLOWED_REF_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_REF_BYTES = 5 * 1024 * 1024;

export function CustomerCustomOrderForm({ template, storeSlug }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selections, setSelections] = useState<CustomOrderSelections>({});
  const quantity = (selections.fld_qty as number) ?? 1;
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [referenceImage, setReferenceImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<{ orderId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const breakdown: PriceBreakdown = useMemo(
    () => calculatePrice(template, selections, quantity),
    [template, selections, quantity],
  );

  function setField(
    fieldId: string,
    value: string | string[] | number,
  ) {
    setSelections((prev) => ({ ...prev, [fieldId]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }

  function toggleMultiOption(fieldId: string, label: string) {
    setSelections((prev) => {
      const current = (prev[fieldId] as string[]) ?? [];
      const next = current.includes(label)
        ? current.filter((l) => l !== label)
        : [...current, label];
      return { ...prev, [fieldId]: next };
    });
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_REF_MIME.has(file.type)) {
      setError(
        "Use a JPG, PNG, WebP, or GIF. SVG and other formats are not allowed.",
      );
      e.target.value = "";
      return;
    }
    if (file.size > MAX_REF_BYTES) {
      setError("Image must be under 5MB");
      e.target.value = "";
      return;
    }
    setUploading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImage(reader.result as string);
      setUploading(false);
    };
    reader.onerror = () => {
      setError("Failed to read image");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await submitCustomerCustomOrder(storeSlug, {
        templateId: template.id,
        customerName,
        customerPhone,
        customerEmail,
        selections,
        quantity,
        specialInstructions,
        preferredDate,
        referenceImage,
      });
      if (result.ok) {
        setSuccess({ orderId: result.orderId });
      } else {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      }
    });
  }

  if (success) {
    return (
      <div className="text-center py-12 space-y-4 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
          <ShoppingBag className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-[20px] font-bold text-ink">Order submitted!</h2>
        <p className="text-[14px] text-ink/60">
          The shop will review and confirm on WhatsApp. Keep your order ID handy.
        </p>
        <div className="inline-flex items-center gap-2 rounded-full bg-ink/[0.04] px-4 py-2">
          <span className="text-[12px] text-ink/50">Order ID:</span>
          <span className="text-[13px] font-mono font-semibold text-ink">
            {success.orderId}
          </span>
        </div>
      </div>
    );
  }

  function renderField(field: CustomField) {
    const err = fieldErrors[field.id];

    if (field.type === "single_select") {
      return (
        <div className="space-y-1.5">
          {field.options.map((opt) => {
            const isSelected = selections[field.id] === opt.label;
            return (
              <label
                key={opt.label}
                className={
                  "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all " +
                  (isSelected
                    ? "border-vermillion/30 bg-vermillion/[0.04]"
                    : "border-ink/10 hover:bg-ink/[0.02]")
                }
              >
                <input
                  type="radio"
                  name={field.id}
                  checked={isSelected}
                  onChange={() => setField(field.id, opt.label)}
                  className="sr-only"
                />
                <div
                  className={
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 " +
                    (isSelected ? "border-vermillion" : "border-ink/25")
                  }
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-vermillion" />
                  )}
                </div>
                <span className="text-[13.5px] text-ink flex-1">
                  {opt.label}
                </span>
                {opt.price > 0 && (
                  <span className="text-[12px] font-medium text-ink/50">
                    +{formatINR(opt.price)}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      );
    }

    if (field.type === "multi_select") {
      const selected = (selections[field.id] as string[]) ?? [];
      return (
        <div className="space-y-1.5">
          {field.options.map((opt) => {
            const isChecked = selected.includes(opt.label);
            return (
              <label
                key={opt.label}
                className={
                  "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all " +
                  (isChecked
                    ? "border-vermillion/30 bg-vermillion/[0.04]"
                    : "border-ink/10 hover:bg-ink/[0.02]")
                }
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleMultiOption(field.id, opt.label)}
                  className="sr-only"
                />
                <div
                  className={
                    "w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 " +
                    (isChecked
                      ? "border-vermillion bg-vermillion"
                      : "border-ink/25")
                  }
                >
                  {isChecked && (
                    <svg
                      className="w-3 h-3 text-bone"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-[13.5px] text-ink flex-1">
                  {opt.label}
                </span>
                {opt.price > 0 && (
                  <span className="text-[12px] font-medium text-ink/50">
                    +{formatINR(opt.price)}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      );
    }

    if (field.type === "text") {
      return (
        <Textarea
          placeholder={field.placeholder || "Type here..."}
          value={(selections[field.id] as string) ?? ""}
          onChange={(e) => setField(field.id, e.target.value)}
          rows={3}
          className={err ? "border-vermillion/50" : ""}
        />
      );
    }

    if (field.type === "number") {
      return (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const current = (selections[field.id] as number) || 1;
              if (current > 1) setField(field.id, current - 1);
            }}
            className="w-10 h-10 rounded-full border border-ink/15 flex items-center justify-center text-ink/60 hover:bg-ink/[0.04] text-lg"
          >
            −
          </button>
          <Input
            type="number"
            min={1}
            max={20}
            value={(selections[field.id] as number) ?? 1}
            onChange={(e) => setField(field.id, parseInt(e.target.value) || 1)}
            className="w-20 text-center"
          />
          <button
            type="button"
            onClick={() => {
              const current = (selections[field.id] as number) || 1;
              if (current < 20) setField(field.id, current + 1);
            }}
            className="w-10 h-10 rounded-full border border-ink/15 flex items-center justify-center text-ink/60 hover:bg-ink/[0.04] text-lg"
          >
            +
          </button>
        </div>
      );
    }

    if (field.type === "date") {
      return (
        <Input
          type="date"
          value={(selections[field.id] as string) ?? ""}
          onChange={(e) => setField(field.id, e.target.value)}
          className={err ? "border-vermillion/50" : ""}
        />
      );
    }

    return null;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {template.fields.map((field) => (
        <div key={field.id}>
          <label className="text-[13px] font-semibold text-ink mb-2 block">
            {field.label}
            {field.required && (
              <span className="text-vermillion ml-0.5">*</span>
            )}
          </label>
          {renderField(field)}
          {field.helpText && (
            <p className="text-[11px] text-ink/40 mt-1.5">{field.helpText}</p>
          )}
          {fieldErrors[field.id] && (
            <p className="text-[11px] text-vermillion mt-1">
              {fieldErrors[field.id]}
            </p>
          )}
        </div>
      ))}

      <div>
        <label className="text-[13px] font-semibold text-ink mb-2 block">
          Reference Image
          <span className="text-[11px] font-normal text-ink/40 ml-2">
            (optional)
          </span>
        </label>
        {referenceImage ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={referenceImage}
              alt="Reference"
              className="w-24 h-32 object-cover rounded-lg border border-ink/10"
            />
            <button
              type="button"
              onClick={() => setReferenceImage("")}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-ink text-bone flex items-center justify-center"
              aria-label="Remove reference image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center gap-3 p-4 rounded-xl border border-dashed border-ink/15 hover:border-ink/25 cursor-pointer transition-colors text-left"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 text-ink/30 animate-spin" />
            ) : (
              <Upload className="h-5 w-5 text-ink/30" />
            )}
            <div>
              <p className="text-[13px] text-ink/60">
                {uploading ? "Uploading..." : "Upload a reference image"}
              </p>
              <p className="text-[11px] text-ink/35">
                JPG, PNG, WebP, GIF — max 5MB
              </p>
            </div>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      <div>
        <label className="text-[13px] font-semibold text-ink mb-2 block">
          Special Instructions
          <span className="text-[11px] font-normal text-ink/40 ml-2">
            (optional)
          </span>
        </label>
        <Textarea
          placeholder="Any other details the seller should know..."
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          rows={2}
        />
      </div>

      <div>
        <label className="text-[13px] font-semibold text-ink mb-2 block">
          Preferred Date
          <span className="text-[11px] font-normal text-ink/40 ml-2">
            (optional)
          </span>
        </label>
        <Input
          type="date"
          value={preferredDate}
          onChange={(e) => setPreferredDate(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-[13px] font-semibold text-ink">Your Details</h3>
        <div>
          <label className="text-[11px] font-medium text-ink/60 mb-1 block">
            Name *
          </label>
          <Input
            placeholder="Your name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className={fieldErrors.customerName ? "border-vermillion/50" : ""}
          />
          {fieldErrors.customerName && (
            <p className="text-[11px] text-vermillion mt-1">
              {fieldErrors.customerName}
            </p>
          )}
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink/60 mb-1 block">
            Phone *
          </label>
          <Input
            placeholder="+91 98765 43210"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className={fieldErrors.customerPhone ? "border-vermillion/50" : ""}
          />
          {fieldErrors.customerPhone && (
            <p className="text-[11px] text-vermillion mt-1">
              {fieldErrors.customerPhone}
            </p>
          )}
        </div>
        <div>
          <label className="text-[11px] font-medium text-ink/60 mb-1 block">
            Email <span className="text-ink/35">(optional)</span>
          </label>
          <Input
            type="email"
            placeholder="your@email.com"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-bone p-5">
        <h3 className="text-[13px] font-semibold text-ink mb-3">
          Price Breakdown
        </h3>

        {breakdown.basePrice > 0 && (
          <div className="flex justify-between text-[13px] py-1">
            <span className="text-ink/60">Base price</span>
            <span className="text-ink tabular-nums">
              {formatINR(breakdown.basePrice)}
            </span>
          </div>
        )}

        {breakdown.lines.map((line) => (
          <div
            key={`${line.fieldId}-${line.selectedLabel}`}
            className="flex justify-between text-[13px] py-1"
          >
            <span className="text-ink/60">
              {line.fieldLabel}: {line.selectedLabel}
            </span>
            <span className="text-ink tabular-nums">
              +{formatINR(line.price)}
            </span>
          </div>
        ))}

        {breakdown.lines.length === 0 && breakdown.basePrice === 0 && (
          <p className="text-[12px] text-ink/40 py-1">
            Select options to see pricing
          </p>
        )}

        {breakdown.quantity > 1 && (
          <>
            <div className="border-t border-ink/10 my-2" />
            <div className="flex justify-between text-[13px] py-1">
              <span className="text-ink/60">Subtotal</span>
              <span className="text-ink tabular-nums">
                {formatINR(breakdown.basePrice + breakdown.optionsTotal)}
              </span>
            </div>
            <div className="flex justify-between text-[13px] py-1">
              <span className="text-ink/60">Quantity</span>
              <span className="text-ink tabular-nums">×{breakdown.quantity}</span>
            </div>
          </>
        )}

        <div className="border-t border-ink/10 mt-2 pt-2">
          <div className="flex justify-between">
            <span className="text-[15px] font-bold text-ink">Total</span>
            <span className="text-[20px] font-bold text-ink tabular-nums">
              {formatINR(breakdown.total)}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-vermillion/[0.06] border border-vermillion/20 p-3 text-[13px] text-vermillion">
          {error}
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={
          pending ||
          !customerName.trim() ||
          !customerPhone.trim() ||
          breakdown.total <= 0
        }
        className="w-full h-12 bg-vermillion hover:bg-vermillion-deep text-bone text-[14px] font-semibold rounded-full shadow-glow"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <ShoppingBag className="h-4 w-4 mr-2" />
        )}
        Place Custom Order — {formatINR(breakdown.total)}
      </Button>

      <p className="text-center text-[11px] text-ink/40">
        You&apos;ll pay via UPI after submitting. No card details needed.
      </p>
    </div>
  );
}