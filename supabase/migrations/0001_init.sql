-- ═══════════════════════════════════════════════════════════════
-- OUTRUSH — Migration initiale (schéma public, projet Supabase dédié)
-- Isolation par RÔLE (app standalone) : admin / operator / supplier / buyer
-- ═══════════════════════════════════════════════════════════════

-- ── ENUMS ────────────────────────────────────────────────────────
CREATE TYPE product_status AS ENUM ('draft','pending_review','published','archived');
CREATE TYPE stock_class    AS ENUM ('hero','stable','dormant','new');
CREATE TYPE scan_status    AS ENUM ('queued','enriching','ready','not_found','duplicate','published');
CREATE TYPE order_status   AS ENUM ('pending','paid','shipped','delivered','cancelled','refunded');

-- ── Helper rôle (lu depuis app_metadata — jamais user_metadata) ──
CREATE OR REPLACE FUNCTION public.jwt_role() RETURNS TEXT
LANGUAGE sql STABLE AS
$$ SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'buyer') $$;

-- ── CATEGORIES ───────────────────────────────────────────────────
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT UNIQUE NOT NULL,
  name       JSONB NOT NULL,                 -- {fr,en,ar}
  parent_id  UUID REFERENCES categories(id),
  universe   TEXT,                           -- beauté / mode / tech / maison…
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat_public_read" ON categories FOR SELECT USING (true);
CREATE POLICY "cat_staff_write" ON categories FOR ALL
  USING (jwt_role() IN ('admin','operator'))
  WITH CHECK (jwt_role() IN ('admin','operator'));

-- ── PRODUCTS ─────────────────────────────────────────────────────
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gtin            TEXT UNIQUE,                 -- clé anti-doublon
  slug            TEXT UNIQUE NOT NULL,
  title           JSONB NOT NULL,              -- {fr,en,ar}
  description     JSONB,
  brand           TEXT,
  category_id     UUID REFERENCES categories(id),
  specs           JSONB DEFAULT '{}',
  images          JSONB DEFAULT '[]',          -- paths Storage product-media
  condition       TEXT NOT NULL DEFAULT 'new' CHECK (condition IN ('new','like_new','box_damaged')),
  provenance      TEXT,
  market_price    NUMERIC(12,2) CHECK (market_price IS NULL OR market_price >= 0),
  market_sources  JSONB DEFAULT '[]',          -- [{source,url,price,seen_at}]
  outlet_price    NUMERIC(12,2) NOT NULL CHECK (outlet_price >= 0),
  currency        TEXT NOT NULL DEFAULT 'USD',
  quantity        INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  stock_class     stock_class DEFAULT 'new',
  velocity_14d    NUMERIC(8,3) DEFAULT 0,
  velocity_30d    NUMERIC(8,3) DEFAULT 0,
  velocity_90d    NUMERIC(8,3) DEFAULT 0,
  supplier_id     UUID REFERENCES auth.users(id),
  status          product_status DEFAULT 'draft',
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_products_status_class ON products(status, stock_class);
CREATE INDEX idx_products_category ON products(category_id);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_published" ON products FOR SELECT
  USING (status = 'published' OR jwt_role() IN ('admin','operator'));
CREATE POLICY "supplier_read_own" ON products FOR SELECT
  USING (jwt_role() = 'supplier' AND supplier_id = auth.uid());
CREATE POLICY "staff_write" ON products FOR ALL
  USING (jwt_role() IN ('admin','operator'))
  WITH CHECK (jwt_role() IN ('admin','operator'));

-- ── SCAN EVENTS (journal immuable Scan-to-Store) ────────────────
CREATE TABLE scan_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL,
  code_type     TEXT NOT NULL CHECK (code_type IN ('ean13','upca','qr','manual')),
  status        scan_status DEFAULT 'queued',
  enrichment    JSONB DEFAULT '{}',
  api_costs     JSONB DEFAULT '{}',
  product_id    UUID REFERENCES products(id),
  operator_id   UUID NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_scan_events_status ON scan_events(status, created_at DESC);
ALTER TABLE scan_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scan_staff_select" ON scan_events FOR SELECT
  USING (jwt_role() IN ('admin','operator'));
CREATE POLICY "scan_staff_insert" ON scan_events FOR INSERT
  WITH CHECK (jwt_role() IN ('admin','operator') AND operator_id = auth.uid());
-- Statut mis à jour uniquement par le pipeline serveur (service_role) → pas de policy UPDATE/DELETE.

-- ── INVENTORY MOVEMENTS (ledger append-only, source de vérité) ──
CREATE TABLE inventory_movements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id),
  delta       INTEGER NOT NULL,
  reason      TEXT NOT NULL CHECK (reason IN ('scan_in','sale','flash_claim','flash_release','adjust','supplier_in')),
  ref_id      UUID,
  actor_id    UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_inv_product ON inventory_movements(product_id, created_at DESC);
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_staff_select" ON inventory_movements FOR SELECT
  USING (jwt_role() IN ('admin','operator'));
