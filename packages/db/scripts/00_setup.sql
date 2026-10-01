-- One-time local dev setup: creates the database and app user matching
-- DATABASE_URL in packages/api/.env.development and packages/db/.env.
-- Run this once against a fresh local MySQL server (as root), then load
-- the schema/data files below it in this same folder.

CREATE DATABASE IF NOT EXISTS madeirense
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'madeirense_user'@'localhost'
  IDENTIFIED BY 'h5j32p4!$#gkjPO,APFIU';

GRANT ALL PRIVILEGES ON madeirense.* TO 'madeirense_user'@'localhost';

FLUSH PRIVILEGES;
