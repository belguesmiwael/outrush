-- ═══════════════════════════════════════════════════════════════
-- OUTRUSH — Migration Jalon 2 : portail fournisseur (lots + dépôt)
-- ═══════════════════════════════════════════════════════════════

-- ── SUPPLIER LOTS ────────────────────────────────────────────────
CREATE TABLE supplier_lots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES auth.users(id),
  name        TEXT NOT NULL,
  note        TEXT,
  status      TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','reviewing','live','closed')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_lots_supplier ON supplier_lots(supplier_id, created_at DESC);
ALTER TABLE supplier_lots ENABLE ROW LEVEL SECURITY;

-- Le fournisseur ne voit et ne crée QUE ses lots ; le staff voit tout
CREATE POLICY "lots_supplier_select" ON supplier_lots FOR SELECT
  USING (
    (jwt_role() = 'supplier' AND supplier_id = auth.uid())
    OR jwt_role() IN ('admin','operator')
  );
CREATE POLICY "lots_supplier_insert" ON supplier_lots FOR INSERT
  WITH CHECK (jwt_role() = 'supplier' AND supplier_id = auth.uid());
CREATE POLICY "lots_staff_update" ON supplier_lots FOR UPDATE
  USING (jwt_role() IN ('admin','operator'))
  WITH CHECK (jwt_role() IN ('admin','operator'));

-- ── Rattachement des produits à un lot ───────────────────────────
ALTER TABLE products ADD COLUMN lot_id UUID REFERENCES supplier_lots(id);
CREATE INDEX idx_products_lot ON products(lot_id);

-- Le fournisseur peut DÉPOSER des produits : uniquement les siens,
-- uniquement en pending_review, uniquement rattachés à un de SES lots.
CREATE POLICY "supplier_insert_pending" ON products FOR INSERT
  WITH CHECK (
    jwt_role() = 'supplier'
    AND supplier_id = auth.uid()
    AND status = 'pending_review'
    AND lot_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM supplier_lots l
      WHERE l.id = lot_id AND l.supplier_id = auth.uid()
    )
  );
-- Pas d'UPDATE/DELETE fournisseur : après dépôt, seul le staff décide.
