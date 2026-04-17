# Configuração Supabase

## 🚀 Passo a Passo para Integração

### 1. Criar Conta no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Clique em "Sign In" e crie uma nova conta (ou faça login)
3. Clique em "New Project" para criar um novo projeto

### 2. Configurar Novo Projeto
1. **Project Name:** `grupo_ttc` (ou o nome que preferir)
2. **Database Password:** Gere uma senha forte (salve em local seguro)
3. **Region:** Selecione a região mais próxima (ex: `South America (São Paulo)` se disponível)
4. Clique em "Create new project"

⏳ Aguarde ~2 minutos para o projeto ser criado...

### 3. Obter Credenciais
Após criar o projeto:

1. No menu lateral, vá em **Settings > API**
2. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Project API Key (anon, public)** → `VITE_SUPABASE_ANON_KEY`

### 4. Configurar .env Local
1. Abra o arquivo `.env` na raiz do projeto
2. Substitua os valores:
   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Salve o arquivo

### 5. Verificar Conectividade
```bash
npm run dev
```

Se não houver erro sobre "Missing Supabase configuration", está tudo certo! ✅

---

## 📋 Estrutura de Banco de Dados a Criar

Próximos passos:
- [ ] Tabela `ocorrencias`
- [ ] Tabela `servicos`
- [ ] Tabela `fotos_servico`
- [ ] Tabela `fotos_finais`
- [ ] Tabela `equipes`
- [ ] Tabela `tipos_servico`
- [ ] Configurar permissões RLS (Row Level Security)

---

## ⚠️ Segurança

- **NUNCA** commite o arquivo `.env` no git (está no `.gitignore`)
- Use `.env.example` apenas como referência
- Guarde suas chaves em local seguro
- Se comprometer a chave, regenere em Supabase > Settings > API

---

## 🔗 Recursos Úteis

- [Documentação Supabase](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
