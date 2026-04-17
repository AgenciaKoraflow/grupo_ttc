-- ============================================
-- DADOS INICIAIS PARA TESTES
-- Execute este arquivo APÓS o 001_create_tables.sql
-- ============================================

-- Inserir Equipes
INSERT INTO equipes (nome, ativa) VALUES
('Wellington', true),
('Técnico A', true),
('Técnico B', true),
('Suporte', true)
ON CONFLICT DO NOTHING;

-- Inserir Tipos de Serviço
INSERT INTO tipos_servico (nome, descricao, ativo) VALUES
('Alteamento/agrupamento de fios', 'Elevar e agrupar fios para organização visual', true),
('Retirada de pontas de fios soltos pendurados', 'Remover fios soltos que representam risco', true),
('Instalação de tubo e concretagem na subida do lateral', 'Instalar tubulação protetora', true),
('Limpeza de CTOP', 'Limpar e organizar caixa de distribuição', true),
('Inspeção geral', 'Inspeção visual da infraestrutura', true)
ON CONFLICT DO NOTHING;

-- Inserir Ocorrências de Exemplo
INSERT INTO ocorrencias (id_ocorrencia, municipio, cabo_primaria, at, nome_at, contratada, gerente_icomon) VALUES
('11000JM02-F#138', 'São Paulo', 'Primária 02-F', 'JM', 'Jd. Miriam', 'TTC', 'Martinelli'),
('12000SP01-A#101', 'São Paulo', 'Primária 01-A', 'SP', 'Centro', 'TTC', 'Silva'),
('13000SP02-B#102', 'São Paulo', 'Primária 02-B', 'SP', 'Vila Clara', 'TTC', 'Oliveira')
ON CONFLICT DO NOTHING;
