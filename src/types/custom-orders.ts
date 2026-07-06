export type CustomFieldType = "single_select" | "multi_select" | "number" | "text" | "date";

export type CustomFieldOption = {
  label: string;
  price: number;
};

export type CustomField = {
  id: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  options: CustomFieldOption[];
  placeholder?: string;
  helpText?: string;
  displayOrder: number;
};

export type CustomTemplate = {
  id: string;
  storeSlug: string;
  name: string;
  description: string;
  imageUrl: string;
  basePrice: number;
  fields: CustomField[];
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CustomOrderSelections = Record<string, string | string[] | number>;

export type CustomOrderStatus =
  | "pending"
  | "awaiting_payment"
  | "awaiting_verification"
  | "confirmed"
  | "fulfilled"
  | "rejected"
  | "expired"
  | "cancelled";

export type CustomOrder = {
  id: string;
  storeSlug: string;
  templateId: string;
  templateName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  selections: CustomOrderSelections;
  calculatedPrice: number;
  quantity: number;
  totalPrice: number;
  referenceImage?: string;
  specialInstructions?: string;
  preferredDate?: string;
  status: CustomOrderStatus;
  sellerNote?: string;
  paymentScreenshot?: string;
  createdAt: string;
  confirmedAt?: string;
  paidAt?: string;
  fulfilledAt?: string;
  rejectedAt?: string;
  expiredAt?: string;
};

export type CustomOrderStatusUpdate = {
  status: CustomOrderStatus;
  sellerNote?: string;
};
