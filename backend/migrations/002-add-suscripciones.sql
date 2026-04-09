-- ================================================================================================
-- MIGRACIÓN 002: Sistema de Suscripciones
-- ================================================================================================
-- Este script agrega soporte para suscripciones pagadas con diferentes planes
--
-- CAMBIOS:
-- 1. Crear tabla `suscripciones` — planes de pago de cada usuario
-- 2. Crear tabla `planes` — definición de planes (starter, pro, premium)
-- 3. Crear tabla `pagos` — historial de pagos/transacciones
--
-- ⚠️  IMPORTANTE: Ejecutar después de la migración 001
-- ================================================================================================

-- Paso 1: Crear tabla de PLANES (definición de planes disponibles)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT,
  precio_mensual DECIMAL(10, 2) NOT NULL,
  precio_anual DECIMAL(10, 2),
  limite_propiedades INT,
  limite_usuarios INT,
  include_reportes BOOLEAN DEFAULT FALSE,
  include_automatizacion BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Paso 2: Crear tabla de SUSCRIPCIONES (suscripción activa de cada usuario/tenant)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suscripciones (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  tenant_id INT NOT NULL,
  plan_id INT NOT NULL,
  
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  fecha_renovacion_proximo DATE,
  
  estado ENUM('activo', 'cancelado', 'expirado', 'pausado') DEFAULT 'activo',
  ciclo_facturacion ENUM('mensual', 'anual') DEFAULT 'mensual',
  
  renovacion_automatica BOOLEAN DEFAULT TRUE,
  metodo_pago VARCHAR(50), 
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES planes(id),
  UNIQUE KEY unique_usuario_tenant (usuario_id, tenant_id),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_estado (estado),
  INDEX idx_fecha_fin (fecha_fin),
  INDEX idx_activo (estado, fecha_fin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Paso 3: Crear tabla de PAGOS (historial de transacciones)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pagos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  suscripcion_id INT NOT NULL,
  usuario_id INT NOT NULL,
  tenant_id INT NOT NULL,
  
  monto DECIMAL(10, 2) NOT NULL,
  moneda VARCHAR(3) DEFAULT 'ARS',
  estado ENUM('pendiente', 'completado', 'fallido', 'reembolsado') DEFAULT 'pendiente',
  metodo_pago VARCHAR(50), 
  
  transaccion_id VARCHAR(255), 
  
  descripcion VARCHAR(255),
  
  fecha_pago TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (suscripcion_id) REFERENCES suscripciones(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_usuario_id (usuario_id),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_estado (estado),
  INDEX idx_fecha_pago (fecha_pago)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================================================
-- INICIALIZACIÓN: Insertar planes por defecto
-- ================================================================================================

INSERT IGNORE INTO planes (id, nombre, descripcion, precio_mensual, precio_anual, limite_propiedades, limite_usuarios, include_reportes, include_automatizacion, activo) 
VALUES 
  (1, 'Starter', 'Plan básico para pequeñas inmobiliarias', 5000, 299.90, 10, 1, FALSE, FALSE, TRUE),
  (2, 'Pro', 'Plan profesional con más features', 25000, 799.90, 50, 5, TRUE, FALSE, TRUE),
  (3, 'Premium', 'Plan completo con todas las features', 50000, 1999.90, 500, 20, TRUE, TRUE, TRUE);

-- Paso 4: Crear suscripción para el tenant default (admin - 1 año gratis)
-- ─────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO suscripciones (usuario_id, tenant_id, plan_id, fecha_inicio, fecha_fin, fecha_renovacion_proximo, estado, ciclo_facturacion, renovacion_automatica, metodo_pago)
VALUES (
  1,                                   
  1,                                    
  3,                                   
  CURDATE(),                            
  DATE_ADD(CURDATE(), INTERVAL 365 DAY),  
  DATE_ADD(CURDATE(), INTERVAL 365 DAY),  
  'activo',
  'anual',
  TRUE,                                 
  'manual'                             
);

-- ================================================================================================
-- VERIFICACIÓN
-- ================================================================================================
-- Después de ejecutar, verifica que:
-- 1. SELECT COUNT(*) FROM planes; → debe dar 3
-- 2. SELECT COUNT(*) FROM suscripciones; → debe dar 1
-- 3. SELECT * FROM suscripciones LIMIT 1; → debe mostrar suscripción del admin
-- ================================================================================================