CREATE POLICY "inv_staff_insert" ON inventory_movements FOR INSERT
  WITH CHECK (jwt_role() IN ('admin','operator'));
-- Append-only : aucune policy UPDATE/DELETE, pour personne.

-- Trigger : quantity de products dérivée du ledger, jamais éditée à la main
CREATE OR REPLACE FUNCTION apply_inventory_movement() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE products
     SET quantity = quantity + NEW.delta, updated_at = NOW()
   WHERE id = NEW.product_id AND quantity + NEW.delta >= 0;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'inventory_underflow product=%', NEW.product_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_apply_inventory
  BEFORE INSERT ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION apply_inventory_movement();

-- ── PACKS ────────────────────────────────────────────────────────
CREATE TABLE packs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  title         JSONB NOT NULL,
  narrative     JSONB,
  composed_img  TEXT,
  pack_price    NUMERIC(12,2) NOT NULL CHECK (pack_price >= 0),
  status        product_status DEFAULT 'draft',
  suggested_by  TEXT DEFAULT 'ai' CHECK (suggested_by IN ('ai','manual')),
  performance   JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packs_public_read" ON packs FOR SELECT
  USING (status = 'published' OR jwt_role() IN ('admin','operator'));
CREATE POLICY "packs_staff_write" ON packs FOR ALL
  USING (jwt_role() IN ('admin','operator'))
  WITH CHECK (jwt_role() IN ('admin','operator'));

CREATE TABLE pack_items (
  pack_id     UUID REFERENCES packs(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id),
  qty         INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
  role        TEXT NOT NULL CHECK (role IN ('hero','dormant')),
  PRIMARY KEY (pack_id, product_id)
);
ALTER TABLE pack_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pack_items_read" ON pack_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM packs p WHERE p.id = pack_id
          AND (p.status = 'published' OR jwt_role() IN ('admin','operator')))
);
CREATE POLICY "pack_items_staff_write" ON pack_items FOR ALL
  USING (jwt_role() IN ('admin','operator'))
  WITH CHECK (jwt_role() IN ('admin','operator'));

CREATE TABLE pack_suggestions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_id      UUID REFERENCES products(id),
  dormant_ids  UUID[] NOT NULL,
  compat_score NUMERIC(4,3),
  margin_sim   JSONB,
  status       TEXT DEFAULT 'proposed' CHECK (status IN ('proposed','accepted','dismissed')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE pack_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sugg_staff_all" ON pack_suggestions FOR ALL
  USING (jwt_role() IN ('admin','operator'))
  WITH CHECK (jwt_role() IN ('admin','operator'));

-- ── VENTES FLASH ─────────────────────────────────────────────────
CREATE TABLE flash_sales (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       JSONB NOT NULL,
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,           -- source de vérité des chronos
  status      TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);
ALTER TABLE flash_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flash_public_read" ON flash_sales FOR SELECT USING (true);
CREATE POLICY "flash_staff_write" ON flash_sales FOR ALL
  USING (jwt_role() IN ('admin','operator'))
  WITH CHECK (jwt_role() IN ('admin','operator'));

CREATE TABLE flash_sale_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flash_sale_id  UUID NOT NULL REFERENCES flash_sales(id) ON DELETE CASCADE,
  product_id     UUID REFERENCES products(id),
  pack_id        UUID REFERENCES packs(id),
  flash_price    NUMERIC(12,2) NOT NULL CHECK (flash_price >= 0),
  allocated_qty  INTEGER NOT NULL CHECK (allocated_qty > 0),
  remaining_qty  INTEGER NOT NULL CHECK (remaining_qty >= 0),
  CHECK (num_nonnulls(product_id, pack_id) = 1)
);
ALTER TABLE flash_sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flash_items_public_read" ON flash_sale_items FOR SELECT USING (true);
CREATE POLICY "flash_items_staff_write" ON flash_sale_items FOR ALL
  USING (jwt_role() IN ('admin','operator'))
  WITH CHECK (jwt_role() IN ('admin','operator'));

