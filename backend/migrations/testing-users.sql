-- ================================================================================================
-- SCRIPT: Crear Usuarios de Testing
-- ================================================================================================
-- Este script crea usuarios de prueba para cada tipo de plan
-- Para testing de la aplicación
-- ================================================================================================

-- Usuario Admin
INSERT INTO usuarios (tenant_id, email, password_hash, nombre, rol, activo)
VALUES (
  1,
  'admin@localhost',
  '$2b$10$6YvOv0VoQc/BbnWCbgVBk.8.BmOQPiBU6JA1Cc6GQF.43320tage6',  -- password: admin123
  'Admin Default',
  'admin',
  TRUE
);

-- Usuario Starter Plan
INSERT INTO usuarios (tenant_id, email, password_hash, nombre, rol, activo)
VALUES (
  1,
  'starter@localhost',
  '$2b$10$6YvOv0VoQc/BbnWCbgVBk.8.BmOQPiBU6JA1Cc6GQF.43320tage6',  
  'Juan Starter',
  'user',
  TRUE
);

-- Usuario Pro Plan
INSERT INTO usuarios (tenant_id, email, password_hash, nombre, rol, activo)
VALUES (
  1,
  'pro@localhost',
  '$2b$10$6YvOv0VoQc/BbnWCbgVBk.8.BmOQPiBU6JA1Cc6GQF.43320tage6',  
  'María Pro',
  'user',
  TRUE
);

-- Usuario Viewer (sin acceso a modificar, solo lectura)
INSERT INTO usuarios (tenant_id, email, password_hash, nombre, rol, activo)
VALUES (
  1,
  'viewer@localhost',
  '$2b$10$6YvOv0VoQc/BbnWCbgVBk.8.BmOQPiBU6JA1Cc6GQF.43320tage6', 
  'Carlos Viewer',
  'viewer',
  TRUE
);

-- Crear suscripciones para los usuarios
-- Usuario Starter: Plan Starter (ID 1)
INSERT INTO suscripciones (usuario_id, tenant_id, plan_id, fecha_inicio, fecha_fin, fecha_renovacion_proximo, estado, ciclo_facturacion, renovacion_automatica)
SELECT 
  u.id,
  1,
  1, 
  CURDATE(),
  DATE_ADD(CURDATE(), INTERVAL 30 DAY),
  DATE_ADD(CURDATE(), INTERVAL 30 DAY),
  'activo',
  'mensual',
  0
FROM usuarios u
WHERE u.email = 'starter@localhost';

-- Usuario Pro: Plan Pro (ID 2)
INSERT INTO suscripciones (usuario_id, tenant_id, plan_id, fecha_inicio, fecha_fin, fecha_renovacion_proximo, estado, ciclo_facturacion, renovacion_automatica)
SELECT 
  u.id,
  1,
  2, 
  CURDATE(),
  DATE_ADD(CURDATE(), INTERVAL 365 DAY),
  DATE_ADD(CURDATE(), INTERVAL 365 DAY),
  'activo',
  'anual',
  1
FROM usuarios u
WHERE u.email = 'pro@localhost';

-- Usuario Viewer: Plan Starter (ID 1) - acceso limitado
INSERT INTO suscripciones (usuario_id, tenant_id, plan_id, fecha_inicio, fecha_fin, fecha_renovacion_proximo, estado, ciclo_facturacion, renovacion_automatica)
SELECT 
  u.id,
  1,
  1,
  CURDATE(),
  DATE_ADD(CURDATE(), INTERVAL 14 DAY),
  DATE_ADD(CURDATE(), INTERVAL 14 DAY),
  'activo',
  'mensual',
  0
FROM usuarios u
WHERE u.email = 'viewer@localhost';

-- ================================================================================================
-- VERIFICACIÓN
-- ================================================================================================
-- SELECT * FROM usuarios WHERE email IN ('admin@localhost', 'starter@localhost', 'pro@localhost', 'viewer@localhost');
-- SELECT u.email, p.nombre as plan, s.fecha_fin FROM suscripciones s
-- JOIN usuarios u ON u.id = s.usuario_id
-- JOIN planes p ON p.id = s.plan_id
-- WHERE u.email IN ('admin@localhost', 'starter@localhost', 'pro@localhost', 'viewer@localhost');
-- ================================================================================================

-- ================================================================================================
-- LIMPIAR USUARIOS DE TESTING (ejecutar si necesitas empezar de nuevo)
-- ================================================================================================
-- DELETE FROM suscripciones WHERE usuario_id IN (
--   SELECT id FROM usuarios WHERE email IN ('admin@localhost', 'starter@localhost', 'pro@localhost', 'viewer@localhost')
-- );
-- DELETE FROM usuarios WHERE email IN ('admin@localhost', 'starter@localhost', 'pro@localhost', 'viewer@localhost');
-- ================================================================================================
