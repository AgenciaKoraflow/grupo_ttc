-- Migração 006: Adicionar campo ativo à tabela profiles
-- Permite ativar/desativar usuários logicamente sem excluir registros

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- Garante que todos os usuários existentes ficam ativos
UPDATE profiles SET ativo = true WHERE ativo IS NULL;
