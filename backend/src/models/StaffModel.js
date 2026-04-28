import pool from "../config/db.js";

export async function listStaff(restaurantId) {
  const [rows] = await pool.query(
    "SELECT * FROM staff_members WHERE restaurant_id = ? AND deleted_at IS NULL ORDER BY created_at DESC",
    [restaurantId]
  );
  return rows;
}

export async function listAllStaff() {
  const [rows] = await pool.query(
    `SELECT sm.*, COALESCE(rd.restaurant_name, rd.company_name) as restaurant_name
     FROM staff_members sm
     LEFT JOIN restaurant_details rd ON sm.restaurant_id = rd.id
     WHERE sm.deleted_at IS NULL
     ORDER BY rd.restaurant_name ASC, sm.full_name ASC`
  );
  return rows;
}

export async function getStaffById(id) {
  const [rows] = await pool.query(
    "SELECT * FROM staff_members WHERE id = ? AND deleted_at IS NULL LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

export async function findStaffByEmail(email) {
  const [rows] = await pool.query(
    `SELECT sm.*, COALESCE(rd.restaurant_name, rd.company_name) as restaurant_name 
     FROM staff_members sm 
     LEFT JOIN restaurant_details rd ON sm.restaurant_id = rd.id 
     WHERE sm.email = ? AND sm.deleted_at IS NULL LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

export async function createStaff(data) {
  const random = Math.floor(1000 + Math.random() * 9000);
  const employeeId = `WS-${random}`;

  const [res] = await pool.query(
    `INSERT INTO staff_members (
      restaurant_id, employee_id, full_name, email, password, phone_number, designation, gender, dob, profile_image
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.restaurant_id,
      employeeId,
      data.full_name,
      data.email,
      data.password,
      data.phone_number || null,
      data.designation || null,
      data.gender || null,
      data.dob || null,
      data.profile_image || null
    ]
  );
  return res.insertId;
}

export async function updateStaff(id, data) {
  const fields = [];
  const values = [];

  const updateable = [
    'full_name', 'email', 'password', 'phone_number', 'designation', 'gender', 'dob', 'profile_image', 'is_active'
  ];

  updateable.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
  });

  if (fields.length === 0) return 0;

  values.push(id);
  const [res] = await pool.query(
    `UPDATE staff_members SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    values
  );
  return res.affectedRows;
}

export async function deleteStaff(id) {
  const [res] = await pool.query(
    "UPDATE staff_members SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?",
    [id]
  );
  return res.affectedRows;
}
