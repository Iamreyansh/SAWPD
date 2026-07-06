import type {
  CustomTemplate,
  CustomOrderSelections,
} from "@/types/custom-orders";

// ── Price Calculator ──────────────────────────────────────────────

export type PriceBreakdownLine = {
  fieldId: string;
  fieldLabel: string;
  selectedLabel: string;
  price: number;
};

export type PriceBreakdown = {
  basePrice: number;
  lines: PriceBreakdownLine[];
  optionsTotal: number;
  quantity: number;
  total: number;
};

export function calculatePrice(
  template: CustomTemplate,
  selections: CustomOrderSelections,
  quantity: number = 1
): PriceBreakdown {
  const lines: PriceBreakdownLine[] = [];
  let optionsTotal = 0;

  for (const field of template.fields) {
    if (field.type === "single_select") {
      const selectedValue = selections[field.id] as string | undefined;
      if (selectedValue) {
        const option = field.options.find((o) => o.label === selectedValue);
        if (option && option.price > 0) {
          lines.push({
            fieldId: field.id,
            fieldLabel: field.label,
            selectedLabel: option.label,
            price: option.price,
          });
          optionsTotal += option.price;
        }
      }
    } else if (field.type === "multi_select") {
      const selectedValues = (selections[field.id] as string[]) ?? [];
      for (const val of selectedValues) {
        const option = field.options.find((o) => o.label === val);
        if (option && option.price > 0) {
          lines.push({
            fieldId: field.id,
            fieldLabel: field.label,
            selectedLabel: option.label,
            price: option.price,
          });
          optionsTotal += option.price;
        }
      }
    }
    // number, text, date fields don't affect price
  }

  const total = (template.basePrice + optionsTotal) * quantity;

  return {
    basePrice: template.basePrice,
    lines,
    optionsTotal,
    quantity,
    total,
  };
}

// ── Validation ───────────────────────────────────────────────────

export type ValidationError = {
  fieldId: string;
  message: string;
};

export function validateSelections(
  template: CustomTemplate,
  selections: CustomOrderSelections
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of template.fields) {
    if (!field.required) continue;

    const value = selections[field.id];

    if (field.type === "single_select") {
      if (!value || typeof value !== "string" || value === "") {
        errors.push({ fieldId: field.id, message: `${field.label} is required` });
      }
    } else if (field.type === "multi_select") {
      if (!Array.isArray(value) || value.length === 0) {
        errors.push({ fieldId: field.id, message: `Select at least one ${field.label}` });
      }
    } else if (field.type === "number") {
      if (value === undefined || value === null || value === "") {
        errors.push({ fieldId: field.id, message: `${field.label} is required` });
      }
    } else if (field.type === "text") {
      if (!value || typeof value !== "string" || value.trim() === "") {
        errors.push({ fieldId: field.id, message: `${field.label} is required` });
      }
    } else if (field.type === "date") {
      if (!value || typeof value !== "string" || value === "") {
        errors.push({ fieldId: field.id, message: `${field.label} is required` });
      }
    }
  }

  return errors;
}
