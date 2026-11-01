# 🏨 CampusNest - College Hostel Management System

A full-stack, portfolio-grade College Hostel Management System built with **Node.js**, **Express**, **MySQL2**, and pure **HTML5 / CSS3 / JavaScript (ES6+)**.

---

## 📁 Project Architecture

```
clg hst/
├── package.json              # Project dependencies & npm scripts
├── server.js                 # Express backend REST API & MySQL Connection Pool
├── schema.sql                # Complete MySQL Workbench schema & sample seed data
├── README.md                 # Setup & configuration guide
└── public/                   # Static frontend application directory
    ├── index.html            # Dashboard with KPI cards & visual room occupancy grid
    ├── students.html         # Student directory with search, branch filter & actions
    ├── rooms.html            # Rooms list with visual occupancy grid & block filters
    ├── allocations.html      # Allocations log with 1-click "Vacate Room" action
    ├── insert.html           # Tabbed forms to insert Student, Room, or Allocation
    ├── update.html           # Form to edit student details or room maintenance status
    ├── css/
    │   └── style.css         # Modern dark luxury design system & responsive UI
    └── js/
        └── app.js            # Client-side JavaScript for API calls & DOM rendering
```

---

## 🚀 Quick Setup Guide

### Step 1: Install Dependencies
Run the following command in the project root directory:
```bash
npm install
```

### Step 2: Set up MySQL Database in MySQL Workbench
1. Open **MySQL Workbench** and connect to your local MySQL instance (usually `localhost:3306`).
2. Open the file [`schema.sql`](schema.sql) in MySQL Workbench (`File -> Open SQL Script...`).
3. Click the ⚡ **Execute** button (or press `Ctrl + Shift + Enter`) to create the `college` database, all 3 tables (`students`, `rooms`, `allocations`), and insert the initial test records.

### Step 3: Configure Database Credentials in `server.js`
Open [`server.js`](server.js) and locate the `DB_CONFIG` block around line 24:

```javascript
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'your_password', // <--- REPLACE WITH YOUR MYSQL PASSWORD
  database: process.env.DB_NAME || 'college',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};
```
Replace `'your_password'` with your MySQL root password. Alternatively, you can run the server with environment variables:
```bash
$env:DB_PASSWORD="your_actual_password"; npm start
```

> **Note**: Even if MySQL is temporarily disconnected or the password hasn't been set yet, the server gracefully activates its **built-in in-memory fallback dataset** so the web interface is 100% interactive and testable immediately!

### Step 4: Start the Server
```bash
npm start
```
or in watch mode for development:
```bash
npm run dev
```

Open your browser and navigate to:
```
👉 http://localhost:3000
```

---

## 🗄 Database Schema Reference

### 1. `students` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `student_id` | INT | PRIMARY KEY AUTO_INCREMENT | Unique student ID |
| `name` | VARCHAR(100) | NOT NULL | Full name of student |
| `roll_no` | VARCHAR(30) | NOT NULL UNIQUE | Institutional roll number |
| `branch` | VARCHAR(50) | NOT NULL | Department / Branch |
| `phone` | VARCHAR(15) | NOT NULL | Student contact number |
| `parent_phone` | VARCHAR(15) | NOT NULL | Parent / Guardian phone |

### 2. `rooms` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `room_id` | INT | PRIMARY KEY AUTO_INCREMENT | Unique room ID |
| `room_no` | VARCHAR(20) | NOT NULL | Room code (e.g. A-101) |
| `block_name` | VARCHAR(50) | NOT NULL | Hostel block name |
| `capacity` | INT | NOT NULL | Total bed count |
| `occupied` | INT | DEFAULT 0 | Currently allocated beds |
| `status` | VARCHAR(20) | NOT NULL | `'Available'`, `'Full'`, `'Maintenance'` |

### 3. `allocations` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `allocation_id` | INT | PRIMARY KEY AUTO_INCREMENT | Unique allocation ID |
| `student_id` | INT | FK -> `students.student_id` | Student assigned |
| `room_id` | INT | FK -> `rooms.room_id` | Room assigned |
| `allocation_date` | DATE | NOT NULL | Date of check-in |
| `vacate_date` | DATE | DEFAULT NULL | Date of check-out (NULL if active) |
| `status` | VARCHAR(20) | DEFAULT `'Active'` | `'Active'`, `'Vacated'` |

---

## ⚡ REST API Documentation

### Students
- `GET /api/students` - List all students (supports `?search=...&branch=...`)
- `GET /api/students/:id` - Get student details by ID
- `POST /api/students` - Create student `{ name, roll_no, branch, phone, parent_phone }`
- `PUT /api/students/:id` - Update student information
- `DELETE /api/students/:id` - Remove student (prevents deletion if student has active room)

### Rooms
- `GET /api/rooms` - List all rooms (supports `?block=...&status=...&availableOnly=true`)
- `GET /api/rooms/:id` - Get room details by ID
- `POST /api/rooms` - Create room `{ room_no, block_name, capacity, status }`
- `PUT /api/rooms/:id` - Update room details / maintenance status
- `DELETE /api/rooms/:id` - Delete room (allowed only if occupied beds = 0)

### Allocations & Vacating
- `GET /api/allocations` - List all room allocations with joined student and room details
- `POST /api/allocations` - Allocate room to student:
  - Validates student doesn't already have an active room
  - Validates room has available bed space and is not in Maintenance
  - Increments room `occupied` bed count
  - Automatically updates room status to `'Full'` when capacity is reached
- `PUT /api/allocations/:id/vacate` - Vacate an active allocation:
  - Sets `vacate_date = CURDATE()`
  - Sets `status = 'Vacated'`
  - Decrements room `occupied` bed count
  - Automatically resets room status from `'Full'` back to `'Available'`

### Analytics & System
- `GET /api/dashboard/stats` - Returns KPI metrics: total students, total rooms, occupied beds, available beds, active allocations, occupancy %, block summaries, and recent allocations.
- `GET /api/health` - Returns database connectivity status (live MySQL vs in-memory demo).
