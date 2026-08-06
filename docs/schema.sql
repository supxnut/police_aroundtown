-- ============================================================
-- FiveM Police Management Web System - MySQL Database Schema
-- Database Name: police_mdt
-- ============================================================

CREATE DATABASE IF NOT EXISTS police_mdt DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE police_mdt;

-- ------------------------------------------------------------
-- 1. Table: users
-- Stores police officers and staff accounts synced with Discord IDs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  discord_id VARCHAR(64) NOT NULL UNIQUE,
  fullname VARCHAR(100) NOT NULL,
  rank VARCHAR(50) NOT NULL DEFAULT 'Cadet',
  start_date DATE NOT NULL,
  avatar VARCHAR(255) DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. Table: duty_logs
-- Stores duty shifts, start/end times, and calculated hours
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS duty_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  date DATE NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  hours DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. Table: cases
-- Stores police investigation cases and totals
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  case_number VARCHAR(30) NOT NULL UNIQUE,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  suspect_name VARCHAR(100) DEFAULT 'Unknown',
  officer_in_charge VARCHAR(100) DEFAULT 'Unassigned',
  status ENUM('open', 'closed', 'pending') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. Table: activities
-- Active department training, operations, and events
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  reward VARCHAR(100) NOT NULL,
  image VARCHAR(255) DEFAULT 'https://images.unsplash.com/photo-1508847154043-be5407fcaa5a?w=600',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('active', 'finished') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. Table: activity_join
-- Tracks officers joining an activity (Police can join ONLY once)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_join (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_activity_user (activity_id, user_id),
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. Table: activity_history
-- Archive table for finished activities kept forever for admin audits
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  reward VARCHAR(100) NOT NULL,
  image VARCHAR(255),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'finished',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. Table: shop_items
-- Equipment and gear available in police shop
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shop_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  image VARCHAR(255) DEFAULT 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600',
  status ENUM('available', 'out_of_stock') NOT NULL DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 8. Table: logs
-- System audit logs recording every admin action
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_discord_id VARCHAR(64) NOT NULL,
  action VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  time VARCHAR(10) NOT NULL,
  affected_user VARCHAR(100) DEFAULT 'N/A',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 9. Table: discord_logs
-- Stores raw synced message logs from Discord Sync Bot
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discord_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message_id VARCHAR(64) NOT NULL UNIQUE,
  channel_id VARCHAR(64) NOT NULL,
  discord_id VARCHAR(64) NOT NULL,
  type VARCHAR(50) NOT NULL,
  raw_json LONGTEXT NOT NULL,
  reference_id VARCHAR(64) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 10. Table: announcements
-- Broadcast system announcements and alerts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('announcement', 'activity', 'system') DEFAULT 'announcement',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 11. Table: case_alerts
-- Stores duty vs case validation alerts for admin review
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  officer_id INT,
  case_id INT NOT NULL UNIQUE,
  case_number VARCHAR(30),
  alert_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'HIGH',
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  duty_start_time VARCHAR(20) DEFAULT 'N/A',
  duty_end_time VARCHAR(20) DEFAULT 'N/A',
  case_time VARCHAR(20) DEFAULT 'N/A',
  reviewed_at TIMESTAMP NULL,
  reviewed_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_case_alerts_status (status),
  INDEX idx_case_alerts_case_id (case_id),
  INDEX idx_case_alerts_officer_id (officer_id),
  FOREIGN KEY (officer_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
