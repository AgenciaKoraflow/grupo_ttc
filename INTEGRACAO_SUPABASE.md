# 🚀 Integração Supabase - Guia Completo

## ✅ Status: Credenciais Conectadas!

Sua conta Supabase está configurada e pronta. Agora vamos criar a estrutura do banco de dados.

---

## 📋 Próximos Passos (4 passos)

### **PASSO 1: Criar Estrutura das Tabelas** 
⏱️ Tempo: 2 minutos

1. Abra [supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique no seu projeto
3. Vá em **SQL Editor** > **New Query**
4. Abra o arquivo: `supabase/migrations/001_create_tables.sql`
5. Copie TODO o conteúdo e cole no SQL Editor
6. Clique em **Run**
7. ✅ Deve aparecer "Success"

👉 **Arquivo:** `supabase/migrations/001_create_tables.sql`

---

### **PASSO 2: Inserir Dados Iniciais**
⏱️ Tempo: 1 minuto

1. Ainda no SQL Editor, clique em **New Query**
2. Abra o arquivo: `supabase/migrations/002_seed_data.sql`
3. Copie TODO o conteúdo e cole
4. Clique em **Run**
5. ✅ Deve aparecer "Success"

👉 **Arquivo:** `supabase/migrations/002_seed_data.sql`

---

### **PASSO 3: Verificar Estrutura**
⏱️ Tempo: 1 minuto

1. No menu lateral, vá em **Table Editor**
2. Você deve ver estas 6 tabelas:
   - ✅ equipes
   - ✅ tipos_servico
   - ✅ ocorrencias
   - ✅ servicos
   - ✅ fotos_servico
   - ✅ fotos_finais

3. Clique em cada tabela para verificar as colunas

---

### **PASSO 4: Configurar Row Level Security (RLS)**
⏱️ Tempo: 3 minutos

1. Vá em **Authentication** > **Policies**
2. Para cada tabela, crie uma policy básica:
   ```
   CREATE POLICY "Enable read for all" ON table_name
   FOR SELECT USING (true);

   CREATE POLICY "Enable insert for authenticated" ON table_name
   FOR INSERT WITH CHECK (true);

   CREATE POLICY "Enable update for authenticated" ON table_name
   FOR UPDATE USING (true);
   ```

3. ✅ Isso libera acesso básico (refinamos depois)

---

## 📚 Estrutura de Dados

### Tabelas Principais:

**equipes**
- id (UUID)
- nome (texto)
- ativa (booleano)

**tipos_servico**
- id (UUID)
- nome (texto)
- descricao (texto)
- ativo (booleano)

**ocorrencias** (Principal)
- id (UUID)
- id_ocorrencia (texto único)
- municipio, cabo_primaria, at, etc.
- equipe_id (FK)
- status (PENDENTE, EM_ANDAMENTO, FINALIZADA)

**servicos** (Serviços por Ocorrência)
- id (UUID)
- ocorrencia_id (FK)
- tipo_servico_id (FK)
- status_item

**fotos_servico** (Fotos Antes/Depois)
- id (UUID)
- servico_id (FK)
- tipo_foto (antes/depois)
- url, file_name, etc.

**fotos_finais** (Retirada Fios + CTOPs)
- id (UUID)
- ocorrencia_id (FK)
- categoria (retirada_fios/ctop)
- url, file_name, etc.

---

## 🔗 Arquivos de Referência

| Arquivo | Descrição |
|---------|-----------|
| `.env` | Suas credenciais (NÃO compartilhe!) |
| `src/lib/supabase.ts` | Cliente Supabase |
| `supabase/migrations/001_create_tables.sql` | Criação de tabelas |
| `supabase/migrations/002_seed_data.sql` | Dados iniciais |
| `CRIAR_BANCO_DE_DADOS.md` | Instruções detalhadas |

---

## ⚠️ Importante

- **Nunca compartilhe** suas credenciais
- O arquivo `.env` está protegido no `.gitignore`
- Guarde a senha do banco de dados em local seguro
- RLS é importante para segurança em produção

---

## ✨ Próxima Fase

Após completar estes 4 passos:
- ✅ Conectar DataContext ao Supabase
- ✅ Implementar autenticação
- ✅ Migrar dados mock
- ✅ Storage de fotos

---

## 📞 Precisa de Ajuda?

Após completar os passos, me avise e vamos:
1. Conectar a aplicação ao Supabase
2. Testar as operações de BD
3. Implementar autenticação
4. Configurar storage de imagens

👉 **Comece pelo PASSO 1 agora!**
