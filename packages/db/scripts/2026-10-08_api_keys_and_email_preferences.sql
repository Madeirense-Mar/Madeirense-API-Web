-- =============================================================================================================
-- 2026-10-08 — API keys, management console & e-mail preferences
--
-- Run once against each existing database (dev → staging → production), then
-- refresh the Prisma client:
--     cd packages/db && yarn prisma:dev      (or prisma:staging / prisma)
--
-- The same CREATE TABLE is also appended to MADEIRENSE_TABLES.sql so a fresh
-- database gets it too. Safe to re-run: every statement is guarded.
-- Written for MariaDB 10.x / MySQL 8 (same dialect as the rest of /scripts).
-- =============================================================================================================

USE madeirense;

-- -------------------------------------------------------------------------------------------------------------
-- Api_Keys
--
-- Differences from the original ID | NAME | KEY | USAGE | EXPIRES_AT | CREATED_AT | UPDATED_AT | CREATED_BY idea:
--
--   * KEY is never stored. Only its SHA-256 (`key_hash`) is, plus a short
--     non-secret `key_prefix` (e.g. `mdr_live_a1B2c3`) so a key can still be
--     recognised in the list. A database dump/leak therefore can't be used to
--     call the API. The full key is shown exactly once, when it's generated.
--   * USAGE is split in two: `usage_type` (what the key is for — web, mobile,
--     developer, shareholder…) and `usage_count` / `last_used_at` /
--     `last_used_ip` (how much it's actually being used).
--   * Revoking is a soft action (`revoked_at` / `revoked_by`) so there is an
--     audit trail of who switched a key off and when.
--   * `expires_at` is DATETIME (not TIMESTAMP) so far-future dates past 2038
--     are valid; NULL means "never expires".
--   * `created_by` / `revoked_by` use ON DELETE SET NULL so deleting a staff
--     user doesn't delete (and silently invalidate) the keys they created.
-- -------------------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Api_Keys` (
  `key_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `usage_type` enum('web','mobile','developer','shareholder','service','other') NOT NULL DEFAULT 'other',
  `description` varchar(500) DEFAULT NULL,
  `key_prefix` varchar(24) NOT NULL,
  `key_hash` char(64) NOT NULL,
  `usage_count` bigint(20) unsigned NOT NULL DEFAULT 0,
  `last_used_at` datetime DEFAULT NULL,
  `last_used_ip` varchar(45) DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `revoked_by` int(11) DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`key_id`),
  UNIQUE KEY `key_hash` (`key_hash`),
  KEY `created_by` (`created_by`),
  KEY `revoked_by` (`revoked_by`),
  KEY `idx_active` (`revoked_at`, `expires_at`),
  CONSTRAINT `Api_Keys_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `Users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `Api_Keys_ibfk_2` FOREIGN KEY (`revoked_by`) REFERENCES `Users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------------------------------------------
-- Users.email_marketing
--
-- Opt-out flag for marketing/broadcast e-mails (announcements, new events…).
-- Transactional e-mails (order updates, receipts, tickets) ignore it.
-- Flipped to 0 by the unsubscribe link in every broadcast e-mail.
-- -------------------------------------------------------------------------------------------------------------
SET @has_column := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users' AND COLUMN_NAME = 'email_marketing'
);

SET @ddl := IF(@has_column = 0,
  'ALTER TABLE `Users` ADD COLUMN `email_marketing` tinyint(1) NOT NULL DEFAULT 1',
  'SELECT ''Users.email_marketing already exists'''
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
