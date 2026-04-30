-- ============================================================
-- MIGRAÇÃO 004: Auditoria DBA + Security Engineer
-- Data: 2026-04-29
-- Pré-condições: 001_create_tables, 002_seed_data, 003_roles_access_control
-- ============================================================
--
-- PROBLEMAS CORRIGIDOS:
-- [1] profiles_insert_admin / profiles_delete_admin recursivas → SECURITY DEFINER
-- [2] RLS faltante em fotos_servico, fotos_finais → habilitado
-- [3] Colunas adicionadas em 003 sem FK (finalized_by, reopened_by, assigned_to, operador_id) → FKs adicionadas
-- [4] Tabelas logs, importacoes_ocorrencias, importacoes_itens inexistentes → criadas
-- [5] Triggers updated_at ausentes em todas as tabelas → adicionados
-- [6] Índices compostos e de seletividade faltando → adicionados
-- [7] Storage buckets não configurados → criados com políticas
-- [8] Trigger on_auth_user_created fora das migrations → incluído
-- [9] CHECK constraint em servicos.status_item faltando → adicionada
-- [10] Usuário pode escalar próprio role via UPDATE → trigger de proteção adicionado
-- [11] Função get_my_profile_equipe_id() inexistente → criada
-- [12] Políticas de ocorrências não refletem regra de negócio (operador vê só sua equipe) → corrigido
-- ============================================================


-- ═══════════════════════════════════════════════════════════
-- PARTE 1: FUNÇÕES SECURITY DEFINER
-- Executam com privileges do owner (postgres) para evitar
-- recursão infinita nas policies de RLS.
-- SET search_path = public previne ataques de search_path injection.
-- ═══════════════════════════════════════════════════════════

-- Retorna o role do usuário autenticado atual, sem disparar RLS da tabela profiles.
CREATE OR REPLACE FUNCTION get_my_profile_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- Retorna o equipe_id do usuário atual, sem disparar RLS.
CREATE OR REPLACE FUNCTION get_my_profile_equipe_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT equipe_id FROM profiles WHERE id = auth.uid()
$$;

-- Atualiza updated_at automaticamente em qualquer UPDATE.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Cria linha em profiles automaticamente quando novo auth.user é criado.
-- Lê metadata do usuário (nome, role) passados na criação via Admin API.
-- SECURITY DEFINER + search_path = evita manipulação de contexto.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, nome, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'operador')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Sincroniza email do auth.users → profiles quando email é alterado via Auth API.
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  UPDATE profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Impede que qualquer usuário escale seu próprio role via UPDATE direto.
-- Apenas admin pode alterar o campo role de qualquer profile.
-- RISCO MITIGADO: sem este trigger, um operador autenticado poderia fazer
-- UPDATE profiles SET role = 'admin' WHERE id = auth.uid() e a policy
-- profiles_update_own não bloquearia (já que a policy verifica auth.uid() = id, não o conteúdo).
CREATE OR REPLACE FUNCTION prevent_self_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NEW.role <> OLD.role AND get_my_profile_role() <> 'admin' THEN
    RAISE EXCEPTION 'permission_denied: apenas administradores podem alterar o role de um usuário';
  END IF;
  RETURN NEW;
END;
$$;


-- ═══════════════════════════════════════════════════════════
-- PARTE 2: TRIGGERS NA TABELA auth.users
-- ═══════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_email_change ON auth.users;
CREATE TRIGGER on_auth_user_email_change
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_profile_email();


-- ═══════════════════════════════════════════════════════════
-- PARTE 3: COLUNAS FALTANTES EM ocorrencias
-- Idempotente: verifica existência antes de adicionar.
-- FK com ON DELETE SET NULL: se o profile for excluído,
-- o campo fica NULL (preserva a ocorrência).
-- NOTA: operador_id aqui é o UUID do perfil do operador/gerente
-- vinculado via sistema. O campo original gerente_icomon (VARCHAR)
-- guarda o nome bruto vindo do CSV externo. São campos distintos.
-- ═══════════════════════════════════════════════════════════

