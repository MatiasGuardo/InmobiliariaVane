-- backend/migrations/004-fix-starter-plan-limits.sql
-- Corrige los límites del plan Starter (que no estaban en la migración anterior)
-- Ejecutar esta migración si los planes no tienen los límites correctos

-- Actualizar plan Starter con los límites correctos
UPDATE planes SET
  max_propiedades = 3,
  max_contratos   = 3,
  max_contactos   = 3,
  max_usuarios    = 1
WHERE nombre = 'Starter' AND (
  max_propiedades IS NULL 
  OR max_contratos IS NULL 
  OR max_contactos IS NULL 
  OR max_usuarios IS NULL
);

-- Actualizar plan Pro
UPDATE planes SET
  max_propiedades = 50,
  max_contratos   = 50,
  max_contactos   = 200,
  max_usuarios    = 5
WHERE nombre = 'Pro' AND (
  max_propiedades IS NULL 
  OR max_contratos IS NULL 
  OR max_contactos IS NULL 
  OR max_usuarios IS NULL
);

-- Actualizar plan Premium (ilimitado)
UPDATE planes SET
  max_propiedades = NULL,
  max_contratos   = NULL,
  max_contactos   = NULL,
  max_usuarios    = NULL
WHERE nombre = 'Premium';

-- Verificar resultado
SELECT nombre, max_propiedades, max_contratos, max_contactos, max_usuarios 
FROM planes 
WHERE nombre IN ('Starter', 'Pro', 'Premium');
