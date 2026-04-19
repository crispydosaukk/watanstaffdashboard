import bcrypt from "bcryptjs";
import db from "../../config/db.js";
import { USER_TABLE } from "../../models/UserModel.js";

/** Simple email check */
function isEmail(v = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
}

/* ---------- GET /users  -> list users with role name ---------- */
export const index = async (_req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT u.id, u.role_id, u.name, u.email, u.created_at, r.title AS role_title
      FROM ${USER_TABLE} u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.deleted_at IS NULL
      ORDER BY u.id ASC  
    `);
    return res.json({ message: "OK", data: rows });
  } catch (e) {
    console.error("users.index:", e);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ---------- POST /users  { name, email, password?, role_id? } ---------- */
export const create = async (req, res) => {
  const { name, email, password = "", role_id, role_ids } = req.body || {};

  // If the frontend sends role_ids (array), pick the first (DB has single role_id)
  const roleId =
    Number.isInteger(role_id) && role_id > 0
      ? Number(role_id)
      : Array.isArray(role_ids) && role_ids.length
      ? Number(role_ids[0])
      : null;

  // Basic validation
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Name is required" });
  }
  if (!email || !isEmail(email)) {
    return res.status(400).json({ message: "Valid email is required" });
  }
  // role_id is optional if you allowed NULL in schema. If you want mandatory, uncomment:
  // if (!roleId) return res.status(400).json({ message: "role_id is required" });

  // Hash password if provided (else keep NULL)
  let hashed = null;
  if (String(password).trim()) {
    hashed = await bcrypt.hash(String(password), 10);
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // If roleId provided, ensure the role exists -> avoid FK error
    if (roleId) {
      const [r] = await conn.execute(`SELECT id FROM roles WHERE id=?`, [roleId]);
      if (r.length === 0) {
        await conn.rollback();
        return res.status(422).json({ message: "Invalid role_id (role not found)" });
      }
    }

    const [ins] = await conn.execute(
      `INSERT INTO ${USER_TABLE} (role_id, name, email, password, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [roleId || null, String(name).trim(), String(email).trim(), hashed]
    );

    await conn.commit();
    return res.status(201).json({ message: "User created", id: ins.insertId });
  } catch (e) {
    await conn.rollback();
    if (e?.code === "ER_DUP_ENTRY") {
      console.log(`[Validation] User creation failed: Email ${email} already exists.`);
      return res.status(409).json({ message: "Email already exists" });
    }
    console.error("users.create Error:", e.message || e);
    return res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
};

/* ---------- PUT /users/:id  { name?, email?, password?, role_id? } ---------- */
export const update = async (req, res) => {
  const userId = Number(req.params.id);
  if (!userId) return res.status(400).json({ message: "Invalid user id" });

  const { name, email, password, role_id } = req.body || {};
  const patches = [];
  const params = [];

  if (typeof name === "string" && name.trim()) {
    patches.push("name=?");
    params.push(name.trim());
  }
  if (typeof email === "string" && email.trim()) {
    if (!isEmail(email)) return res.status(400).json({ message: "Valid email is required" });
    patches.push("email=?");
    params.push(email.trim());
  }
  if (typeof role_id !== "undefined") {
    if (role_id === null) {
      patches.push("role_id=NULL");
    } else {
      const rid = Number(role_id);
      if (!Number.isInteger(rid) || rid <= 0) {
        return res.status(400).json({ message: "role_id must be a positive integer or null" });
      }
      // validate role exists
      const [r] = await db.execute(`SELECT id FROM roles WHERE id=?`, [rid]);
      if (r.length === 0) return res.status(422).json({ message: "Invalid role_id (role not found)" });
      patches.push("role_id=?");
      params.push(rid);
    }
  }
  if (typeof password === "string") {
    if (password.trim()) {
      const hashed = await bcrypt.hash(password.trim(), 10);
      patches.push("password=?");
      params.push(hashed);
    } else {
      // empty string => ignore (don’t overwrite)
    }
  }

  if (patches.length === 0) {
    return res.status(400).json({ message: "Nothing to update" });
  }

  try {
    const sql = `UPDATE ${USER_TABLE} SET ${patches.join(", ")}, updated_at=NOW() WHERE id=?`;
    const [r] = await db.execute(sql, [...params, userId]);
    if (r.affectedRows === 0) return res.status(404).json({ message: "User not found" });
    return res.json({ message: "User updated" });
  } catch (e) {
    console.error("users.update:", e);
    if (e?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email already exists" });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

/* ---------- DELETE /users/:id  (soft delete) ---------- */
export const remove = async (req, res) => {
  const userId = Number(req.params.id);
  if (!userId) return res.status(400).json({ message: "Invalid user id" });

  try {
    const [r] = await db.execute(
      `UPDATE ${USER_TABLE} SET deleted_at=NOW() WHERE id=? AND deleted_at IS NULL`,
      [userId]
    );
    if (r.affectedRows === 0) return res.status(404).json({ message: "User not found or already deleted" });
    return res.json({ message: "User deleted" });
  } catch (e) {
    console.error("users.remove:", e);
    return res.status(500).json({ message: "Server error" });
  }
};
