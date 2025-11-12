-- Email Tracker Database Schema
-- Run this in MySQL Workbench to create the database and tables

CREATE DATABASE IF NOT EXISTS email_tracker;
USE email_tracker;

SET SQL_SAFE_UPDATES = 1;

SET FOREIGN_KEY_CHECKS = 1;

SET FOREIGN_KEY_CHECKS = 1;

-- Recipients table
CREATE TABLE IF NOT EXISTS recipients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Click links table (stores tracking tokens)
CREATE TABLE IF NOT EXISTS click_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  emailId INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  targetUrl TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (emailId) REFERENCES recipients(id) ON DELETE CASCADE
);

-- Email opens tracking table
CREATE TABLE IF NOT EXISTS opens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  emailId INT NOT NULL,
  ip VARCHAR(45),
  userAgent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (emailId) REFERENCES recipients(id) ON DELETE CASCADE
);

-- Click logs table
CREATE TABLE IF NOT EXISTS click_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  emailId INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  ip VARCHAR(45),
  userAgent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (emailId) REFERENCES recipients(id) ON DELETE CASCADE,
  FOREIGN KEY (token) REFERENCES click_links(token) ON DELETE CASCADE
);

-- Insert some sample recipients (optional)
INSERT INTO recipients (name, email) VALUES
  ('Nunna Srinidhi','nunna.srinidhi1304@ibm.com');