-- Réservation atomique anti-survente / anti-bot
CREATE OR REPLACE FUNCTION claim_flash_stock(p_item UUID, p_qty INT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 OR p_qty > 10 THEN
    RETURN FALSE;
  END IF;
  UPDATE flash_sale_items fsi
     SET remaining_qty = remaining_qty - p_qty
   WHERE fsi.id = p_item
     AND fsi.remaining_qty >= p_qty
     AND EXISTS (
       SELECT 1 FROM flash_sales f
        WHERE f.id = fsi.flash_sale_id
          AND now() BETWEEN f.starts_at AND f.ends_at
     );
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION claim_flash_stock(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_flash_stock(UUID, INT) TO authenticated;

-- Restitution (expiration panier 10 min, appelée par cron service_role)
CREATE OR REPLACE FUNCTION release_flash_stock(p_item UUID, p_qty INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN RETURN; END IF;
  UPDATE flash_sale_items
     SET remaining_qty = LEAST(remaining_qty + p_qty, allocated_qty)
   WHERE id = p_item;
END $$;
REVOKE ALL ON FUNCTION release_flash_stock(UUID, INT) FROM PUBLIC;

-- Réservations panier flash (expirent à +10 min)
CREATE TABLE flash_reservations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES flash_sale_items(id),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  qty         INTEGER NOT NULL CHECK (qty > 0 AND qty <= 10),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
  consumed    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE flash_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resa_own" ON flash_reservations FOR SELECT
  USING (user_id = auth.uid() OR jwt_role() IN ('admin','operator'));

-- ── COMMANDES ────────────────────────────────────────────────────
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id),
  status           order_status DEFAULT 'pending',
  currency         TEXT NOT NULL DEFAULT 'USD',
  subtotal         NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping         NUMERIC(12,2) NOT NULL DEFAULT 0,
  total            NUMERIC(12,2) NOT NULL DEFAULT 0,
  stripe_pi        TEXT,                       -- payment intent id
  shipping_address JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_own_read" ON orders FOR SELECT
  USING (user_id = auth.uid() OR jwt_role() IN ('admin','operator'));
-- INSERT/UPDATE via service_role uniquement (Server Actions + webhooks Stripe)

CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id),
  pack_id     UUID REFERENCES packs(id),
  qty         INTEGER NOT NULL CHECK (qty > 0),
  unit_price  NUMERIC(12,2) NOT NULL,
  CHECK (num_nonnulls(product_id, pack_id) = 1)
);
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_own_read" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id
          AND (o.user_id = auth.uid() OR jwt_role() IN ('admin','operator')))
);

-- ── WISHLIST / ALERTES PRIX ─────────────────────────────────────
CREATE TABLE wishlists (
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  product_id  UUID NOT NULL REFERENCES products(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wishlist_own" ON wishlists FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE price_alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  product_id    UUID NOT NULL REFERENCES products(id),
  target_price  NUMERIC(12,2),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts_own" ON price_alerts FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── AVIS (uniquement après commande livrée) ─────────────────────
CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  product_id  UUID NOT NULL REFERENCES products(id),
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body        TEXT CHECK (char_length(body) <= 2000),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_public_read" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_verified_insert" ON reviews FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = auth.uid()
        AND o.status = 'delivered'
        AND oi.product_id = reviews.product_id
    )
  );

-- ── TAUX DE CHANGE ──────────────────────────────────────────────
CREATE TABLE fx_rates (
  currency    TEXT PRIMARY KEY,
  rate        NUMERIC(14,6) NOT NULL CHECK (rate > 0),  -- vs USD
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fx_public_read" ON fx_rates FOR SELECT USING (true);
-- écriture service_role (cron) uniquement

INSERT INTO fx_rates (currency, rate) VALUES
  ('USD', 1), ('EUR', 0.92), ('TND', 3.10), ('GBP', 0.79), ('AED', 3.67)
ON CONFLICT DO NOTHING;

-- ── CONFIG APP (marges cibles, plafond budget scan…) ────────────
CREATE TABLE app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_admin_all" ON app_settings FOR ALL
  USING (jwt_role() = 'admin') WITH CHECK (jwt_role() = 'admin');
CREATE POLICY "settings_staff_read" ON app_settings FOR SELECT
  USING (jwt_role() IN ('admin','operator'));

INSERT INTO app_settings (key, value) VALUES
  ('target_margin_pct', '35'),
  ('scan_daily_budget_usd', '5'),
  ('pack_discount_range', '{"min": 10, "max": 20}')
ON CONFLICT DO NOTHING;

-- ── AUTH HOOK : injecte le rôle dans le JWT ─────────────────────
-- À enregistrer dans Dashboard → Auth → Hooks → Custom Access Token
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE
  claims JSONB;
  user_role TEXT;
BEGIN
  SELECT raw_app_meta_data ->> 'role' INTO user_role
    FROM auth.users WHERE id = (event ->> 'user_id')::UUID;
  claims := event -> 'claims';
  claims := jsonb_set(
    claims, '{app_metadata,role}',
    to_jsonb(COALESCE(user_role, 'buyer'))
  );
  RETURN jsonb_set(event, '{claims}', claims);
END $$;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(JSONB) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(JSONB) FROM authenticated, anon, public;

-- ── REALTIME : diffusion du stock flash ─────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE flash_sale_items;
