-- ============================================================
-- Script de migration GoRide - Colonnes manquantes
-- À exécuter dans phpMyAdmin > goride_db
-- ============================================================

-- 1. Ajouter les colonnes reset_token si manquantes
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS reset_token_expiration DATETIME NULL;

-- 2. Ajouter les colonnes profile si manquantes
ALTER TABLE users
ADD COLUMN IF NOT EXISTS wallet_balance DOUBLE DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS loyalty_points INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS loyalty_tier VARCHAR(50) DEFAULT 'Bronze',
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS profile_completion INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'light',
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'fr',
ADD COLUMN IF NOT EXISTS notif_email TINYINT(1) DEFAULT 1,
ADD COLUMN IF NOT EXISTS notif_sms TINYINT(1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS notif_push TINYINT(1) DEFAULT 1,
ADD COLUMN IF NOT EXISTS secondary_email VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500) NULL;

-- 3. Vérification
SELECT 
  COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'goride_db' AND TABLE_NAME = 'users'
ORDER BY ORDINAL_POSITION;
