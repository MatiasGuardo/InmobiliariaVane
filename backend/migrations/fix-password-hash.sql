-- Expandir columna password_hash para soportar bcrypt completo (60 caracteres)
ALTER TABLE usuarios MODIFY password_hash VARCHAR(255);

-- Actualizar hashes de testing
UPDATE usuarios 
SET password_hash = '$2b$10$6YvOv0VoQc/BbnWCbgVBk.8.BmOQPiBU6JA1Cc6GQF.43320tage6'
WHERE email IN ('admin@localhost', 'starter@localhost', 'pro@localhost', 'viewer@localhost');

-- Verificar que se aplicó correctamente
SELECT email, LENGTH(password_hash) as hash_length FROM usuarios 
WHERE email IN ('admin@localhost', 'starter@localhost', 'pro@localhost', 'viewer@localhost');
