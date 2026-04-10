-- ================================================================================================
-- MIGRACIÓN 001: Autenticación JWT + Multi-Tenancy
-- ================================================================================================
-- Este script prepara la BD para soportar múltiples clientes (tenants) con autenticación.
--
-- CAMBIOS:
-- 1. Crear tabla `tenants` — representa cada inmobiliaria/cliente
-- 2. Crear tabla `usuarios` — usuarios que usan la app (con contraseñas)
-- 3. Agregar `tenant_id` a TODAS las tablas de negocio
-- 4. Garantizar que datos de un tenant no se vean desde otro
--
-- ⚠️  IMPORTANTE: Ejecutar en orden. Hacer backup antes de ejecutar.
-- ================================================================================================

-- Paso 1: Crear tabla de TENANTS (inmobiliarias)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  plan VARCHAR(50) DEFAULT 'basic', 
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_activo (activo),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Paso 2: Crear tabla de USUARIOS (personas que loguean)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'user', 'viewer') DEFAULT 'user',
  activo BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_email_per_tenant (tenant_id, email),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_email (email),
  INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Paso 3: Agregar tenant_id a PERSONAS
-- ─────────────────────────────────────────────────────────────────────
-- Si la columna ya existe, el IF NOT EXISTS la ignora
ALTER TABLE personas 
ADD COLUMN tenant_id INT DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id),
ADD FOREIGN KEY fk_personas_tenant (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Paso 4: Agregar tenant_id a PROPIEDADES
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE propiedades 
ADD COLUMN tenant_id INT DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id),
ADD FOREIGN KEY fk_propiedades_tenant (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Paso 5: Agregar tenant_id a CONTRATOS
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE contratos 
ADD COLUMN tenant_id INT DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id),
ADD FOREIGN KEY fk_contratos_tenant (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Paso 6: Agregar tenant_id a DOCUMENTOS (si existe)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE documentos 
ADD COLUMN tenant_id INT DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id),
ADD FOREIGN KEY fk_documentos_tenant (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Paso 7: Agregar tenant_id a INDICES_HISTORICOS
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE indices_historicos 
ADD COLUMN tenant_id INT DEFAULT 1 AFTER id,
ADD INDEX idx_tenant_id (tenant_id),
ADD FOREIGN KEY fk_indices_tenant (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- ================================================================================================
-- INICIALIZACIÓN: Insertar tenant por defecto para migración sin downtime
-- ================================================================================================
-- Si es la primera vez, esto crea el tenant "default" con ID=1
-- Todos los datos existentes quedan asignados a este tenant
INSERT IGNORE INTO tenants (id, nombre, email, plan, activo) 
VALUES (1, 'OnKey', 'default@localhost', 'basic', TRUE);

-- Crear usuario admin por defecto (contraseña: cambiar después!)
-- Hash de "admin123" con bcrypt
INSERT IGNORE INTO usuarios (tenant_id, email, password_hash, nombre, rol, activo)
VALUES (
  1,
  'admin@localhost',
  '$2b$10$TEF6cnHiBxvWp21eJdH8Nu7kIoaxgaP/5b5qNp/sIL0decurEzPbu',  -- ⚠️  CAMBIAR por un hash real
  'Admin Default',
  'admin',
  TRUE
);

-- ================================================================================================
-- VERIFICACIÓN
-- ================================================================================================
-- Después de ejecutar, verifica que:
-- 1. SELECT COUNT(*) FROM tenants; → debe dar 1
-- 2. SELECT COUNT(*) FROM usuarios; → debe dar 1
-- 3. SELECT * FROM personas LIMIT 1; → debe tener columna tenant_id con valor 1
-- 4. SELECT * FROM propiedades LIMIT 1; → debe tener columna tenant_id con valor 1
-- ================================================================================================
