import pool from "../config/db.js";

/**
 * Ensure the staff_attendance table exists.
 * Called once at server startup.
 */
export async function createAttendanceTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS staff_attendance (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      staff_id      INT          NOT NULL,
      restaurant_id INT          NOT NULL,
      clock_in      DATETIME     NOT NULL,
      clock_out     DATETIME     NULL,
      date          DATE         NOT NULL,
      total_minutes INT          NULL,
      notes         TEXT         NULL,
      created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_staff_date (staff_id, date),
      INDEX idx_restaurant (restaurant_id)
    )
  `);
}

/** Get the currently active (no clock_out) record for a staff member */
export async function getActiveSession(staffId) {
  const [rows] = await pool.query(
    `SELECT * FROM staff_attendance
     WHERE staff_id = ? AND clock_out IS NULL
     ORDER BY clock_in DESC LIMIT 1`,
    [staffId]
  );
  return rows[0] || null;
}

/** 
 * Automatically close any sessions that were forgotten (no clock_out) 
 * for previous days. Sets clock_out to 23:59:59 of that session's date.
 */
export async function autoCloseStaleSessions(staffId) {
  await pool.query(
    `UPDATE staff_attendance
     SET clock_out = CONCAT(date, ' 23:59:59'),
         total_minutes = TIMESTAMPDIFF(MINUTE, clock_in, CONCAT(date, ' 23:59:59')),
         updated_at = NOW(),
         notes = COALESCE(notes, 'Auto-logged out at midnight')
     WHERE staff_id = ? AND clock_out IS NULL AND date < CURDATE()`,
    [staffId]
  );
}

/** Check if staff member already has a session (active or closed) for today */
export async function hasSessionForToday(staffId) {
  const [rows] = await pool.query(
    `SELECT id FROM staff_attendance WHERE staff_id = ? AND date = CURDATE() LIMIT 1`,
    [staffId]
  );
  return rows.length > 0;
}

/** Clock in – create a new session */
export async function clockIn(staffId, restaurantId) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const [res] = await pool.query(
    `INSERT INTO staff_attendance (staff_id, restaurant_id, clock_in, date)
     VALUES (?, ?, NOW(), ?)`,
    [staffId, restaurantId, date]
  );
  return res.insertId;
}

/** Clock out – close the active session and compute total_minutes */
export async function clockOut(sessionId) {
  await pool.query(
    `UPDATE staff_attendance
     SET clock_out = NOW(),
         total_minutes = TIMESTAMPDIFF(MINUTE, clock_in, NOW()),
         updated_at = NOW()
     WHERE id = ?`,
    [sessionId]
  );
  const [rows] = await pool.query(`SELECT * FROM staff_attendance WHERE id = ?`, [sessionId]);
  return rows[0] || null;
}

/** Update attendance record (admin override) */
export async function updateAttendance(id, data) {
  const { clock_in, clock_out, notes } = data;
  
  // Calculate total_minutes if both times are present
  let total_minutes = null;
  if (clock_in && clock_out) {
    const start = new Date(clock_in);
    const end = new Date(clock_out);
    total_minutes = Math.floor((end - start) / 60000);
  }

  await pool.query(
    `UPDATE staff_attendance
     SET clock_in = ?,
         clock_out = ?,
         total_minutes = ?,
         notes = ?,
         updated_at = NOW()
     WHERE id = ?`,
    [clock_in, clock_out, total_minutes, notes, id]
  );
  
  const [rows] = await pool.query(`SELECT * FROM staff_attendance WHERE id = ?`, [id]);
  return rows[0] || null;
}

/** Get a single completed session by id */
export async function getSessionById(id) {
  const [rows] = await pool.query(`SELECT * FROM staff_attendance WHERE id = ?`, [id]);
  return rows[0] || null;
}

/**
 * Get attendance records for a staff member within a date range.
 * Returns one row per day with clock_in, clock_out, total_minutes.
 */
export async function getAttendanceByStaff(staffId, fromDate, toDate) {
  const [rows] = await pool.query(
    `SELECT * FROM staff_attendance
     WHERE staff_id = ?
       AND date BETWEEN ? AND ?
     ORDER BY date ASC, clock_in ASC`,
    [staffId, fromDate, toDate]
  );
  return rows;
}

/**
 * Get yesterday's completed sessions for a staff member.
 */
export async function getYesterdayLog(staffId) {
  const [rows] = await pool.query(
    `SELECT * FROM staff_attendance
     WHERE staff_id = ?
       AND date = DATE_SUB(CURDATE(), INTERVAL 1 DAY)
       AND clock_out IS NOT NULL
     ORDER BY clock_in ASC`,
    [staffId]
  );
  return rows;
}

/**
 * Get today's sessions for a staff member.
 */
export async function getTodayLog(staffId) {
  const [rows] = await pool.query(
    `SELECT * FROM staff_attendance
     WHERE staff_id = ?
       AND date = CURDATE()
     ORDER BY clock_in ASC`,
    [staffId]
  );
  return rows;
}
