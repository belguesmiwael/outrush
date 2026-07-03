-- ═══════════════════════════════════════════════════════════════
-- OUTRUSH — Migration 0004 : relais scan téléphone → PC (QR pairing)
-- Le PC crée une session, affiche un QR ; le téléphone la rejoint et
-- pousse chaque code scanné. Transport temps réel : Supabase Realtime.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE scan_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token        TEXT UNIQUE NOT NULL,          -- identifiant opaque encodé dans le QR
  operator_id  UUID NOT NULL REFERENCES auth.users(id),
  paired_at    TIMESTAMPTZ,                   -- renseigné quand un téléphone rejoint
  expires_at   TIMESTAMPTZ NOT NULL,          -- 15 min après création
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_scan_sessions_token ON scan_sessions(token);
ALTER TABLE scan_sessions ENABLE ROW LEVEL SECURITY;

-- Le staff ne voit et ne gère QUE ses propres sessions.
CREATE POLICY "sessions_owner_select" ON scan_sessions FOR SELECT
  USING (jwt_role() IN ('admin','operator') AND operator_id = auth.uid());
CREATE POLICY "sessions_owner_insert" ON scan_sessions FOR INSERT
  WITH CHECK (jwt_role() IN ('admin','operator') AND operator_id = auth.uid());
CREATE POLICY "sessions_owner_update" ON scan_sessions FOR UPDATE
  USING (jwt_role() IN ('admin','operator') AND operator_id = auth.uid())
  WITH CHECK (jwt_role() IN ('admin','operator') AND operator_id = auth.uid());

-- Realtime pour recevoir le pairing (paired_at) côté PC.
ALTER PUBLICATION supabase_realtime ADD TABLE scan_sessions;
