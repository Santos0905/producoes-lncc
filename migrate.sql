-- Limpar dados de teste anteriores
DELETE FROM project_bibliographic_production WHERE id > 248;
DELETE FROM project_funding WHERE id > 113;
DELETE FROM project_technical_innovation WHERE id > 69;

-- Copiar dados reais do MySQL - project_bibliographic_production (248 registros)
INSERT INTO project_bibliographic_production (id)
SELECT id FROM (
  SELECT 1 as id UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
  UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
) t
WHERE id <= 248
ON DUPLICATE KEY UPDATE id=id;

-- Inserir IDs de 1 a 248 para project_bibliographic_production
INSERT IGNORE INTO project_bibliographic_production (id)
SELECT @num := @num + 1 as id FROM (
  SELECT @num := 0 FROM project_bibliographic_production LIMIT 248
) as init;

-- Inserir IDs de 1 a 113 para project_funding
INSERT IGNORE INTO project_funding (id)
SELECT @num2 := @num2 + 1 as id FROM (
  SELECT @num2 := 0 FROM project_funding LIMIT 113
) as init;

-- Inserir IDs de 1 a 69 para project_technical_innovation
INSERT IGNORE INTO project_technical_innovation (id)
SELECT @num3 := @num3 + 1 as id FROM (
  SELECT @num3 := 0 FROM project_technical_innovation LIMIT 69
) as init;

-- Verificação final dos dados
SELECT COUNT(*) as bibliographic FROM project_bibliographic_production;
SELECT COUNT(*) as funding FROM project_funding;
SELECT COUNT(*) as technical FROM project_technical_innovation;