DO $$
BEGIN
  -- finalized_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ocorrencias' AND column_name = 'finalized_at') THEN
    ALTER TABLE ocorrencias ADD COLUMN finalized_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- finalized_by → FK para profiles
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ocorrencias' AND column_name = 'finalized_by') THEN
    ALTER TABLE ocorrencias
      ADD COLUMN finalized_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public' AND tc.table_name = 'ocorrencias'
        AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'finalized_by') THEN
      ALTER TABLE ocorrencias
        ADD CONSTRAINT ocorrencias_finalized_by_fkey
        FOREIGN KEY (finalized_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- reopened_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ocorrencias' AND column_name = 'reopened_at') THEN
    ALTER TABLE ocorrencias ADD COLUMN reopened_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- reopened_by → FK para profiles
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ocorrencias' AND column_name = 'reopened_by') THEN
    ALTER TABLE ocorrencias
      ADD COLUMN reopened_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public' AND tc.table_name = 'ocorrencias'
        AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'reopened_by') THEN
      ALTER TABLE ocorrencias
        ADD CONSTRAINT ocorrencias_reopened_by_fkey
        FOREIGN KEY (reopened_by) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- assigned_to → FK para profiles
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ocorrencias' AND column_name = 'assigned_to') THEN
    ALTER TABLE ocorrencias
      ADD COLUMN assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public' AND tc.table_name = 'ocorrencias'
        AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'assigned_to') THEN
      ALTER TABLE ocorrencias
        ADD CONSTRAINT ocorrencias_assigned_to_fkey
        FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- operador_id → FK para profiles (UUID do operador/gerente vinculado no sistema)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ocorrencias' AND column_name = 'operador_id') THEN
    ALTER TABLE ocorrencias
      ADD COLUMN operador_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public' AND tc.table_name = 'ocorrencias'
        AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'operador_id') THEN
      -- Só adiciona FK se a coluna for UUID (pode ser VARCHAR do CSV legado).
      -- Se este bloco falhar, a coluna operador_id é VARCHAR: mantenha-a como está
      -- e use gerente_icomon para o nome bruto do CSV.
      BEGIN
        ALTER TABLE ocorrencias
          ADD CONSTRAINT ocorrencias_operador_id_fkey
          FOREIGN KEY (operador_id) REFERENCES profiles(id) ON DELETE SET NULL;
      EXCEPTION WHEN datatype_mismatch THEN
        NULL; -- coluna é VARCHAR, FK não aplicável
      END;
    END IF;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════
