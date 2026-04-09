-- backend/migrations/003-add-plan-limits.sql
-- Agrega columnas de límites a la tabla planes

ALTER TABLE planes
  ADD COLUMN IF NOT EXISTS max_propiedades  INT NULL COMMENT 'NULL = ilimitado',
  ADD COLUMN IF NOT EXISTS max_contratos    INT NULL COMMENT 'NULL = ilimitado',
  ADD COLUMN IF NOT EXISTS max_contactos    INT NULL COMMENT 'NULL = ilimitado',
  ADD COLUMN IF NOT EXISTS max_usuarios     INT NULL COMMENT 'NULL = ilimitado';

-- Actualizar los límites según cada plan
UPDATE planes SET
  max_propiedades = 3,
  max_contratos   = 3,
  max_contactos   = 3,
  max_usuarios    = 1
WHERE nombre = 'Starter';

UPDATE planes SET
  max_propiedades = 50,
  max_contratos   = 50,
  max_contactos   = 200,
  max_usuarios    = 5
WHERE nombre = 'Pro';

UPDATE planes SET
  max_propiedades = NULL,
  max_contratos   = NULL,
  max_contactos   = NULL,
  max_usuarios    = NULL
WHERE nombre = 'Premium';
