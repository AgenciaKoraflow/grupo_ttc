-- Migração 008: Corrigir CHECK de role em profiles e tornar trigger mais robusto
--
-- PROBLEMA: createUser() retorna "Database error creating new user" ao criar supervisor.
-- CAUSA: o trigger handle_new_user() tenta INSERT com role='supervisor', mas a
-- constraint profiles_role_check em produção pode não incluir 'supervisor' (se a
-- migration 003 não foi aplicada corretamente ao schema existente).
--
-- FIX A: Garantir que a CHECK constraint inclui os 3 roles válidos.
-- FIX B: Recriar handle_new_user com EXCEPTION handler para que falhas no INSERT
--        de profiles não bloqueiem a criação do usuário no auth — o upsert da
--        Edge Function cobre o caso em que o trigger não consegue inserir.

-- ── FIX A: CHECK constraint ────────────────────────────────────────────────────
DO $$
BEGIN
  -- Remove qualquer variante da constraint de role que possa existir
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND constraint_name = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
  END IF;

  ALTER TABLE profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'supervisor', 'operador'));
END $$;

-- ── FIX B: Trigger handle_new_user mais robusto ────────────────────────────────
-- O EXCEPTION handler garante que uma falha no INSERT de profiles (por RLS,
-- constraint ou timing) não cause rollback na criação do auth.user.
-- A Edge Function manage-user faz upsert do profile logo após createUser(),
-- portanto a linha será criada mesmo que o trigger falhe.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  BEGIN
    INSERT INTO profiles (id, nome, email, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'role', 'operador')
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Não propaga o erro: o upsert da Edge Function garante a criação do profile.
    NULL;
  END;
  RETURN NEW;
END;
$$;
