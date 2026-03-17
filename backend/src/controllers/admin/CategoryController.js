import path from "path";
import fs from "fs";
import pool from "../../config/db.js";

// ===========================================
// GET ALL CATEGORIES (SORTED BY sort_order)
// ===========================================
export const getCategories = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT 
     id,
     category_name AS name,
     category_image AS image,
     IFNULL(status, 1) AS status,
     IFNULL(sort_order, 9999) AS sort_order
   FROM categories 
   WHERE user_id = ?
   ORDER BY sort_order ASC, id ASC`,
      [userId]
    );


    res.json(rows);
  } catch (err) {
    console.error("getCategories error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===========================================
// ADD CATEGORY
// ===========================================
export const addCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;
    const image = req.file ? req.file.filename : (req.body.existingImage || null);

    if (!name || !image)
      return res.status(400).json({ message: "Name and Image required" });

    // Check duplicate
    const [[exists]] = await pool.query(
      "SELECT id FROM categories WHERE user_id = ? AND LOWER(category_name) = LOWER(?)",
      [userId, name]
    );
    if (exists)
      return res.status(409).json({ message: "Category name already exists" });

    // Insert with default sort_order = last
    const [[maxOrder]] = await pool.query(
      "SELECT IFNULL(MAX(sort_order), 0) AS maxOrder FROM categories WHERE user_id = ?",
      [userId]
    );

    const newOrder = maxOrder.maxOrder + 1;

    const [result] = await pool.query(
      `INSERT INTO categories 
         (category_name, category_image, user_id, status, sort_order) 
       VALUES (?, ?, ?, 1, ?)`,
      [name, image, userId, newOrder]
    );

    res.json({
      id: result.insertId,
      name,
      image,
      status: 1,
      sort_order: newOrder,
    });
  } catch (err) {
    console.error("addCategory error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===========================================
// REMOVE CATEGORY (DELETE + IMAGE DELETE)
// ===========================================
export const removeCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [[cat]] = await pool.query(
      "SELECT category_image FROM categories WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (!cat) return res.status(404).json({ message: "Not found" });

    // Delete image
    if (cat.category_image) {
      const img = path.join("public/uploads", cat.category_image);
      if (fs.existsSync(img)) fs.unlinkSync(img);
    }

    await pool.query("DELETE FROM categories WHERE id = ? AND user_id = ?", [
      id,
      userId,
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("removeCategory error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===========================================
// UPDATE CATEGORY (name, image OR status)
// ===========================================
export const updateCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, status } = req.body;
    const newImage = req.file ? req.file.filename : null;

    const [[existing]] = await pool.query(
      "SELECT * FROM categories WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    if (!existing) return res.status(404).json({ message: "Not found" });

    const fields = [];
    const params = [];

    if (name) {
      fields.push("category_name = ?");
      params.push(name);
    }

    if (newImage) {
      // Delete old image
      if (existing.category_image) {
        const oldPath = path.join("public/uploads", existing.category_image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      fields.push("category_image = ?");
      params.push(newImage);
    }

    if (typeof status !== "undefined") {
      fields.push("status = ?");
      params.push(status);
    }

    if (!fields.length)
      return res.status(400).json({ message: "Nothing to update" });

    params.push(id, userId);

    const sql = `UPDATE categories SET ${fields.join(
      ", "
    )} WHERE id = ? AND user_id = ?`;
    await pool.query(sql, params);

    const [[updated]] = await pool.query(
      "SELECT id, category_name AS name, category_image AS image, status, sort_order FROM categories WHERE id = ? AND user_id = ?",
      [id, userId]
    );

    res.json(updated);
  } catch (err) {
    console.error("updateCategory error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===========================================
// DRAG & DROP REORDER
// ===========================================
export const reorderCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    const { order } = req.body; // array of { id, sort_order }

    if (!Array.isArray(order))
      return res.status(400).json({ message: "Invalid order format" });

    const updates = order.map((item) =>
      pool.query(
        "UPDATE categories SET sort_order = ? WHERE id = ? AND user_id = ?",
        [item.sort_order, item.id, userId]
      )
    );

    await Promise.all(updates);

    res.json({ success: true, message: "Order updated successfully" });
  } catch (err) {
    console.error("reorderCategories error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===========================================
// SEARCH GLOBAL CATEGORIES
// ===========================================
export const searchGlobalCategories = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    // Select distinct category names (unique) from the entire database (global)
    // We use ANY_VALUE or MAX to pick one image/status for the unique name
    const [rows] = await pool.query(
      `SELECT 
         category_name AS name,
         MAX(category_image) AS image,
         1 AS status 
       FROM categories 
       WHERE category_name LIKE ?
       GROUP BY category_name
       LIMIT 20`,
      [`%${q}%`]
    );

    res.json(rows);
  } catch (err) {
    console.error("searchGlobalCategories error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===========================================
// ADMIN SEARCH GLOBAL CATEGORIES (FOR SUPER ADMIN INTEGRATE)
// ===========================================
export const adminSearchGlobalCategories = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const [rows] = await pool.query(
      `SELECT 
         c.id,
         c.category_name AS name,
         c.category_image AS image,
         c.user_id,
         rd.restaurant_name
       FROM categories c
       LEFT JOIN restaurant_details rd ON c.user_id = rd.user_id
       WHERE c.category_name LIKE ?
       LIMIT 50`,
      [`%${q}%`]
    );

    res.json(rows);
  } catch (err) {
    console.error("adminSearchGlobalCategories error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===========================================
// INTEGRATE CATEGORY (CLONE FROM ONE RESTAURANT TO ANOTHER)
// ===========================================
export const integrateCategory = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { sourceCategoryId, targetUserId } = req.body;

    if (!sourceCategoryId || !targetUserId)
      return res.status(400).json({ message: "Missing sourceCategoryId or targetUserId" });

    await conn.beginTransaction();

    // 1. Get source category
    const [[sourceCat]] = await conn.query(
      "SELECT * FROM categories WHERE id = ?",
      [sourceCategoryId]
    );

    if (!sourceCat) {
      await conn.rollback();
      return res.status(404).json({ message: "Source category not found" });
    }

    // 2. Check if the target restaurant already has this category name
    const [[existingCat]] = await conn.query(
      "SELECT id FROM categories WHERE user_id = ? AND LOWER(category_name) = LOWER(?)",
      [targetUserId, sourceCat.category_name]
    );

    if (existingCat) {
      await conn.rollback();
      return res.status(409).json({ message: "This restaurant already has this category" });
    }

    // 3. Create the category for the target restaurant
    const [[maxOrderCat]] = await conn.query(
      "SELECT IFNULL(MAX(sort_order), 0) AS maxOrder FROM categories WHERE user_id = ?",
      [targetUserId]
    );
    const newCatOrder = maxOrderCat.maxOrder + 1;

    const [catResult] = await conn.query(
      "INSERT INTO categories (user_id, category_name, category_image, status, sort_order) VALUES (?, ?, ?, ?, ?)",
      [targetUserId, sourceCat.category_name, sourceCat.category_image, sourceCat.status, newCatOrder]
    );
    const newCatId = catResult.insertId;

    // 4. Get all products from the source category
    const [sourceProducts] = await conn.query(
      "SELECT * FROM products WHERE cat_id = ?",
      [sourceCategoryId]
    );

    if (sourceProducts.length > 0) {
      // 5. Get max sort order for products in target
      const [[maxOrderProd]] = await conn.query(
        "SELECT IFNULL(MAX(sort_order), 0) AS maxOrder FROM products WHERE user_id = ?",
        [targetUserId]
      );
      let nextProdOrder = maxOrderProd.maxOrder + 1;

      for (const prod of sourceProducts) {
        await conn.query(
          `INSERT INTO products 
           (user_id, cat_id, product_name, product_image, product_desc, contains,
            product_price, product_discount_price, status, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            targetUserId,
            newCatId,
            prod.product_name,
            prod.product_image,
            prod.product_desc,
            prod.contains,
            prod.product_price,
            prod.product_discount_price,
            prod.status,
            nextProdOrder++
          ]
        );
      }
    }

    await conn.commit();
    res.json({ message: "Category and products integrated successfully", newCatId });
  } catch (err) {
    await conn.rollback();
    console.error("integrateCategory error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
};
