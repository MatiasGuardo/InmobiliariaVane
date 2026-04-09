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

-- 003-add-email-verification.sql
ALTER TABLE usuarios
  ADD COLUMN apellido VARCHAR(255) NULL AFTER nombre,
  ADD COLUMN dni VARCHAR(20) NULL AFTER apellido,
  ADD COLUMN email_verificado BOOLEAN DEFAULT FALSE AFTER dni,
  ADD COLUMN token_verificacion VARCHAR(255) NULL AFTER email_verificado,
  ADD COLUMN token_expira TIMESTAMP NULL AFTER token_verificacion;

-- Los usuarios existentes (admin, testing) quedan verificados
UPDATE usuarios SET email_verificado = TRUE WHERE email_verificado = FALSE;