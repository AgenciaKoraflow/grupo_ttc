-- ============================================
-- MIGRAÇÃO 005: Módulo de Materiais
-- Execute após 004_audit_and_fix.sql
-- ============================================

-- Tabela: materials
CREATE TABLE IF NOT EXISTS materials (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  unit        VARCHAR(100) NOT NULL,
  ativo       BOOLEAN DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: occurrence_materials
CREATE TABLE IF NOT EXISTS occurrence_materials (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ocorrencia_id UUID NOT NULL REFERENCES ocorrencias(id) ON DELETE CASCADE,
  material_id   UUID NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  quantity      NUMERIC(10, 3) NOT NULL CHECK (quantity > 0),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_occurrence_materials_ocorrencia ON occurrence_materials(ocorrencia_id);
CREATE INDEX IF NOT EXISTS idx_occurrence_materials_material ON occurrence_materials(material_id);

-- RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE occurrence_materials ENABLE ROW LEVEL SECURITY;

-- Políticas: materials
DROP POLICY IF EXISTS "materials_select_authenticated" ON materials;
CREATE POLICY "materials_select_authenticated"
  ON materials FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "materials_insert_admin_supervisor" ON materials;
CREATE POLICY "materials_insert_admin_supervisor"
  ON materials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

DROP POLICY IF EXISTS "materials_update_admin_supervisor" ON materials;
CREATE POLICY "materials_update_admin_supervisor"
  ON materials FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
    )
  );

DROP POLICY IF EXISTS "materials_delete_admin" ON materials;
CREATE POLICY "materials_delete_admin"
  ON materials FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas: occurrence_materials
DROP POLICY IF EXISTS "occurrence_materials_select_authenticated" ON occurrence_materials;
CREATE POLICY "occurrence_materials_select_authenticated"
  ON occurrence_materials FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "occurrence_materials_insert_authenticated" ON occurrence_materials;
CREATE POLICY "occurrence_materials_insert_authenticated"
  ON occurrence_materials FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "occurrence_materials_delete_authenticated" ON occurrence_materials;
CREATE POLICY "occurrence_materials_delete_authenticated"
  ON occurrence_materials FOR DELETE
  TO authenticated
  USING (true);

-- Seed: materiais iniciais
INSERT INTO materials (name, unit, ativo) VALUES
  ('Arame de agrupar', 'bobina', true),
  ('Tubo plástico', 'metro', true),
  ('Fio de espinar', 'metro', true),
  ('Fita de aço', 'metro', true),
  ('Fecho de aço', 'unidade', true),
  ('Espaçador de cano subida', 'unidade', true),
  ('Abraçadeira de aço', 'unidade', true),
  ('Fita plástica', 'metro', true),
  ('Cabeça de fixação', 'unidade', true),
  ('Massa de calafetar', 'kg', true),
  ('Estopa', 'kg', true),
  ('Cano PVC branco cortado', 'unidade', true),
  ('Concreto', 'kg', true)
ON CONFLICT DO NOTHING;
