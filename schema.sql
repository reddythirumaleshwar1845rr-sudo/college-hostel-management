-- =====================================================================
-- QUICK FIX: Run these 3 ALTER TABLE statements in MySQL Workbench if you
-- encounter "Error: Field 'allocation_id' doesn't have a default value":
-- ---------------------------------------------------------------------
-- USE college;
-- ALTER TABLE allocations MODIFY COLUMN allocation_id INT AUTO_INCREMENT;
-- ALTER TABLE students MODIFY COLUMN student_id INT AUTO_INCREMENT;
-- ALTER TABLE rooms MODIFY COLUMN room_id INT AUTO_INCREMENT;
-- =====================================================================

-- Step 1: Create Database if not exists
CREATE DATABASE IF NOT EXISTS college;
USE college;

-- Step 2: Drop existing tables (in foreign key order) if re-initializing
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS allocations;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS students;
SET FOREIGN_KEY_CHECKS = 1;

-- Step 3: Create Students Table
CREATE TABLE IF NOT EXISTS students (
  student_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  roll_no VARCHAR(30) NOT NULL UNIQUE,
  branch VARCHAR(50) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  parent_phone VARCHAR(15) NOT NULL
);

-- Step 4: Create Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
  room_id INT AUTO_INCREMENT PRIMARY KEY,
  room_no VARCHAR(20) NOT NULL,
  block_name VARCHAR(50) NOT NULL,
  capacity INT NOT NULL DEFAULT 3,
  occupied INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'Available' -- 'Available', 'Full', 'Maintenance'
);

-- Step 5: Create Allocations Table
CREATE TABLE IF NOT EXISTS allocations (
  allocation_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  room_id INT NOT NULL,
  allocation_date DATE NOT NULL,
  vacate_date DATE DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Active', -- 'Active', 'Vacated'
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
);

-- =====================================================================
-- Step 6: Insert Sample Data for Demonstration
-- =====================================================================

-- Insert Students
INSERT INTO students (student_id, name, roll_no, branch, phone, parent_phone) VALUES
(1, 'Aarav Sharma', '21CS001', 'Computer Science', '9876543210', '9876500001'),
(2, 'Diya Patel', '21EC014', 'Electronics & Comm', '9876543211', '9876500002'),
(3, 'Rohan Verma', '21ME032', 'Mechanical Eng', '9876543212', '9876500003'),
(4, 'Ananya Iyer', '21CS045', 'Computer Science', '9876543213', '9876500004'),
(5, 'Vikram Singh', '21CV019', 'Civil Engineering', '9876543214', '9876500005'),
(6, 'Sneha Reddy', '21IT027', 'Information Tech', '9876543215', '9876500006'),
(7, 'Aditya Joshi', '22AI008', 'AI & Data Science', '9876543216', '9876500007'),
(8, 'Kavya Nair', '22CS089', 'Computer Science', '9876543217', '9876500008');

-- Insert Rooms
INSERT INTO rooms (room_id, room_no, block_name, capacity, occupied, status) VALUES
(101, 'A-101', 'Block A (Boys)', 3, 2, 'Available'),
(102, 'A-102', 'Block A (Boys)', 2, 2, 'Full'),
(103, 'A-103', 'Block A (Boys)', 3, 0, 'Maintenance'),
(201, 'B-201', 'Block B (Girls)', 3, 2, 'Available'),
(202, 'B-202', 'Block B (Girls)', 2, 1, 'Available'),
(203, 'B-203', 'Block B (Girls)', 3, 0, 'Available'),
(301, 'C-301', 'Block C (Tech)', 4, 1, 'Available'),
(302, 'C-302', 'Block C (Tech)', 2, 2, 'Full');

-- Insert Allocations
INSERT INTO allocations (allocation_id, student_id, room_id, allocation_date, vacate_date, status) VALUES
(1, 1, 101, '2026-08-01', NULL, 'Active'),
(2, 3, 101, '2026-08-02', NULL, 'Active'),
(3, 5, 102, '2026-08-01', NULL, 'Active'),
(4, 7, 102, '2026-08-05', NULL, 'Active'),
(5, 2, 201, '2026-08-03', NULL, 'Active'),
(6, 4, 201, '2026-08-04', NULL, 'Active'),
(7, 6, 202, '2026-08-10', NULL, 'Active'),
(8, 8, 301, '2026-08-12', NULL, 'Active');

-- Check Tables
SELECT * FROM students;
SELECT * FROM rooms;
SELECT * FROM allocations;
