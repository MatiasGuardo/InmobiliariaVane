-- ================================================================================================
-- MIGRACIÓN 005: Token Blacklist (logout + invalidación de JWT)
-- ================================================================================================
CREATE TABLE IF NOT EXISTS token_blacklist (
  id INT PRIMARY KEY AUTO_INCREMENT,
  jti VARCHAR(64) NOT NULL,
  usuario_id INT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_jti (jti),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
