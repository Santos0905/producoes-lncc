-- Script de inicialização do banco de dados PostgreSQL
-- O banco 'producao_intelectual' é criado automaticamente pelo POSTGRES_DB

-- Conectar ao banco e criar tabelas básicas (se necessário)
-- Criar tabela de produções base (se necessária para testes)
CREATE TABLE IF NOT EXISTS producoes (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(500),
    autores VARCHAR(1000),
    ano INTEGER,
    tipo VARCHAR(100),
    subtipo VARCHAR(100),
    local_publicacao VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_producoes_ano ON producoes(ano);
CREATE INDEX IF NOT EXISTS idx_producoes_tipo ON producoes(tipo);

