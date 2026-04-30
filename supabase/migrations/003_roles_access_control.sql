-- ============================================
-- MIGRAÇÃO 003: Níveis de acesso (admin, supervisor, operador, viewer)
-- Execute após 001_create_tables.sql
-- ============================================

-- ─── 1. Tabela de Profiles ──────────────────────────────────────────────────
-- Cria a tabela de profiles vinculada ao auth.users do Supabase
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  role        VARCHAR(50)  NOT NULL DEFAULT 'operador'
                CHECK (role IN ('admin', 'supervisor', 'operador')),
  equipe_id   UUID REFERENCES equipes(id) ON DELETE SET NULL,
  must_change_password BOOLEAN DEFAULT false,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Se a tabela já existe e a constraint precisa ser atualizada:
DO $$
BEGIN
  -- Remove constraint antiga (apenas 'admin' | 'operador') se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles'
      AND constraint_name = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
  END IF;

  -- Adiciona nova constraint com todos os 4 roles
  ALTER TABLE profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'supervisor', 'operador'));
END $$;

-- ─── 2. RLS (Row Level Security) ────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler profiles (necessário para listas de operadores etc.)
CREATE POLICY IF NOT EXISTS "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Apenas o próprio usuário pode atualizar seu perfil (senha, etc.)
CREATE POLICY IF NOT EXISTS "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Apenas admin pode inserir/deletar profiles via SQL direto
-- (A criação de usuários usa a Admin API do Supabase no backend)
CREATE POLICY IF NOT EXISTS "profiles_insert_admin"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY IF NOT EXISTS "profiles_delete_admin"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── 3. Função: sincronizar email do auth.users → profiles ──────────────────
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_change ON auth.users;
CREATE TRIGGER on_auth_user_email_change
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_profile_email();

-- ─── 4. Usuários de teste ───────────────────────────────────────────────────
-- ATENÇÃO: Execute os INSERTs abaixo MANUALMENTE via Supabase Dashboard
-- (Authentication > Users > "Invite user" ou SQL Editor com service_role)
-- depois de criar cada auth.user, insira o profile correspondente:
--
-- ADMIN:
-- INSERT INTO profiles (id, nome, email, role) VALUES
-- ('<uuid-do-auth-user>', 'Admin TTC', 'admin@ttc.com.br', 'admin');
--
-- SUPERVISOR:
-- INSERT INTO profiles (id, nome, email, role) VALUES
-- ('<uuid-do-auth-user>', 'Supervisor TTC', 'supervisor@ttc.com.br', 'supervisor');
--
-- OPERADOR:
-- INSERT INTO profiles (id, nome, email, role) VALUES
-- ('<uuid-do-auth-user>', 'Operador TTC', 'operador@ttc.com.br', 'operador');
--
-- VIEWER:
-- INSERT INTO profiles (id, nome, email, role) VALUES
-- ('<uuid-do-auth-user>', 'Viewer TTC', 'viewer@ttc.com.br', 'viewer');

-- ─── 5. Índices ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_role     ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_equipe   ON profiles(equipe_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email    ON profiles(email);

COMMENT ON COLUMN profiles.role IS
  'admin=acesso total | supervisor=criar/editar/excluir | operador=criar/editar/reabrir';
