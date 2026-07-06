-- Custom Orders Feature
-- Tables: custom_templates, custom_template_options, custom_orders

CREATE TABLE custom_templates (
  id TEXT PRIMARY KEY,
  store_slug TEXT NOT NULL REFERENCES stores(slug) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  base_price INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE custom_template_options (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES custom_templates(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('single_select','multi_select','number','text','date')),
  required BOOLEAN NOT NULL DEFAULT false,
  options JSONB NOT NULL DEFAULT '[]',
  placeholder TEXT,
  help_text TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE custom_orders (
  id TEXT PRIMARY KEY,
  store_slug TEXT NOT NULL REFERENCES stores(slug) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES custom_templates(id),
  template_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  selections JSONB NOT NULL DEFAULT '{}',
  calculated_price INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price INTEGER NOT NULL DEFAULT 0,
  reference_image TEXT,
  special_instructions TEXT,
  preferred_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending','awaiting_payment','awaiting_verification',
      'confirmed','fulfilled','rejected','expired','cancelled'
    )),
  seller_note TEXT,
  payment_screenshot TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_custom_templates_store ON custom_templates(store_slug);
CREATE INDEX idx_custom_template_options_template ON custom_template_options(template_id);
CREATE INDEX idx_custom_orders_store ON custom_orders(store_slug);
CREATE INDEX idx_custom_orders_status ON custom_orders(store_slug, status);
CREATE INDEX idx_custom_orders_template ON custom_orders(template_id);
CREATE INDEX idx_custom_orders_created ON custom_orders(store_slug, created_at DESC);

-- RLS policies (enable row-level security)
ALTER TABLE custom_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_template_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_orders ENABLE ROW LEVEL SECURITY;

-- Public read for active templates (storefront)
CREATE POLICY "Public can view active templates"
  ON custom_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public can view template options"
  ON custom_template_options FOR SELECT
  USING (true);

-- Service role full access (admin/seller operations use service_role)
CREATE POLICY "Service role full access on templates"
  ON custom_templates FOR ALL
  USING (true);

CREATE POLICY "Service role full access on options"
  ON custom_template_options FOR ALL
  USING (true);

CREATE POLICY "Service role full access on orders"
  ON custom_orders FOR ALL
  USING (true);

-- Public can insert custom orders (customer submits from storefront).
-- The server action also re-validates the template belongs to the
-- store before inserting, so this just allows anonymous writes.
CREATE POLICY "Public can insert custom orders"
  ON custom_orders FOR INSERT
  WITH CHECK (true);
