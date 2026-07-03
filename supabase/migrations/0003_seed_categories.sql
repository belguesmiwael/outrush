-- ═══════════════════════════════════════════════════════════════
-- OUTRUSH — Migration 0003 : seed catégories (univers outlet)
-- Idempotent : rejouable sans doublon (slug unique).
-- ═══════════════════════════════════════════════════════════════

INSERT INTO categories (slug, name, universe) VALUES
  ('beaute',   '{"fr":"Beauté","en":"Beauty","ar":"الجمال"}',          'beaute'),
  ('maquillage','{"fr":"Maquillage","en":"Makeup","ar":"مكياج"}',       'beaute'),
  ('parfums',  '{"fr":"Parfums","en":"Fragrance","ar":"عطور"}',         'beaute'),
  ('soin',     '{"fr":"Soin","en":"Skincare","ar":"العناية بالبشرة"}',  'beaute'),
  ('mode',     '{"fr":"Mode","en":"Fashion","ar":"موضة"}',             'mode'),
  ('chaussures','{"fr":"Chaussures","en":"Shoes","ar":"أحذية"}',        'mode'),
  ('accessoires','{"fr":"Accessoires","en":"Accessories","ar":"إكسسوارات"}','mode'),
  ('tech',     '{"fr":"Tech","en":"Tech","ar":"تقنية"}',               'tech'),
  ('audio',    '{"fr":"Audio","en":"Audio","ar":"صوتيات"}',            'tech'),
  ('maison',   '{"fr":"Maison","en":"Home","ar":"المنزل"}',            'maison'),
  ('cuisine',  '{"fr":"Cuisine","en":"Kitchen","ar":"مطبخ"}',          'maison'),
  ('sport',    '{"fr":"Sport","en":"Sport","ar":"رياضة"}',            'sport')
ON CONFLICT (slug) DO NOTHING;

-- Rattacher les sous-catégories à leur parent (par univers)
UPDATE categories child SET parent_id = parent.id
FROM categories parent
WHERE parent.slug = CASE child.universe
    WHEN 'beaute' THEN 'beaute'
    WHEN 'mode'   THEN 'mode'
    WHEN 'tech'   THEN 'tech'
    WHEN 'maison' THEN 'maison'
    ELSE NULL END
  AND child.slug <> parent.slug
  AND child.parent_id IS NULL
  AND parent.slug IN ('beaute','mode','tech','maison');
