-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela: equipes
CREATE TABLE IF NOT EXISTS equipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: tipos_servico
CREATE TABLE IF NOT EXISTS tipos_servico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: ocorrencias
CREATE TABLE IF NOT EXISTS ocorrencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_ocorrencia VARCHAR(50) NOT NULL UNIQUE,
  municipio VARCHAR(255) NOT NULL,
  cabo_primaria VARCHAR(255),
  at VARCHAR(50),
  nome_at VARCHAR(255),
  contratada VARCHAR(255),
  gerente_icomon VARCHAR(255),
  equipe_id UUID REFERENCES equipes(id),
  status VARCHAR(50) DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'EM_ANDAMENTO', 'FINALIZADA')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID
);

-- Tabela: servicos
CREATE TABLE IF NOT EXISTS servicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ocorrencia_id UUID NOT NULL REFERENCES ocorrencias(id) ON DELETE CASCADE,
  tipo_servico_id UUID NOT NULL REFERENCES tipos_servico(id),
  observacao TEXT,
  status_item VARCHAR(50) DEFAULT 'PENDENTE',
  ordem INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID
);

-- Tabela: fotos_servico
CREATE TABLE IF NOT EXISTS fotos_servico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  servico_id UUID NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  tipo_foto VARCHAR(50) NOT NULL CHECK (tipo_foto IN ('antes', 'depois')),
  storage_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  url TEXT,
  ordem INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: fotos_finais
CREATE TABLE IF NOT EXISTS fotos_finais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ocorrencia_id UUID NOT NULL REFERENCES ocorrencias(id) ON DELETE CASCADE,
  categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('retirada_fios', 'ctop')),
  storage_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  url TEXT,
  ordem INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_ocorrencias_equipe_id ON ocorrencias(equipe_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_status ON ocorrencias(status);
CREATE INDEX IF NOT EXISTS idx_servicos_ocorrencia_id ON servicos(ocorrencia_id);
CREATE INDEX IF NOT EXISTS idx_servicos_tipo_servico_id ON servicos(tipo_servico_id);
CREATE INDEX IF NOT EXISTS idx_fotos_servico_servico_id ON fotos_servico(servico_id);
CREATE INDEX IF NOT EXISTS idx_fotos_finais_ocorrencia_id ON fotos_finais(ocorrencia_id);

-- Comentários nas tabelas
COMMENT ON TABLE equipes IS 'Equipes responsáveis pelos serviços';
COMMENT ON TABLE tipos_servico IS 'Tipos de serviços que podem ser executados';
COMMENT ON TABLE ocorrencias IS 'Ocorrências de preventivas em primárias';
COMMENT ON TABLE servicos IS 'Serviços executados em cada ocorrência';
COMMENT ON TABLE fotos_servico IS 'Fotos antes e depois de cada serviço';
COMMENT ON TABLE fotos_finais IS 'Fotos finais de retirada de fios e CTOPs';
