/**
 * College Hostel Management System - Express Backend Server
 * Technology Stack: Node.js, Express, MySQL2, Static Frontend
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets from public/ folder
app.use(express.static(path.join(__dirname, 'public')));

// =====================================================================
// 1. MySQL Database Connection Pool Configuration
// =====================================================================
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root', // <--- Connected with local MySQL
  database: process.env.DB_NAME || 'college',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// =====================================================================
// 2. MySQL Driver Loading with Fallback Support (mysql2 / mysql)
// =====================================================================
let pool = null;
let isUsingMySQL = false;
let dbErrorNotice = null;

// Built-in in-memory fallback dataset (Active if MySQL is disconnected)
let memoryDB = {
  students: [
    { student_id: 1, name: 'Aarav Sharma', roll_no: '21CS001', branch: 'Computer Science', phone: '9876543210', parent_phone: '9876500001' },
    { student_id: 2, name: 'Diya Patel', roll_no: '21EC014', branch: 'Electronics & Comm', phone: '9876543211', parent_phone: '9876500002' },
    { student_id: 3, name: 'Rohan Verma', roll_no: '21ME032', branch: 'Mechanical Eng', phone: '9876543212', parent_phone: '9876500003' },
    { student_id: 4, name: 'Ananya Iyer', roll_no: '21CS045', branch: 'Computer Science', phone: '9876543213', parent_phone: '9876500004' },
    { student_id: 5, name: 'Vikram Singh', roll_no: '21CV019', branch: 'Civil Engineering', phone: '9876543214', parent_phone: '9876500005' },
    { student_id: 6, name: 'Sneha Reddy', roll_no: '21IT027', branch: 'Information Tech', phone: '9876543215', parent_phone: '9876500006' },
    { student_id: 7, name: 'Aditya Joshi', roll_no: '22AI008', branch: 'AI & Data Science', phone: '9876543216', parent_phone: '9876500007' },
    { student_id: 8, name: 'Kavya Nair', roll_no: '22CS089', branch: 'Computer Science', phone: '9876543217', parent_phone: '9876500008' }
  ],
  rooms: [
    { room_id: 101, room_no: 'A-101', block_name: 'Block A (Boys)', capacity: 3, occupied: 2, status: 'Available' },
    { room_id: 102, room_no: 'A-102', block_name: 'Block A (Boys)', capacity: 2, occupied: 2, status: 'Full' },
    { room_id: 103, room_no: 'A-103', block_name: 'Block A (Boys)', capacity: 3, occupied: 0, status: 'Maintenance' },
    { room_id: 201, room_no: 'B-201', block_name: 'Block B (Girls)', capacity: 3, occupied: 2, status: 'Available' },
    { room_id: 202, room_no: 'B-202', block_name: 'Block B (Girls)', capacity: 2, occupied: 1, status: 'Available' },
    { room_id: 203, room_no: 'B-203', block_name: 'Block B (Girls)', capacity: 3, occupied: 0, status: 'Available' },
    { room_id: 301, room_no: 'C-301', block_name: 'Block C (Tech)', capacity: 4, occupied: 1, status: 'Available' },
    { room_id: 302, room_no: 'C-302', block_name: 'Block C (Tech)', capacity: 2, occupied: 2, status: 'Full' }
  ],
  allocations: [
    { allocation_id: 1, student_id: 1, room_id: 101, allocation_date: '2026-08-01', vacate_date: null, status: 'Active' },
    { allocation_id: 2, student_id: 3, room_id: 101, allocation_date: '2026-08-02', vacate_date: null, status: 'Active' },
    { allocation_id: 3, student_id: 5, room_id: 102, allocation_date: '2026-08-01', vacate_date: null, status: 'Active' },
    { allocation_id: 4, student_id: 7, room_id: 102, allocation_date: '2026-08-05', vacate_date: null, status: 'Active' },
    { allocation_id: 5, student_id: 2, room_id: 201, allocation_date: '2026-08-03', vacate_date: null, status: 'Active' },
    { allocation_id: 6, student_id: 4, room_id: 201, allocation_date: '2026-08-04', vacate_date: null, status: 'Active' },
    { allocation_id: 7, student_id: 6, room_id: 202, allocation_date: '2026-08-10', vacate_date: null, status: 'Active' },
    { allocation_id: 8, student_id: 8, room_id: 301, allocation_date: '2026-08-12', vacate_date: null, status: 'Active' }
  ],
  nextStudentId: 9,
  nextRoomId: 303,
  nextAllocationId: 9
};

function initDatabaseDriver() {
  try {
    const mysql = require('mysql2/promise');
    pool = mysql.createPool(DB_CONFIG);
    console.log('[DB] Connecting to MySQL database...');
    
    pool.query('SELECT 1 + 1 AS solution')
      .then(() => {
        isUsingMySQL = true;
        console.log(`[DB] \x1b[32m✔ Successfully connected to MySQL database: "${DB_CONFIG.database}" on ${DB_CONFIG.host}\x1b[0m`);
      })
      .catch((err) => {
        isUsingMySQL = false;
        dbErrorNotice = err.message;
        console.warn(`[DB] \x1b[33m⚠ MySQL connection failed: ${err.message}\x1b[0m`);
        console.warn(`[DB] Notice: Using in-memory fallback dataset.`);
      });
  } catch (err1) {
    try {
      const mysql = require('mysql');
      const standardPool = mysql.createPool(DB_CONFIG);
      pool = {
        query: (sql, params) => new Promise((resolve, reject) => {
          standardPool.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve([results]);
          });
        })
      };
      console.log('[DB] Fallback driver `mysql` loaded.');
    } catch (err2) {
      console.warn('[DB] No MySQL driver found. Falling back to in-memory data store.');
      isUsingMySQL = false;
    }
  }
}

initDatabaseDriver();

// Helper to execute SQL or fallback
async function executeQuery(sql, params = []) {
  if (isUsingMySQL && pool) {
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (err) {
      console.error('[SQL Error]', err.message, '\nQuery:', sql, '\nParams:', params);
      throw err;
    }
  }
  return null;
}

// =====================================================================
// 3. REST API Endpoints
// =====================================================================

// Health / Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: isUsingMySQL ? 'mysql' : 'memory_demo',
    database: DB_CONFIG.database,
    host: DB_CONFIG.host,
    user: DB_CONFIG.user,
    message: isUsingMySQL 
      ? `Live MySQL Database Connected (${DB_CONFIG.database})` 
      : `Demo Mode (In-memory storage active)`,
    error: dbErrorNotice
  });
});

// ---------------------------------------------------------------------
// STUDENTS API
// ---------------------------------------------------------------------

// GET /api/students - List all students (optional ?search=...&branch=...)
app.get('/api/students', async (req, res) => {
  try {
    const { search, branch } = req.query;

    if (isUsingMySQL) {
      let sql = 'SELECT * FROM students WHERE 1=1';
      const params = [];

      if (search) {
        sql += ' AND (name LIKE ? OR roll_no LIKE ? OR phone LIKE ?)';
        const queryTerm = `%${search}%`;
        params.push(queryTerm, queryTerm, queryTerm);
      }

      if (branch) {
        sql += ' AND branch = ?';
        params.push(branch);
      }

      sql += ' ORDER BY student_id DESC';
      const rows = await executeQuery(sql, params);
      return res.json(rows);
    }

    // In-memory fallback
    let list = [...memoryDB.students];
    if (search) {
      const term = search.toLowerCase();
      list = list.filter(s => 
        s.name.toLowerCase().includes(term) || 
        s.roll_no.toLowerCase().includes(term) ||
        (s.phone && s.phone.includes(term))
      );
    }
    if (branch) {
      list = list.filter(s => s.branch === branch);
    }
    list.sort((a, b) => b.student_id - a.student_id);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/students/lookup - Search single student by ID or Roll No
app.get('/api/students/lookup', async (req, res) => {
  try {
    const { id, roll_no } = req.query;
    if (!id && !roll_no) {
      return res.status(400).json({ error: 'Please provide either id or roll_no.' });
    }

    if (isUsingMySQL) {
      let sql = 'SELECT * FROM students WHERE ';
      const params = [];
      if (id) {
        sql += 'student_id = ?';
        params.push(parseInt(id));
      } else {
        sql += 'roll_no = ?';
        params.push(roll_no.trim());
      }

      const rows = await executeQuery(sql, params);
      if (rows.length === 0) return res.status(404).json({ error: 'Student record not found.' });

      // Join active allocation details if any
      const allocs = await executeQuery(`
        SELECT a.allocation_id, a.room_id, a.allocation_date, a.status, r.room_no, r.block_name 
        FROM allocations a 
        JOIN rooms r ON a.room_id = r.room_id 
        WHERE a.student_id = ? AND UPPER(a.status) = 'ACTIVE'
      `, [rows[0].student_id]);

      return res.json({
        ...rows[0],
        activeAllocation: allocs.length > 0 ? allocs[0] : null
      });
    }

    // In-memory fallback
    const student = memoryDB.students.find(s => 
      (id && s.student_id === parseInt(id)) || 
      (roll_no && s.roll_no.toLowerCase() === roll_no.toLowerCase().trim())
    );
    if (!student) return res.status(404).json({ error: 'Student record not found.' });

    const activeAlloc = memoryDB.allocations.find(a => a.student_id === student.student_id && a.status === 'Active');
    let allocInfo = null;
    if (activeAlloc) {
      const room = memoryDB.rooms.find(r => r.room_id === activeAlloc.room_id) || {};
      allocInfo = {
        allocation_id: activeAlloc.allocation_id,
        room_id: activeAlloc.room_id,
        allocation_date: activeAlloc.allocation_date,
        status: activeAlloc.status,
        room_no: room.room_no || 'N/A',
        block_name: room.block_name || 'N/A'
      };
    }

    res.json({ ...student, activeAllocation: allocInfo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/students/:id - Get single student by ID
app.get('/api/students/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isUsingMySQL) {
      const rows = await executeQuery('SELECT * FROM students WHERE student_id = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Student not found.' });
      return res.json(rows[0]);
    }

    const student = memoryDB.students.find(s => s.student_id === id);
    if (!student) return res.status(404).json({ error: 'Student not found.' });
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/students - Insert student
app.post('/api/students', async (req, res) => {
  try {
    const { name, roll_no, branch, phone, parent_phone } = req.body;
    if (!name || !roll_no || !branch || !phone || !parent_phone) {
      return res.status(400).json({ error: 'All student fields are required.' });
    }

    if (isUsingMySQL) {
      const existing = await executeQuery('SELECT student_id FROM students WHERE roll_no = ?', [roll_no]);
      if (existing.length > 0) {
        return res.status(400).json({ error: `Roll number "${roll_no}" already exists in database.` });
      }

      let studentId = req.body.student_id ? parseInt(req.body.student_id) : null;
      let result;

      if (studentId) {
        const sql = 'INSERT INTO students (student_id, name, roll_no, branch, phone, parent_phone) VALUES (?, ?, ?, ?, ?, ?)';
        result = await executeQuery(sql, [studentId, name, roll_no, branch, phone, parent_phone]);
      } else {
        try {
          const sql = 'INSERT INTO students (name, roll_no, branch, phone, parent_phone) VALUES (?, ?, ?, ?, ?)';
          result = await executeQuery(sql, [name, roll_no, branch, phone, parent_phone]);
          studentId = result.insertId;
        } catch (sqlErr) {
          if (sqlErr.message && (sqlErr.message.includes('student_id') || sqlErr.code === 'ER_NO_DEFAULT_FOR_FIELD')) {
            console.warn('[DB] Auto-increment missing on students. Falling back to MAX(student_id)+1');
            const maxResult = await executeQuery('SELECT COALESCE(MAX(student_id), 0) + 1 AS nextId FROM students');
            studentId = maxResult[0].nextId;
            const fallbackSql = 'INSERT INTO students (student_id, name, roll_no, branch, phone, parent_phone) VALUES (?, ?, ?, ?, ?, ?)';
            await executeQuery(fallbackSql, [studentId, name, roll_no, branch, phone, parent_phone]);
          } else {
            throw sqlErr;
          }
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Student registered successfully',
        student_id: studentId
      });
    }

    // In-memory fallback
    if (memoryDB.students.some(s => s.roll_no.toLowerCase() === roll_no.toLowerCase())) {
      return res.status(400).json({ error: `Roll number "${roll_no}" already exists in database.` });
    }
    const newStudent = {
      student_id: memoryDB.nextStudentId++,
      name,
      roll_no,
      branch,
      phone,
      parent_phone
    };
    memoryDB.students.push(newStudent);
    res.status(201).json({ success: true, message: 'Student registered successfully', student_id: newStudent.student_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/students/:id - Update student details
app.put('/api/students/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, roll_no, branch, phone, parent_phone } = req.body;

    if (!name || !roll_no || !branch || !phone || !parent_phone) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (isUsingMySQL) {
      const existing = await executeQuery(
        'SELECT student_id FROM students WHERE roll_no = ? AND student_id != ?',
        [roll_no, id]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: `Roll number "${roll_no}" is already used by another student.` });
      }

      const sql = 'UPDATE students SET name = ?, roll_no = ?, branch = ?, phone = ?, parent_phone = ? WHERE student_id = ?';
      const result = await executeQuery(sql, [name, roll_no, branch, phone, parent_phone, id]);
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Student not found.' });
      return res.json({ success: true, message: 'Student details updated successfully' });
    }

    // In-memory fallback
    const index = memoryDB.students.findIndex(s => s.student_id === id);
    if (index === -1) return res.status(404).json({ error: 'Student not found.' });

    if (memoryDB.students.some(s => s.student_id !== id && s.roll_no.toLowerCase() === roll_no.toLowerCase())) {
      return res.status(400).json({ error: `Roll number "${roll_no}" is already used by another student.` });
    }

    memoryDB.students[index] = { student_id: id, name, roll_no, branch, phone, parent_phone };
    res.json({ success: true, message: 'Student details updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/students/:id - Delete student by ID
app.delete('/api/students/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isUsingMySQL) {
      const activeAlloc = await executeQuery('SELECT * FROM allocations WHERE student_id = ? AND UPPER(status) = "ACTIVE"', [id]);
      if (activeAlloc.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete student with an active room allocation. Please vacate their room first.' 
        });
      }

      const result = await executeQuery('DELETE FROM students WHERE student_id = ?', [id]);
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Student not found.' });
      return res.json({ success: true, message: 'Student deleted successfully.' });
    }

    // In-memory fallback
    const hasActive = memoryDB.allocations.some(a => a.student_id === id && a.status === 'Active');
    if (hasActive) {
      return res.status(400).json({ 
        error: 'Cannot delete student with an active room allocation. Please vacate their room first.' 
      });
    }

    const initialLength = memoryDB.students.length;
    memoryDB.students = memoryDB.students.filter(s => s.student_id !== id);
    if (memoryDB.students.length === initialLength) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    memoryDB.allocations = memoryDB.allocations.filter(a => a.student_id !== id);

    res.json({ success: true, message: 'Student deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/students/by-roll/:roll_no - Delete student by Roll Number
app.delete('/api/students/by-roll/:roll_no', async (req, res) => {
  try {
    const rollNo = req.params.roll_no.trim();

    if (isUsingMySQL) {
      const rows = await executeQuery('SELECT * FROM students WHERE roll_no = ?', [rollNo]);
      if (rows.length === 0) return res.status(404).json({ error: `Student with roll number "${rollNo}" not found.` });

      const studentId = rows[0].student_id;
      const activeAlloc = await executeQuery('SELECT * FROM allocations WHERE student_id = ? AND UPPER(status) = "ACTIVE"', [studentId]);
      if (activeAlloc.length > 0) {
        return res.status(400).json({ 
          error: `Cannot delete ${rows[0].name}. They have an active room allocation. Please vacate their room first.` 
        });
      }

      await executeQuery('DELETE FROM students WHERE student_id = ?', [studentId]);
      return res.json({ success: true, message: `Student "${rows[0].name}" (${rollNo}) deleted successfully.` });
    }

    // In-memory fallback
    const student = memoryDB.students.find(s => s.roll_no.toLowerCase() === rollNo.toLowerCase());
    if (!student) return res.status(404).json({ error: `Student with roll number "${rollNo}" not found.` });

    const hasActive = memoryDB.allocations.some(a => a.student_id === student.student_id && a.status === 'Active');
    if (hasActive) {
      return res.status(400).json({ 
        error: `Cannot delete ${student.name}. They have an active room allocation. Please vacate their room first.` 
      });
    }

    memoryDB.students = memoryDB.students.filter(s => s.student_id !== student.student_id);
    memoryDB.allocations = memoryDB.allocations.filter(a => a.student_id !== student.student_id);

    res.json({ success: true, message: `Student "${student.name}" (${rollNo}) deleted successfully.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------
// ROOMS API
// ---------------------------------------------------------------------

// GET /api/rooms - List all rooms
app.get('/api/rooms', async (req, res) => {
  try {
    const { block, status, availableOnly } = req.query;

    if (isUsingMySQL) {
      let sql = 'SELECT * FROM rooms WHERE 1=1';
      const params = [];

      if (block) {
        sql += ' AND block_name = ?';
        params.push(block);
      }
      if (status) {
        sql += ' AND status = ?';
        params.push(status);
      }
      if (availableOnly === 'true') {
        sql += ' AND status = "Available" AND occupied < capacity';
      }

      sql += ' ORDER BY block_name ASC, room_no ASC';
      const rows = await executeQuery(sql, params);
      return res.json(rows);
    }

    // In-memory fallback
    let list = [...memoryDB.rooms];
    if (block) list = list.filter(r => r.block_name === block);
    if (status) list = list.filter(r => r.status === status);
    if (availableOnly === 'true') list = list.filter(r => r.status === 'Available' && r.occupied < r.capacity);
    list.sort((a, b) => a.room_no.localeCompare(b.room_no));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rooms/lookup - Lookup single room by ID or Room No
app.get('/api/rooms/lookup', async (req, res) => {
  try {
    const { id, room_no } = req.query;
    if (!id && !room_no) {
      return res.status(400).json({ error: 'Please provide either id or room_no.' });
    }

    if (isUsingMySQL) {
      let sql = 'SELECT * FROM rooms WHERE ';
      const params = [];
      if (id) {
        sql += 'room_id = ?';
        params.push(parseInt(id));
      } else {
        sql += 'room_no = ?';
        params.push(room_no.trim());
      }

      const rows = await executeQuery(sql, params);
      if (rows.length === 0) return res.status(404).json({ error: 'Room record not found.' });

      // Fetch current occupants
      const occupants = await executeQuery(`
        SELECT a.allocation_id, a.allocation_date, s.student_id, s.name, s.roll_no, s.branch, s.phone 
        FROM allocations a 
        JOIN students s ON a.student_id = s.student_id 
        WHERE a.room_id = ? AND a.status = 'Active'
      `, [rows[0].room_id]);

      return res.json({
        ...rows[0],
        occupants
      });
    }

    // In-memory fallback
    const room = memoryDB.rooms.find(r => 
      (id && r.room_id === parseInt(id)) || 
      (room_no && r.room_no.toLowerCase() === room_no.toLowerCase().trim())
    );
    if (!room) return res.status(404).json({ error: 'Room record not found.' });

    const occupants = memoryDB.allocations
      .filter(a => a.room_id === room.room_id && a.status === 'Active')
      .map(a => {
        const student = memoryDB.students.find(s => s.student_id === a.student_id) || {};
        return {
          allocation_id: a.allocation_id,
          allocation_date: a.allocation_date,
          student_id: a.student_id,
          name: student.name || 'Unknown',
          roll_no: student.roll_no || 'N/A',
          branch: student.branch || 'N/A',
          phone: student.phone || 'N/A'
        };
      });

    res.json({ ...room, occupants });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rooms/:id - Get single room by ID
app.get('/api/rooms/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isUsingMySQL) {
      const rows = await executeQuery('SELECT * FROM rooms WHERE room_id = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Room not found.' });
      return res.json(rows[0]);
    }

    const room = memoryDB.rooms.find(r => r.room_id === id);
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rooms - Insert room
app.post('/api/rooms', async (req, res) => {
  try {
    const { room_no, block_name, capacity, status } = req.body;
    if (!room_no || !block_name || !capacity) {
      return res.status(400).json({ error: 'Room number, block name, and capacity are required.' });
    }

    const capNum = parseInt(capacity);
    const roomStatus = status || 'Available';

    if (isUsingMySQL) {
      const existing = await executeQuery('SELECT room_id FROM rooms WHERE room_no = ? AND block_name = ?', [room_no, block_name]);
      if (existing.length > 0) {
        return res.status(400).json({ error: `Room "${room_no}" already exists in ${block_name}.` });
      }

      let roomId = req.body.room_id ? parseInt(req.body.room_id) : null;
      let result;

      if (roomId) {
        const sql = 'INSERT INTO rooms (room_id, room_no, block_name, capacity, occupied, status) VALUES (?, ?, ?, ?, 0, ?)';
        result = await executeQuery(sql, [roomId, room_no, block_name, capNum, roomStatus]);
      } else {
        try {
          const sql = 'INSERT INTO rooms (room_no, block_name, capacity, occupied, status) VALUES (?, ?, ?, 0, ?)';
          result = await executeQuery(sql, [room_no, block_name, capNum, roomStatus]);
          roomId = result.insertId;
        } catch (sqlErr) {
          if (sqlErr.message && (sqlErr.message.includes('room_id') || sqlErr.code === 'ER_NO_DEFAULT_FOR_FIELD')) {
            console.warn('[DB] Auto-increment missing on rooms. Falling back to MAX(room_id)+1');
            const maxResult = await executeQuery('SELECT COALESCE(MAX(room_id), 0) + 1 AS nextId FROM rooms');
            roomId = maxResult[0].nextId;
            const fallbackSql = 'INSERT INTO rooms (room_id, room_no, block_name, capacity, occupied, status) VALUES (?, ?, ?, ?, 0, ?)';
            await executeQuery(fallbackSql, [roomId, room_no, block_name, capNum, roomStatus]);
          } else {
            throw sqlErr;
          }
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Room created successfully',
        room_id: roomId
      });
    }

    // In-memory fallback
    if (memoryDB.rooms.some(r => r.room_no.toLowerCase() === room_no.toLowerCase() && r.block_name === block_name)) {
      return res.status(400).json({ error: `Room "${room_no}" already exists in ${block_name}.` });
    }

    const newRoom = {
      room_id: memoryDB.nextRoomId++,
      room_no,
      block_name,
      capacity: capNum,
      occupied: 0,
      status: roomStatus
    };
    memoryDB.rooms.push(newRoom);
    res.status(201).json({ success: true, message: 'Room created successfully', room_id: newRoom.room_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/rooms/:id - Update room details / maintenance status
app.put('/api/rooms/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { room_no, block_name, capacity, status } = req.body;

    if (!room_no || !block_name || capacity === undefined) {
      return res.status(400).json({ error: 'Room number, block name, and capacity are required.' });
    }

    const capNum = parseInt(capacity);

    if (isUsingMySQL) {
      const existing = await executeQuery('SELECT * FROM rooms WHERE room_id = ?', [id]);
      if (existing.length === 0) return res.status(404).json({ error: 'Room not found.' });
      
      const currentRoom = existing[0];
      if (capNum < currentRoom.occupied) {
        return res.status(400).json({ 
          error: `Capacity cannot be lower than currently occupied beds (${currentRoom.occupied}).` 
        });
      }

      let finalStatus = status || currentRoom.status;
      if (finalStatus !== 'Maintenance') {
        finalStatus = currentRoom.occupied >= capNum ? 'Full' : 'Available';
      }

      const sql = 'UPDATE rooms SET room_no = ?, block_name = ?, capacity = ?, status = ? WHERE room_id = ?';
      await executeQuery(sql, [room_no, block_name, capNum, finalStatus, id]);
      return res.json({ success: true, message: 'Room updated successfully' });
    }

    // In-memory fallback
    const room = memoryDB.rooms.find(r => r.room_id === id);
    if (!room) return res.status(404).json({ error: 'Room not found.' });

    if (capNum < room.occupied) {
      return res.status(400).json({ 
        error: `Capacity cannot be lower than currently occupied beds (${room.occupied}).` 
      });
    }

    let finalStatus = status || room.status;
    if (finalStatus !== 'Maintenance') {
      finalStatus = room.occupied >= capNum ? 'Full' : 'Available';
    }

    room.room_no = room_no;
    room.block_name = block_name;
    room.capacity = capNum;
    room.status = finalStatus;

    res.json({ success: true, message: 'Room updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/rooms/:id - Delete room by ID
app.delete('/api/rooms/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isUsingMySQL) {
      const room = await executeQuery('SELECT * FROM rooms WHERE room_id = ?', [id]);
      if (room.length === 0) return res.status(404).json({ error: 'Room not found.' });

      if (room[0].occupied > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete room with active occupants. Please vacate all students first.' 
        });
      }

      await executeQuery('DELETE FROM rooms WHERE room_id = ?', [id]);
      return res.json({ success: true, message: 'Room deleted successfully.' });
    }

    // In-memory fallback
    const room = memoryDB.rooms.find(r => r.room_id === id);
    if (!room) return res.status(404).json({ error: 'Room not found.' });

    if (room.occupied > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete room with active occupants. Please vacate all students first.' 
      });
    }

    memoryDB.rooms = memoryDB.rooms.filter(r => r.room_id !== id);
    res.json({ success: true, message: 'Room deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/rooms/by-no/:room_no - Delete room by Room Number
app.delete('/api/rooms/by-no/:room_no', async (req, res) => {
  try {
    const roomNo = req.params.room_no.trim();

    if (isUsingMySQL) {
      const rows = await executeQuery('SELECT * FROM rooms WHERE room_no = ?', [roomNo]);
      if (rows.length === 0) return res.status(404).json({ error: `Room "${roomNo}" not found.` });

      if (rows[0].occupied > 0) {
        return res.status(400).json({ 
          error: `Cannot delete Room ${roomNo}. It currently has ${rows[0].occupied} active occupant(s). Please vacate all students first.` 
        });
      }

      await executeQuery('DELETE FROM rooms WHERE room_id = ?', [rows[0].room_id]);
      return res.json({ success: true, message: `Room "${roomNo}" deleted successfully.` });
    }

    // In-memory fallback
    const room = memoryDB.rooms.find(r => r.room_no.toLowerCase() === roomNo.toLowerCase());
    if (!room) return res.status(404).json({ error: `Room "${roomNo}" not found.` });

    if (room.occupied > 0) {
      return res.status(400).json({ 
        error: `Cannot delete Room ${roomNo}. It currently has ${room.occupied} active occupant(s). Please vacate all students first.` 
      });
    }

    memoryDB.rooms = memoryDB.rooms.filter(r => r.room_id !== room.room_id);
    res.json({ success: true, message: `Room "${roomNo}" deleted successfully.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------
// ALLOCATIONS API
// ---------------------------------------------------------------------

// GET /api/allocations - List all allocations
app.get('/api/allocations', async (req, res) => {
  try {
    const { status } = req.query;

    if (isUsingMySQL) {
      let sql = `
        SELECT 
          a.allocation_id,
          a.student_id,
          a.room_id,
          DATE_FORMAT(a.allocation_date, '%Y-%m-%d') AS allocation_date,
          DATE_FORMAT(a.vacate_date, '%Y-%m-%d') AS vacate_date,
          a.status,
          s.name AS student_name,
          s.roll_no,
          s.branch,
          s.phone,
          r.room_no,
          r.block_name
        FROM allocations a
        JOIN students s ON a.student_id = s.student_id
        JOIN rooms r ON a.room_id = r.room_id
      `;
      const params = [];
      if (status) {
        sql += ' WHERE a.status = ?';
        params.push(status);
      }
      sql += ' ORDER BY a.allocation_id DESC';

      const rows = await executeQuery(sql, params);
      return res.json(rows);
    }

    // In-memory fallback
    let list = memoryDB.allocations.map(a => {
      const student = memoryDB.students.find(s => s.student_id === a.student_id) || {};
      const room = memoryDB.rooms.find(r => r.room_id === a.room_id) || {};
      return {
        ...a,
        student_name: student.name || 'Unknown',
        roll_no: student.roll_no || 'N/A',
        branch: student.branch || 'N/A',
        phone: student.phone || 'N/A',
        room_no: room.room_no || 'N/A',
        block_name: room.block_name || 'N/A'
      };
    });

    if (status) {
      list = list.filter(a => a.status === status);
    }
    list.sort((a, b) => b.allocation_id - a.allocation_id);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/allocations/lookup - Lookup single allocation by ID or Roll No
app.get('/api/allocations/lookup', async (req, res) => {
  try {
    const { id, roll_no } = req.query;
    if (!id && !roll_no) {
      return res.status(400).json({ error: 'Please provide either allocation id or roll_no.' });
    }

    if (isUsingMySQL) {
      let sql = `
        SELECT 
          a.allocation_id,
          a.student_id,
          a.room_id,
          DATE_FORMAT(a.allocation_date, '%Y-%m-%d') AS allocation_date,
          DATE_FORMAT(a.vacate_date, '%Y-%m-%d') AS vacate_date,
          a.status,
          s.name AS student_name,
          s.roll_no,
          s.branch,
          s.phone,
          r.room_no,
          r.block_name
        FROM allocations a
        JOIN students s ON a.student_id = s.student_id
        JOIN rooms r ON a.room_id = r.room_id
        WHERE 
      `;
      const params = [];
      if (id) {
        sql += 'a.allocation_id = ?';
        params.push(parseInt(id));
      } else {
        sql += 's.roll_no = ? ORDER BY a.allocation_id DESC LIMIT 1';
        params.push(roll_no.trim());
      }

      const rows = await executeQuery(sql, params);
      if (rows.length === 0) return res.status(404).json({ error: 'Allocation record not found.' });
      return res.json(rows[0]);
    }

    // In-memory fallback
    const alloc = memoryDB.allocations.find(a => {
      if (id && a.allocation_id === parseInt(id)) return true;
      if (roll_no) {
        const student = memoryDB.students.find(s => s.student_id === a.student_id);
        return student && student.roll_no.toLowerCase() === roll_no.toLowerCase().trim();
      }
      return false;
    });

    if (!alloc) return res.status(404).json({ error: 'Allocation record not found.' });

    const student = memoryDB.students.find(s => s.student_id === alloc.student_id) || {};
    const room = memoryDB.rooms.find(r => r.room_id === alloc.room_id) || {};

    res.json({
      ...alloc,
      student_name: student.name || 'Unknown',
      roll_no: student.roll_no || 'N/A',
      branch: student.branch || 'N/A',
      phone: student.phone || 'N/A',
      room_no: room.room_no || 'N/A',
      block_name: room.block_name || 'N/A'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/allocations - Allocate room to student
app.post('/api/allocations', async (req, res) => {
  try {
    const { student_id, room_id, allocation_date } = req.body;

    if (!student_id || !room_id) {
      return res.status(400).json({ error: 'Both Student and Room are required for allocation.' });
    }

    const sId = parseInt(student_id);
    const rId = parseInt(room_id);
    const allocDate = allocation_date || new Date().toISOString().split('T')[0];

    if (isUsingMySQL) {
      const student = await executeQuery('SELECT * FROM students WHERE student_id = ?', [sId]);
      if (student.length === 0) return res.status(404).json({ error: 'Student not found.' });

      const existingAlloc = await executeQuery('SELECT * FROM allocations WHERE student_id = ? AND UPPER(status) = "ACTIVE"', [sId]);
      if (existingAlloc.length > 0) {
        return res.status(400).json({ error: `${student[0].name} already has an active room allocation.` });
      }

      const room = await executeQuery('SELECT * FROM rooms WHERE room_id = ?', [rId]);
      if (room.length === 0) return res.status(404).json({ error: 'Room not found.' });
      
      const r = room[0];
      if (r.status === 'Maintenance') {
        return res.status(400).json({ error: `Room ${r.room_no} is currently under maintenance.` });
      }
      const currentOccupied = Number(r.occupied) || 0;
      if (currentOccupied >= r.capacity) {
        return res.status(400).json({ error: `Room ${r.room_no} is fully occupied.` });
      }

      let allocId = req.body.allocation_id ? parseInt(req.body.allocation_id) : null;
      let insertResult;

      if (allocId) {
        // Manual allocation ID provided
        const insertSql = 'INSERT INTO allocations (allocation_id, student_id, room_id, allocation_date, status) VALUES (?, ?, ?, ?, "Active")';
        insertResult = await executeQuery(insertSql, [allocId, sId, rId, allocDate]);
      } else {
        // Auto-increment allocation ID (omitting allocation_id column)
        try {
          const insertSql = 'INSERT INTO allocations (student_id, room_id, allocation_date, status) VALUES (?, ?, ?, "Active")';
          insertResult = await executeQuery(insertSql, [sId, rId, allocDate]);
          allocId = insertResult.insertId;
        } catch (sqlErr) {
          // Fallback if table lacks AUTO_INCREMENT in MySQL
          if (sqlErr.message && (sqlErr.message.includes('allocation_id') || sqlErr.code === 'ER_NO_DEFAULT_FOR_FIELD')) {
            console.warn('[DB] Auto-increment missing on allocations. Falling back to MAX(allocation_id)+1');
            const maxResult = await executeQuery('SELECT COALESCE(MAX(allocation_id), 0) + 1 AS nextId FROM allocations');
            allocId = maxResult[0].nextId;
            const fallbackSql = 'INSERT INTO allocations (allocation_id, student_id, room_id, allocation_date, status) VALUES (?, ?, ?, ?, "Active")';
            await executeQuery(fallbackSql, [allocId, sId, rId, allocDate]);
          } else {
            throw sqlErr;
          }
        }
      }

      const newOccupied = currentOccupied + 1;
      const newStatus = newOccupied >= r.capacity ? 'Full' : 'Available';
      await executeQuery('UPDATE rooms SET occupied = ?, status = ? WHERE room_id = ?', [newOccupied, newStatus, rId]);

      return res.status(201).json({
        success: true,
        message: `Bed in Room ${r.room_no} allocated to ${student[0].name} successfully!`,
        allocation_id: allocId
      });
    }

    // In-memory fallback
    const student = memoryDB.students.find(s => s.student_id === sId);
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const existingAlloc = memoryDB.allocations.find(a => a.student_id === sId && a.status === 'Active');
    if (existingAlloc) {
      return res.status(400).json({ error: `${student.name} already has an active room allocation.` });
    }

    const room = memoryDB.rooms.find(r => r.room_id === rId);
    if (!room) return res.status(404).json({ error: 'Room not found.' });

    if (room.status === 'Maintenance') {
      return res.status(400).json({ error: `Room ${room.room_no} is currently under maintenance.` });
    }
    if (room.occupied >= room.capacity) {
      return res.status(400).json({ error: `Room ${room.room_no} is fully occupied.` });
    }

    const newAlloc = {
      allocation_id: memoryDB.nextAllocationId++,
      student_id: sId,
      room_id: rId,
      allocation_date: allocDate,
      vacate_date: null,
      status: 'Active'
    };
    memoryDB.allocations.push(newAlloc);

    room.occupied += 1;
    room.status = room.occupied >= room.capacity ? 'Full' : 'Available';

    res.status(201).json({
      success: true,
      message: `Bed in Room ${room.room_no} allocated to ${student.name} successfully!`,
      allocation_id: newAlloc.allocation_id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/allocations/:id/vacate - Sets vacate_date = CURDATE(), status = 'Vacated', decrements room's occupied count
app.put('/api/allocations/:id/vacate', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isUsingMySQL) {
      const alloc = await executeQuery('SELECT * FROM allocations WHERE allocation_id = ?', [id]);
      if (alloc.length === 0) return res.status(404).json({ error: 'Allocation not found.' });

      const current = alloc[0];
      if (current.status && current.status.toUpperCase() === 'VACATED') {
        return res.status(400).json({ error: 'This room allocation has already been vacated.' });
      }

      await executeQuery(
        'UPDATE allocations SET vacate_date = CURDATE(), status = "Vacated" WHERE allocation_id = ?',
        [id]
      );

      const room = await executeQuery('SELECT * FROM rooms WHERE room_id = ?', [current.room_id]);
      if (room.length > 0) {
        const r = room[0];
        const newOccupied = Math.max(0, r.occupied - 1);
        const newStatus = r.status === 'Maintenance' 
          ? 'Maintenance' 
          : (newOccupied >= r.capacity ? 'Full' : 'Available');

        await executeQuery(
          'UPDATE rooms SET occupied = ?, status = ? WHERE room_id = ?',
          [newOccupied, newStatus, current.room_id]
        );
      }

      return res.json({
        success: true,
        message: 'Room vacated successfully and bed capacity updated.'
      });
    }

    // In-memory fallback
    const alloc = memoryDB.allocations.find(a => a.allocation_id === id);
    if (!alloc) return res.status(404).json({ error: 'Allocation not found.' });

    if (alloc.status === 'Vacated') {
      return res.status(400).json({ error: 'This room allocation has already been vacated.' });
    }

    alloc.vacate_date = new Date().toISOString().split('T')[0];
    alloc.status = 'Vacated';

    const room = memoryDB.rooms.find(r => r.room_id === alloc.room_id);
    if (room) {
      room.occupied = Math.max(0, room.occupied - 1);
      if (room.status !== 'Maintenance') {
        room.status = room.occupied >= room.capacity ? 'Full' : 'Available';
      }
    }

    res.json({
      success: true,
      message: 'Room vacated successfully and bed capacity updated.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/allocations/:id - Delete allocation record
app.delete('/api/allocations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isUsingMySQL) {
      const alloc = await executeQuery('SELECT * FROM allocations WHERE allocation_id = ?', [id]);
      if (alloc.length === 0) return res.status(404).json({ error: 'Allocation record not found.' });

      const current = alloc[0];
      // If was active, decrement room occupied count
      if (current.status === 'Active') {
        const room = await executeQuery('SELECT * FROM rooms WHERE room_id = ?', [current.room_id]);
        if (room.length > 0) {
          const r = room[0];
          const newOccupied = Math.max(0, r.occupied - 1);
          const newStatus = r.status === 'Maintenance' ? 'Maintenance' : (newOccupied >= r.capacity ? 'Full' : 'Available');
          await executeQuery('UPDATE rooms SET occupied = ?, status = ? WHERE room_id = ?', [newOccupied, newStatus, current.room_id]);
        }
      }

      await executeQuery('DELETE FROM allocations WHERE allocation_id = ?', [id]);
      return res.json({ success: true, message: 'Allocation record deleted successfully.' });
    }

    // In-memory fallback
    const alloc = memoryDB.allocations.find(a => a.allocation_id === id);
    if (!alloc) return res.status(404).json({ error: 'Allocation record not found.' });

    if (alloc.status === 'Active') {
      const room = memoryDB.rooms.find(r => r.room_id === alloc.room_id);
      if (room) {
        room.occupied = Math.max(0, room.occupied - 1);
        if (room.status !== 'Maintenance') {
          room.status = room.occupied >= room.capacity ? 'Full' : 'Available';
        }
      }
    }

    memoryDB.allocations = memoryDB.allocations.filter(a => a.allocation_id !== id);
    res.json({ success: true, message: 'Allocation record deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------
// SUMMARY STATS API
// ---------------------------------------------------------------------

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    if (isUsingMySQL) {
      const [totalStudentsResult] = await executeQuery('SELECT COUNT(*) AS count FROM students');
      const [totalRoomsResult] = await executeQuery('SELECT COUNT(*) AS count FROM rooms');
      const [bedStatsResult] = await executeQuery(`
        SELECT 
          COALESCE(SUM(capacity), 0) AS totalCapacity,
          COALESCE(SUM(occupied), 0) AS occupiedBeds,
          COALESCE(SUM(CASE WHEN status != 'Maintenance' THEN GREATEST(0, capacity - occupied) ELSE 0 END), 0) AS availableBeds
        FROM rooms
      `);
      const [activeAllocResult] = await executeQuery('SELECT COUNT(*) AS count FROM allocations WHERE status = "Active"');

      return res.json({
        totalStudents: totalStudentsResult ? totalStudentsResult.count : 0,
        totalRooms: totalRoomsResult ? totalRoomsResult.count : 0,
        occupiedBeds: bedStatsResult ? bedStatsResult.occupiedBeds : 0,
        availableBeds: bedStatsResult ? bedStatsResult.availableBeds : 0,
        totalCapacity: bedStatsResult ? bedStatsResult.totalCapacity : 0,
        activeAllocations: activeAllocResult ? activeAllocResult.count : 0
      });
    }

    // In-memory fallback
    let occupiedBeds = 0;
    let totalCapacity = 0;
    let availableBeds = 0;
    memoryDB.rooms.forEach(r => {
      totalCapacity += r.capacity;
      occupiedBeds += r.occupied;
      if (r.status !== 'Maintenance') {
        availableBeds += Math.max(0, r.capacity - r.occupied);
      }
    });

    res.json({
      totalStudents: memoryDB.students.length,
      totalRooms: memoryDB.rooms.length,
      occupiedBeds,
      availableBeds,
      totalCapacity,
      activeAllocations: memoryDB.allocations.filter(a => a.status === 'Active').length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fallback route for static files
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const filePath = path.join(__dirname, 'public', req.path);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🏨 College Hostel Management Portal running at:`);
  console.log(`   👉 http://localhost:${PORT}`);
  console.log(`====================================================`);
});
