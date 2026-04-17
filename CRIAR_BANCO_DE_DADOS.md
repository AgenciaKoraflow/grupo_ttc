# 🗄️ Criar Estrutura do Banco de Dados no Supabase

## ✅ Passo a Passo

### 1️⃣ Acessar o SQL Editor do Supabase

1. Vá para [supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique no seu projeto
3. No menu lateral, clique em **SQL Editor** (icone de banco de dados)
4. Clique em **New Query**

### 2️⃣ Copiar e Executar o SQL

1. Abra o arquivo: `supabase/migrations/001_create_tables.sql`
2. Copie **TODO** o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** (ou aperte `Cmd+Enter`)

✅ Aguarde a execução. Deve aparecer: _"Success. No rows returned"_

---

## 📊 Tabelas Criadas

| Tabela | Descrição |
|--------|-----------|
| `equipes` | Equipes responsáveis pelos serviços |
| `tipos_servico` | Tipos de serviços disponíveis |
| `ocorrencias` | Ocorrências de preventivas |
| `servicos` | Serviços executados por ocorrência |
| `fotos_servico` | Fotos antes/depois de cada serviço |
| `fotos_finais` | Fotos finais (retirada fios, CTOPs) |

---

## 🔐 Próximos Passos (RLS)

Após criar as tabelas, vamos configurar Row Level Security (RLS) para:
- ✅ Controlar acesso por usuário
- ✅ Proteger dados sensíveis
- ✅ Habilitar autenticação

---

## ⚠️ Se Houver Erro

Se receber erro tipo: _"relation "equipes" already exists"_

**Solução:**
1. Vá em **Table Editor**
2. Verifique se as tabelas já existem
3. Se existirem, pode ignorar o erro (estrutura já criada ✅)

---

## ✨ Verificar Estrutura

Após executar o SQL:

1. Vá em **Table Editor** (no menu lateral)
2. Você deve ver as 6 tabelas:
   - ✅ equipes
   - ✅ tipos_servico
   - ✅ ocorrencias
   - ✅ servicos
   - ✅ fotos_servico
   - ✅ fotos_finais

---

## 📝 Inserir Dados Iniciais (Opcional)

Após criar as tabelas, podemos inserir dados iniciais de teste. Me avise quando terminar este passo!