-- PARTE 4: CHECK CONSTRAINT EM servicos.status_item
-- Garante que apenas valores válidos sejam inseridos.
-- ═══════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'servicos'
      AND constraint_name = 'servicos_status_item_check') THEN
    ALTER TABLE servicos
      ADD CONSTRAINT servicos_status_item_check
      CHECK (status_item IN ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO'));
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════
-- PARTE 5: TRIGGER DE PROTEÇÃO CONTRA ESCALADA DE ROLE
-- ═══════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS check_role_escalation ON profiles;
CREATE TRIGGER check_role_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_self_role_escalation();


-- ═══════════════════════════════════════════════════════════
-- PARTE 6: TRIGGERS updated_at EM TODAS AS TABELAS
-- Sem isso, o campo updated_at nunca é atualizado automaticamente.
-- ═══════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS set_profiles_updated_at    ON profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_equipes_updated_at     ON equipes;
CREATE TRIGGER set_equipes_updated_at
  BEFORE UPDATE ON equipes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_tipos_servico_updated_at ON tipos_servico;
CREATE TRIGGER set_tipos_servico_updated_at
  BEFORE UPDATE ON tipos_servico
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_ocorrencias_updated_at ON ocorrencias;
CREATE TRIGGER set_ocorrencias_updated_at
  BEFORE UPDATE ON ocorrencias
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_servicos_updated_at    ON servicos;
CREATE TRIGGER set_servicos_updated_at
  BEFORE UPDATE ON servicos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ═══════════════════════════════════════════════════════════
-- PARTE 7: TABELAS FALTANTES
-- ═══════════════════════════════════════════════════════════

-- ── logs ─────────────────────────────────────────────────────────────────────
-- Audit trail imutável de todas as ações do sistema.
-- Sem UPDATE nem DELETE (policies não criam essas permissões).
-- user_id pode ser NULL para ações do sistema (ex: import automatizado).
-- user_nome é guardado mesmo se o profile for excluído (auditoria histórica).
-- RISCO: sem esta tabela, não há rastreabilidade de ações (compliance).
CREATE TABLE IF NOT EXISTS logs (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  user_nome     VARCHAR(255) NOT NULL,
  user_role     VARCHAR(20)  NOT NULL
                  CHECK (user_role IN ('admin', 'supervisor', 'operador', 'sistema')),
  tipo          VARCHAR(30)  NOT NULL
                  CHECK (tipo IN (
                    'LOGIN', 'LOGOUT', 'CRIACAO', 'ATUALIZACAO', 'EXCLUSAO',
                    'FINALIZACAO', 'REABERTURA', 'RESET_SENHA', 'VINCULACAO'
                  )),
  categoria     VARCHAR(30)  NOT NULL
                  CHECK (categoria IN (
                    'OCORRENCIA', 'USUARIO', 'EQUIPE', 'TIPO_SERVICO', 'AUTENTICACAO'
                  )),
  entidade_id   TEXT         NOT NULL DEFAULT '',
  entidade_nome TEXT         NOT NULL DEFAULT '',
  detalhes      TEXT         NOT NULL DEFAULT '',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE logs IS 'Audit trail imutável — sem UPDATE/DELETE por design';
COMMENT ON COLUMN logs.user_id IS 'NULL para ações automáticas do sistema';
COMMENT ON COLUMN logs.user_nome IS 'Preservado mesmo após exclusão do profile';

-- ── importacoes_ocorrencias ───────────────────────────────────────────────────
-- Registro de cada planilha importada (cabeçalho/resumo).
CREATE TABLE IF NOT EXISTS importacoes_ocorrencias (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo_nome     VARCHAR(500) NOT NULL,
  total_linhas     INTEGER      NOT NULL DEFAULT 0 CHECK (total_linhas >= 0),
  total_importadas INTEGER      NOT NULL DEFAULT 0 CHECK (total_importadas >= 0),
  total_ignoradas  INTEGER      NOT NULL DEFAULT 0 CHECK (total_ignoradas >= 0),
  total_erros      INTEGER      NOT NULL DEFAULT 0 CHECK (total_erros >= 0),
  log_json         JSONB,
  created_by       UUID         REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE importacoes_ocorrencias IS 'Cabeçalho de cada planilha importada';

-- ── importacoes_itens ─────────────────────────────────────────────────────────
-- Cada linha de cada importação (detalhamento).
CREATE TABLE IF NOT EXISTS importacoes_itens (
  id              UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id   UUID       NOT NULL REFERENCES importacoes_ocorrencias(id) ON DELETE CASCADE,
  linha_numero    INTEGER    NOT NULL CHECK (linha_numero > 0),
  id_ocorrencia   VARCHAR(50),
  status          VARCHAR(20) NOT NULL CHECK (status IN ('importado', 'ignorado', 'erro')),
  mensagem        TEXT,
  payload         JSONB,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE importacoes_itens IS 'Detalhamento linha-a-linha de cada importação';


-- ═══════════════════════════════════════════════════════════
-- PARTE 8: ÍNDICES
-- ═══════════════════════════════════════════════════════════

-- ocorrencias — novos
CREATE INDEX IF NOT EXISTS idx_ocorrencias_assigned_to    ON ocorrencias(assigned_to);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_operador_id    ON ocorrencias(operador_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_created_by     ON ocorrencias(created_by);
-- Índice composto para o filtro mais comum: status + equipe (query de operador)
CREATE INDEX IF NOT EXISTS idx_ocorrencias_status_equipe  ON ocorrencias(status, equipe_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_municipio      ON ocorrencias(municipio);

-- servicos
CREATE INDEX IF NOT EXISTS idx_servicos_created_by        ON servicos(created_by);

-- logs — acesso por data DESC é o padrão
CREATE INDEX IF NOT EXISTS idx_logs_user_id               ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_tipo                  ON logs(tipo);
CREATE INDEX IF NOT EXISTS idx_logs_categoria             ON logs(categoria);
CREATE INDEX IF NOT EXISTS idx_logs_created_at            ON logs(created_at DESC);

-- importacoes
CREATE INDEX IF NOT EXISTS idx_importacoes_created_by     ON importacoes_ocorrencias(created_by);
CREATE INDEX IF NOT EXISTS idx_importacoes_itens_import   ON importacoes_itens(importacao_id);


-- ═══════════════════════════════════════════════════════════
-- PARTE 9: HABILITAR RLS EM TODAS AS TABELAS
-- Idempotente: ALTER TABLE ENABLE RLS é safe se já habilitado.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_servico           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocorrencias             ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_servico           ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_finais            ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE importacoes_ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE importacoes_itens       ENABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════════════════════
-- PARTE 10: REMOVER POLICIES ANTIGAS
-- Garante estado limpo antes de recriar tudo.
-- As policies de 003 (profiles_insert_admin, profiles_delete_admin)
-- eram recursivas — referenciavam a própria tabela profiles sem
-- SECURITY DEFINER, causando loop infinito de RLS.
-- ═══════════════════════════════════════════════════════════

-- profiles
DROP POLICY IF EXISTS "profiles_select_admin"         ON profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"           ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin"         ON profiles;
DROP POLICY IF EXISTS "profiles_insert_admin"         ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin"         ON profiles;
DROP POLICY IF EXISTS "profiles_insert"               ON profiles;
DROP POLICY IF EXISTS "profiles_select"               ON profiles;
DROP POLICY IF EXISTS "profiles_delete"               ON profiles;

-- equipes
DROP POLICY IF EXISTS "equipes_select"  ON equipes;
DROP POLICY IF EXISTS "equipes_insert"  ON equipes;
DROP POLICY IF EXISTS "equipes_update"  ON equipes;
DROP POLICY IF EXISTS "equipes_delete"  ON equipes;

-- tipos_servico
DROP POLICY IF EXISTS "tipos_servico_select"  ON tipos_servico;
DROP POLICY IF EXISTS "tipos_servico_insert"  ON tipos_servico;
DROP POLICY IF EXISTS "tipos_servico_update"  ON tipos_servico;
DROP POLICY IF EXISTS "tipos_servico_delete"  ON tipos_servico;

-- ocorrencias
DROP POLICY IF EXISTS "ocorrencias_select"  ON ocorrencias;
DROP POLICY IF EXISTS "ocorrencias_insert"  ON ocorrencias;
DROP POLICY IF EXISTS "ocorrencias_update"  ON ocorrencias;
DROP POLICY IF EXISTS "ocorrencias_delete"  ON ocorrencias;

-- servicos
DROP POLICY IF EXISTS "servicos_select"  ON servicos;
DROP POLICY IF EXISTS "servicos_insert"  ON servicos;
DROP POLICY IF EXISTS "servicos_update"  ON servicos;
DROP POLICY IF EXISTS "servicos_delete"  ON servicos;

-- fotos_servico
DROP POLICY IF EXISTS "fotos_servico_select"  ON fotos_servico;
DROP POLICY IF EXISTS "fotos_servico_insert"  ON fotos_servico;
DROP POLICY IF EXISTS "fotos_servico_update"  ON fotos_servico;
DROP POLICY IF EXISTS "fotos_servico_delete"  ON fotos_servico;

-- fotos_finais
DROP POLICY IF EXISTS "fotos_finais_select"  ON fotos_finais;
DROP POLICY IF EXISTS "fotos_finais_insert"  ON fotos_finais;
DROP POLICY IF EXISTS "fotos_finais_update"  ON fotos_finais;
DROP POLICY IF EXISTS "fotos_finais_delete"  ON fotos_finais;

-- logs
DROP POLICY IF EXISTS "logs_select"  ON logs;
DROP POLICY IF EXISTS "logs_insert"  ON logs;

-- importacoes_ocorrencias
DROP POLICY IF EXISTS "importacoes_ocorrencias_select"  ON importacoes_ocorrencias;
DROP POLICY IF EXISTS "importacoes_ocorrencias_insert"  ON importacoes_ocorrencias;
DROP POLICY IF EXISTS "importacoes_ocorrencias_delete"  ON importacoes_ocorrencias;

-- importacoes_itens
DROP POLICY IF EXISTS "importacoes_itens_select"  ON importacoes_itens;
DROP POLICY IF EXISTS "importacoes_itens_insert"  ON importacoes_itens;
DROP POLICY IF EXISTS "importacoes_itens_delete"  ON importacoes_itens;


-- ═══════════════════════════════════════════════════════════
-- PARTE 11: CRIAR TODAS AS POLICIES
-- Regra de negócio implementada no banco (last line of defense):
--   admin     → acesso total a tudo
--   supervisor → criar/editar/excluir; VÊ todas as ocorrências
--   operador  → criar/editar; VÊ APENAS ocorrências da sua equipe
--   anon      → sem acesso (nenhuma policy TO anon)
-- ═══════════════════════════════════════════════════════════

-- ── profiles ─────────────────────────────────────────────────────────────────
-- SELECT: todos os autenticados veem todos os profiles.
-- Necessário para listar operadores disponíveis, equipes, etc.
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT TO authenticated
  USING (true);

-- INSERT: apenas admin pode criar profiles diretamente.
-- Na prática, a criação de usuários usa a Admin API do Supabase (handle_new_user trigger),
-- mas esta policy protege caso alguém tente INSERT direto via client.
CREATE POLICY "profiles_insert"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (get_my_profile_role() = 'admin');

-- UPDATE own: qualquer usuário pode atualizar seu próprio profile (nome, must_change_password).
-- O trigger prevent_self_role_escalation garante que o campo role não seja alterado.
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- UPDATE admin: admin pode atualizar qualquer profile (incluindo role de outros).
CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE TO authenticated
  USING  (get_my_profile_role() = 'admin')
  WITH CHECK (get_my_profile_role() = 'admin');

-- DELETE: apenas admin pode excluir profiles.
-- A exclusão do auth.user via Admin API faz CASCADE para profiles (FK ON DELETE CASCADE).
CREATE POLICY "profiles_delete"
  ON profiles FOR DELETE TO authenticated
  USING (get_my_profile_role() = 'admin');

-- ── equipes ───────────────────────────────────────────────────────────────────
CREATE POLICY "equipes_select"
  ON equipes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "equipes_insert"
  ON equipes FOR INSERT TO authenticated
  WITH CHECK (get_my_profile_role() IN ('admin', 'supervisor'));

CREATE POLICY "equipes_update"
  ON equipes FOR UPDATE TO authenticated
  USING  (get_my_profile_role() IN ('admin', 'supervisor'))
  WITH CHECK (get_my_profile_role() IN ('admin', 'supervisor'));

-- DELETE: apenas admin (excluir equipe é destrutivo — afeta múltiplas ocorrências)
CREATE POLICY "equipes_delete"
  ON equipes FOR DELETE TO authenticated
  USING (get_my_profile_role() = 'admin');

-- ── tipos_servico ─────────────────────────────────────────────────────────────
CREATE POLICY "tipos_servico_select"
  ON tipos_servico FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "tipos_servico_insert"
  ON tipos_servico FOR INSERT TO authenticated
  WITH CHECK (get_my_profile_role() IN ('admin', 'supervisor'));

CREATE POLICY "tipos_servico_update"
  ON tipos_servico FOR UPDATE TO authenticated
  USING  (get_my_profile_role() IN ('admin', 'supervisor'))
  WITH CHECK (get_my_profile_role() IN ('admin', 'supervisor'));

CREATE POLICY "tipos_servico_delete"
  ON tipos_servico FOR DELETE TO authenticated
  USING (get_my_profile_role() = 'admin');

-- ── ocorrencias ───────────────────────────────────────────────────────────────
-- REGRA DE NEGÓCIO CENTRAL:
--   admin/supervisor → veem e editam todas as ocorrências
--   operador → vê e edita APENAS ocorrências da sua equipe
--   ocorrências sem equipe (equipe_id IS NULL) → visíveis para admin/supervisor;
--     operadores NÃO veem (ainda não atribuídas a uma equipe)

CREATE POLICY "ocorrencias_select"
  ON ocorrencias FOR SELECT TO authenticated
  USING (
    get_my_profile_role() IN ('admin', 'supervisor')
    OR (
      get_my_profile_role() = 'operador'
      AND equipe_id = get_my_profile_equipe_id()
      AND equipe_id IS NOT NULL
    )
  );

-- INSERT: qualquer autenticado pode criar (importação de planilha).
-- A equipe é atribuída depois por admin/supervisor.
CREATE POLICY "ocorrencias_insert"
  ON ocorrencias FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "ocorrencias_update"
  ON ocorrencias FOR UPDATE TO authenticated
  USING (
    get_my_profile_role() IN ('admin', 'supervisor')
    OR (
      get_my_profile_role() = 'operador'
      AND equipe_id = get_my_profile_equipe_id()
      AND equipe_id IS NOT NULL
    )
  );

-- DELETE: admin e supervisor (canDelete no frontend)
CREATE POLICY "ocorrencias_delete"
  ON ocorrencias FOR DELETE TO authenticated
  USING (get_my_profile_role() IN ('admin', 'supervisor'));

-- ── servicos ──────────────────────────────────────────────────────────────────
-- Acesso derivado da ocorrência pai.
-- Operador vê servicos somente de ocorrências acessíveis para ele.
-- equipe_id IS NULL → ocorrência não atribuída → só admin/supervisor
CREATE POLICY "servicos_select"
  ON servicos FOR SELECT TO authenticated
  USING (
    get_my_profile_role() IN ('admin', 'supervisor')
    OR EXISTS (
      SELECT 1 FROM ocorrencias o
      WHERE o.id = servicos.ocorrencia_id
        AND o.equipe_id = get_my_profile_equipe_id()
        AND o.equipe_id IS NOT NULL
    )
  );

CREATE POLICY "servicos_insert"
  ON servicos FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "servicos_update"
  ON servicos FOR UPDATE TO authenticated
  USING (
    get_my_profile_role() IN ('admin', 'supervisor')
    OR EXISTS (
      SELECT 1 FROM ocorrencias o
      WHERE o.id = servicos.ocorrencia_id
        AND o.equipe_id = get_my_profile_equipe_id()
        AND o.equipe_id IS NOT NULL
    )
  );

CREATE POLICY "servicos_delete"
  ON servicos FOR DELETE TO authenticated
  USING (get_my_profile_role() IN ('admin', 'supervisor'));

-- ── fotos_servico ─────────────────────────────────────────────────────────────
-- Herda restrições de acesso da cadeia ocorrencia → servico → foto.
-- AVISO: a coluna `url TEXT` atualmente armazena base64 de thumbnail gerado
-- no frontend. Isso causa linhas de até ~200KB. Migração para Supabase Storage
-- real (storage_path → signed URL) é necessária em produção.
CREATE POLICY "fotos_servico_select"
  ON fotos_servico FOR SELECT TO authenticated
  USING (
    get_my_profile_role() IN ('admin', 'supervisor')
    OR EXISTS (
      SELECT 1 FROM servicos sv
      JOIN ocorrencias o ON o.id = sv.ocorrencia_id
      WHERE sv.id = fotos_servico.servico_id
        AND o.equipe_id = get_my_profile_equipe_id()
        AND o.equipe_id IS NOT NULL
    )
  );

CREATE POLICY "fotos_servico_insert"
  ON fotos_servico FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: apenas admin/supervisor (operadores adicionam via INSERT, não editam metadados)
CREATE POLICY "fotos_servico_update"
  ON fotos_servico FOR UPDATE TO authenticated
  USING  (get_my_profile_role() IN ('admin', 'supervisor'))
  WITH CHECK (get_my_profile_role() IN ('admin', 'supervisor'));

CREATE POLICY "fotos_servico_delete"
  ON fotos_servico FOR DELETE TO authenticated
  USING (
    get_my_profile_role() IN ('admin', 'supervisor')
    OR EXISTS (
      SELECT 1 FROM servicos sv
      JOIN ocorrencias o ON o.id = sv.ocorrencia_id
      WHERE sv.id = fotos_servico.servico_id
        AND o.equipe_id = get_my_profile_equipe_id()
        AND o.equipe_id IS NOT NULL
    )
  );

-- ── fotos_finais ──────────────────────────────────────────────────────────────
CREATE POLICY "fotos_finais_select"
  ON fotos_finais FOR SELECT TO authenticated
  USING (
    get_my_profile_role() IN ('admin', 'supervisor')
    OR EXISTS (
      SELECT 1 FROM ocorrencias o
      WHERE o.id = fotos_finais.ocorrencia_id
        AND o.equipe_id = get_my_profile_equipe_id()
        AND o.equipe_id IS NOT NULL
    )
  );

CREATE POLICY "fotos_finais_insert"
  ON fotos_finais FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "fotos_finais_update"
  ON fotos_finais FOR UPDATE TO authenticated
  USING  (get_my_profile_role() IN ('admin', 'supervisor'))
  WITH CHECK (get_my_profile_role() IN ('admin', 'supervisor'));

CREATE POLICY "fotos_finais_delete"
  ON fotos_finais FOR DELETE TO authenticated
  USING (
    get_my_profile_role() IN ('admin', 'supervisor')
    OR EXISTS (
      SELECT 1 FROM ocorrencias o
      WHERE o.id = fotos_finais.ocorrencia_id
        AND o.equipe_id = get_my_profile_equipe_id()
        AND o.equipe_id IS NOT NULL
    )
  );

-- ── logs ──────────────────────────────────────────────────────────────────────
-- SELECT: apenas admin e supervisor (canViewLogs no frontend)
-- INSERT: qualquer autenticado (todas as ações geram logs)
-- UPDATE/DELETE: ninguém — logs são imutáveis por design
CREATE POLICY "logs_select"
  ON logs FOR SELECT TO authenticated
  USING (get_my_profile_role() IN ('admin', 'supervisor'));

CREATE POLICY "logs_insert"
  ON logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── importacoes_ocorrencias ───────────────────────────────────────────────────
-- Usuário vê apenas suas próprias importações; admin/supervisor veem todas.
CREATE POLICY "importacoes_ocorrencias_select"
  ON importacoes_ocorrencias FOR SELECT TO authenticated
  USING (
    get_my_profile_role() IN ('admin', 'supervisor')
    OR created_by = auth.uid()
  );

CREATE POLICY "importacoes_ocorrencias_insert"
  ON importacoes_ocorrencias FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "importacoes_ocorrencias_delete"
  ON importacoes_ocorrencias FOR DELETE TO authenticated
  USING (get_my_profile_role() = 'admin');

-- ── importacoes_itens ─────────────────────────────────────────────────────────
CREATE POLICY "importacoes_itens_select"
  ON importacoes_itens FOR SELECT TO authenticated
  USING (
    get_my_profile_role() IN ('admin', 'supervisor')
    OR EXISTS (
      SELECT 1 FROM importacoes_ocorrencias io
      WHERE io.id = importacoes_itens.importacao_id
        AND io.created_by = auth.uid()
    )
  );

CREATE POLICY "importacoes_itens_insert"
  ON importacoes_itens FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "importacoes_itens_delete"
  ON importacoes_itens FOR DELETE TO authenticated
  USING (get_my_profile_role() = 'admin');


-- ═══════════════════════════════════════════════════════════
-- PARTE 12: STORAGE BUCKETS
-- Os buckets armazenam os arquivos físicos das fotos.
-- Atualmente o app salva base64 no campo `url` da tabela (anti-pattern).
-- Esta configuração prepara a infraestrutura para migração para Storage real.
-- file_size_limit: 10 MB por arquivo
-- allowed_mime_types: apenas imagens (sem PDF, vídeo, etc.)
-- public: false → URLs exigem autenticação (signed URLs)
-- ═══════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fotos-servico',
  'fotos-servico',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fotos-finais',
  'fotos-finais',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── Políticas de storage.objects ─────────────────────────────────────────────
-- Nomes prefixados com "ttc_" para não colidir com policies nativas do Supabase.

DROP POLICY IF EXISTS "ttc_fotos_servico_select" ON storage.objects;
DROP POLICY IF EXISTS "ttc_fotos_servico_insert" ON storage.objects;
DROP POLICY IF EXISTS "ttc_fotos_servico_delete" ON storage.objects;
DROP POLICY IF EXISTS "ttc_fotos_finais_select"  ON storage.objects;
DROP POLICY IF EXISTS "ttc_fotos_finais_insert"  ON storage.objects;
DROP POLICY IF EXISTS "ttc_fotos_finais_delete"  ON storage.objects;

-- fotos-servico: acesso autenticado; delete apenas admin/supervisor ou quem fez upload
CREATE POLICY "ttc_fotos_servico_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fotos-servico');

CREATE POLICY "ttc_fotos_servico_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'fotos-servico'
    AND public.get_my_profile_role() IN ('admin', 'supervisor', 'operador')
  );

CREATE POLICY "ttc_fotos_servico_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'fotos-servico'
    AND (
      public.get_my_profile_role() IN ('admin', 'supervisor')
      OR owner_id = auth.uid()::text
    )
  );

-- fotos-finais: mesmas regras
CREATE POLICY "ttc_fotos_finais_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fotos-finais');

CREATE POLICY "ttc_fotos_finais_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'fotos-finais'
    AND public.get_my_profile_role() IN ('admin', 'supervisor', 'operador')
  );

CREATE POLICY "ttc_fotos_finais_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'fotos-finais'
    AND (
      public.get_my_profile_role() IN ('admin', 'supervisor')
      OR owner_id = auth.uid()::text
    )
  );


-- ═══════════════════════════════════════════════════════════
-- COMENTÁRIOS FINAIS NAS TABELAS
-- ═══════════════════════════════════════════════════════════

COMMENT ON COLUMN profiles.role IS
  'admin=acesso total | supervisor=editar/excluir/ver tudo | operador=editar/ver própria equipe';
COMMENT ON COLUMN profiles.must_change_password IS
  'true = usuário deve trocar senha no próximo login (primeiro acesso ou reset)';

COMMENT ON COLUMN ocorrencias.gerente_icomon IS
  'Nome bruto do gerente vindo da planilha CSV externa. Campo texto puro.';
COMMENT ON COLUMN ocorrencias.operador_id IS
  'UUID do perfil do operador/gerente vinculado no sistema interno. Diferente de gerente_icomon.';
COMMENT ON COLUMN ocorrencias.assigned_to IS
  'UUID do operador designado para executar esta ocorrência.';

COMMENT ON COLUMN fotos_servico.url IS
  'AVISO: atualmente armazena base64 de thumbnail gerado no client. '
  'Migrar para Supabase Storage: storage_path → upload real → signed URL dinâmico.';
COMMENT ON COLUMN fotos_finais.url IS
  'AVISO: mesmo problema de fotos_servico.url — base64 inline no banco.';
