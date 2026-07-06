"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Save,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CustomField, CustomFieldType, CustomFieldOption } from "@/types/custom-orders";

type FieldDraft = Omit<CustomField, "id"> & { id: string };

type Props = {
  initialName?: string;
  initialDescription?: string;
  initialImageUrl?: string;
  initialBasePrice?: number;
  initialFields?: CustomField[];
  onSave: (data: {
    name: string;
    description: string;
    imageUrl: string;
    basePrice: number;
    fields: CustomField[];
  }) => Promise<void>;
  saveLabel?: string;
  pending?: boolean;
};

function newField(type: CustomFieldType = "single_select"): FieldDraft {
  return {
    id: `fld_${Math.random().toString(36).slice(2, 10)}`,
    label: "",
    type,
    required: false,
    options: type === "single_select" || type === "multi_select"
      ? [{ label: "", price: 0 }]
      : [],
    displayOrder: 0,
  };
}

function OptionRow({
  option,
  onChange,
  onRemove,
}: {
  option: CustomFieldOption;
  onChange: (patch: Partial<CustomFieldOption>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Option label"
        value={option.label}
        onChange={(e) => onChange({ label: e.target.value })}
        className="flex-1"
      />
      <div className="flex items-center gap-1">
        <span className="text-[12px] text-ink/40">+</span>
        <Input
          type="number"
          min={0}
          max={1_000_000}
          step={1}
          placeholder="0"
          value={option.price || ""}
          onChange={(e) => {
            const raw = parseInt(e.target.value, 10);
            const safe = Number.isFinite(raw)
              ? Math.max(0, Math.min(1_000_000, raw))
              : 0;
            onChange({ price: safe });
          }}
          className="w-20 text-right"
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 text-ink/30 hover:text-vermillion transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function FieldCard({
  field,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  field: FieldDraft;
  index: number;
  total: number;
  onUpdate: (patch: Partial<FieldDraft>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasOptions = field.type === "single_select" || field.type === "multi_select";

  const fieldTypeLabel: Record<CustomFieldType, string> = {
    single_select: "Dropdown (single pick)",
    multi_select: "Checkboxes (multi pick)",
    number: "Number input",
    text: "Text input",
    date: "Date picker",
  };

  return (
    <div className="rounded-xl border border-ink/10 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-ink/[0.02]">
        <GripVertical className="h-4 w-4 text-ink/25 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-ink truncate">
            {field.label || `Field ${index + 1}`}
          </p>
          <p className="text-[11px] text-ink/45">{fieldTypeLabel[field.type]}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {field.required && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-vermillion bg-vermillion/10 px-1.5 py-0.5 rounded">
              Required
            </span>
          )}
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1 text-ink/30 hover:text-ink disabled:opacity-30"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-1 text-ink/30 hover:text-ink disabled:opacity-30"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-ink/30 hover:text-ink"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-ink/30 hover:text-vermillion"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-4 space-y-3 border-t border-ink/5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-ink/60 mb-1 block">
                Field Label
              </label>
              <Input
                placeholder="e.g., Size, Flavor, Add-ons"
                value={field.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-ink/60 mb-1 block">
                Field Type
              </label>
              <select
                value={field.type}
                onChange={(e) => {
                  const newType = e.target.value as CustomFieldType;
                  const patch: Partial<FieldDraft> = { type: newType };
                  if (newType === "single_select" || newType === "multi_select") {
                    if (!field.options || field.options.length === 0) {
                      patch.options = [{ label: "", price: 0 }];
                    }
                  } else {
                    patch.options = [];
                  }
                  onUpdate(patch);
                }}
                className="w-full h-10 rounded-lg border border-ink/15 bg-white px-3 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-vermillion/40"
              >
                <option value="single_select">Dropdown (single pick)</option>
                <option value="multi_select">Checkboxes (multi pick)</option>
                <option value="number">Number input</option>
                <option value="text">Text input</option>
                <option value="date">Date picker</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => onUpdate({ required: e.target.checked })}
                className="rounded border-ink/20 text-vermillion focus:ring-vermillion/40"
              />
              <span className="text-[12px] text-ink/60">Required</span>
            </label>
          </div>

          {(field.type === "text" || field.type === "number" || field.type === "date") && (
            <div>
              <label className="text-[11px] font-medium text-ink/60 mb-1 block">
                Placeholder
              </label>
              <Input
                placeholder="Optional placeholder text"
                value={field.placeholder ?? ""}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-medium text-ink/60 mb-1 block">
              Help Text (optional)
            </label>
            <Input
              placeholder="Shown below the field to guide customers"
              value={field.helpText ?? ""}
              onChange={(e) => onUpdate({ helpText: e.target.value })}
            />
          </div>

          {hasOptions && (
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-ink/60 block">
                Options & Prices
              </label>
              {(field.options ?? []).map((opt, oi) => (
                <OptionRow
                  key={oi}
                  option={opt}
                  onChange={(patch) => {
                    const newOptions = [...(field.options ?? [])];
                    newOptions[oi] = { ...newOptions[oi], ...patch };
                    onUpdate({ options: newOptions });
                  }}
                  onRemove={() => {
                    const newOptions = (field.options ?? []).filter((_, i) => i !== oi);
                    onUpdate({ options: newOptions });
                  }}
                />
              ))}
              <button
                type="button"
                onClick={() =>
                  onUpdate({
                    options: [...(field.options ?? []), { label: "", price: 0 }],
                  })
                }
                className="flex items-center gap-1 text-[12px] text-vermillion hover:text-vermillion-deep font-medium"
              >
                <Plus className="h-3 w-3" /> Add option
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TemplateBuilder({
  initialName = "",
  initialDescription = "",
  initialImageUrl = "",
  initialBasePrice = 0,
  initialFields = [],
  onSave,
  saveLabel = "Save Template",
  pending = false,
}: Props) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [basePrice, setBasePrice] = useState(initialBasePrice);
  const [fields, setFields] = useState<FieldDraft[]>(
    initialFields.length > 0
      ? initialFields.map((f, i) => ({ ...f, displayOrder: i }))
      : []
  );
  const [showPreview, setShowPreview] = useState(false);

  function addField(type: CustomFieldType) {
    setFields((prev) => [...prev, { ...newField(type), displayOrder: prev.length }]);
  }

  function updateField(index: number, patch: Partial<FieldDraft>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((prev) => {
      const newFields = [...prev];
      const swapIdx = index + direction;
      if (swapIdx < 0 || swapIdx >= newFields.length) return prev;
      [newFields[index], newFields[swapIdx]] = [newFields[swapIdx], newFields[index]];
      return newFields.map((f, i) => ({ ...f, displayOrder: i }));
    });
  }

  async function handleSave() {
    await onSave({
      name,
      description,
      imageUrl,
      basePrice,
      fields: fields.map((f, i) => ({ ...f, displayOrder: i })),
    });
  }

  return (
    <div className="space-y-6">
      {/* Template Info */}
      <div className="rounded-xl border border-ink/10 bg-white p-5 space-y-4">
        <h3 className="text-[14px] font-semibold text-ink">Template Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-[11px] font-medium text-ink/60 mb-1 block">
              Template Name *
            </label>
            <Input
              placeholder="e.g., Build Your Bouquet, Custom Cake"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] font-medium text-ink/60 mb-1 block">
              Description
            </label>
            <Textarea
              placeholder="Describe what customers can customize..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink/60 mb-1 block">
              Cover Image URL
            </label>
            <Input
              placeholder="https://images.unsplash.com/..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            {imageUrl && (
              <div className="mt-2 relative w-20 h-24 rounded-lg overflow-hidden border border-ink/10">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
          <div>
            <label className="text-[11px] font-medium text-ink/60 mb-1 block">
              Base Price (₹)
            </label>
            <Input
              type="number"
              min={0}
              max={1_000_000}
              step={1}
              placeholder="0"
              value={basePrice || ""}
              onChange={(e) => {
                const raw = parseInt(e.target.value, 10);
                const safe = Number.isFinite(raw)
                  ? Math.max(0, Math.min(1_000_000, raw))
                  : 0;
                setBasePrice(safe);
              }}
            />
            <p className="text-[11px] text-ink/40 mt-1">
              Starting price before any options are selected
            </p>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-ink">
            Form Fields ({fields.length})
          </h3>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="h-8 text-[11px]"
            >
              <Eye className="h-3 w-3 mr-1" />
              {showPreview ? "Edit" : "Preview"}
            </Button>
          </div>
        </div>

        {showPreview ? (
          <TemplatePreview
            name={name}
            description={description}
            imageUrl={imageUrl}
            basePrice={basePrice}
            fields={fields.map((f, i) => ({ ...f, displayOrder: i }))}
          />
        ) : (
          <>
            {fields.map((field, index) => (
              <FieldCard
                key={field.id}
                field={field}
                index={index}
                total={fields.length}
                onUpdate={(patch) => updateField(index, patch)}
                onRemove={() => removeField(index)}
                onMoveUp={() => moveField(index, -1)}
                onMoveDown={() => moveField(index, 1)}
              />
            ))}

            {/* Add Field Buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              {([
                ["single_select", "Dropdown"],
                ["multi_select", "Checkboxes"],
                ["number", "Number"],
                ["text", "Text"],
                ["date", "Date"],
              ] as const).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addField(type)}
                  className="flex items-center gap-1.5 rounded-full border border-dashed border-ink/20 px-3 py-1.5 text-[11px] font-medium text-ink/50 hover:border-vermillion hover:text-vermillion transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Save */}
      {!showPreview && (
        <div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={handleSave}
            disabled={pending || !name.trim()}
            className="bg-vermillion hover:bg-vermillion-deep text-bone"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saveLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Preview Component ────────────────────────────────────────────

function TemplatePreview({
  name,
  description,
  imageUrl,
  basePrice,
  fields,
}: {
  name: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  fields: CustomField[];
}) {
  const [selections, setSelections] = useState<Record<string, unknown>>({});

  function getPreviewTotal() {
    let total = basePrice;
    for (const field of fields) {
      if (field.type === "single_select") {
        const val = selections[field.id] as string;
        if (val) {
          const opt = field.options.find((o) => o.label === val);
          if (opt) total += opt.price;
        }
      } else if (field.type === "multi_select") {
        const vals = (selections[field.id] as string[]) ?? [];
        for (const v of vals) {
          const opt = field.options.find((o) => o.label === v);
          if (opt) total += opt.price;
        }
      }
    }
    return total;
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-ink/15 bg-bone p-6 space-y-5">
      <div className="text-center">
        <p className="eyebrow text-ink/40">Customer Preview</p>
        <p className="text-[18px] font-semibold text-ink mt-1">
          {name || "Untitled Template"}
        </p>
        {description && (
          <p className="text-[13px] text-ink/55 mt-1">{description}</p>
        )}
      </div>

      {imageUrl && (
        <div className="w-full h-40 rounded-lg overflow-hidden">
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {basePrice > 0 && (
        <div className="text-center text-[13px] text-ink/55">
          Starting from <span className="font-semibold text-ink">₹{basePrice}</span>
        </div>
      )}

      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.id}>
            <label className="text-[12px] font-medium text-ink mb-1.5 block">
              {field.label}
              {field.required && <span className="text-vermillion ml-0.5">*</span>}
            </label>
            {field.type === "single_select" && (
              <div className="space-y-1.5">
                {field.options.map((opt) => (
                  <label
                    key={opt.label}
                    className="flex items-center gap-2 p-2 rounded-lg border border-ink/10 hover:bg-ink/[0.02] cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={field.id}
                      checked={selections[field.id] === opt.label}
                      onChange={() =>
                        setSelections((prev) => ({ ...prev, [field.id]: opt.label }))
                      }
                      className="text-vermillion focus:ring-vermillion/40"
                    />
                    <span className="text-[13px] text-ink flex-1">{opt.label}</span>
                    {opt.price > 0 && (
                      <span className="text-[11px] text-ink/40">+₹{opt.price}</span>
                    )}
                  </label>
                ))}
              </div>
            )}
            {field.type === "multi_select" && (
              <div className="space-y-1.5">
                {field.options.map((opt) => {
                  const vals = (selections[field.id] as string[]) ?? [];
                  const checked = vals.includes(opt.label);
                  return (
                    <label
                      key={opt.label}
                      className="flex items-center gap-2 p-2 rounded-lg border border-ink/10 hover:bg-ink/[0.02] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const newVals = checked
                            ? vals.filter((v) => v !== opt.label)
                            : [...vals, opt.label];
                          setSelections((prev) => ({ ...prev, [field.id]: newVals }));
                        }}
                        className="rounded border-ink/20 text-vermillion focus:ring-vermillion/40"
                      />
                      <span className="text-[13px] text-ink flex-1">{opt.label}</span>
                      {opt.price > 0 && (
                        <span className="text-[11px] text-ink/40">+₹{opt.price}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
            {field.type === "text" && (
              <Input placeholder={field.placeholder || "Type here..."} />
            )}
            {field.type === "number" && (
              <Input type="number" placeholder={field.placeholder || "1"} min={1} />
            )}
            {field.type === "date" && <Input type="date" />}
            {field.helpText && (
              <p className="text-[11px] text-ink/40 mt-1">{field.helpText}</p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-ink/[0.03] border border-ink/10 p-4 text-center">
        <p className="text-[12px] text-ink/50 mb-1">Estimated Total</p>
        <p className="text-[22px] font-bold text-ink">₹{getPreviewTotal()}</p>
      </div>
    </div>
  );
}
