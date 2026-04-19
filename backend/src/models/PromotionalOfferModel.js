import pool from "../config/db.js";

export async function createOffer(payload, targets) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [offerRes] = await conn.query(
      "INSERT INTO promotional_offers (user_id, title, description, banner_image, status) VALUES (?, ?, ?, ?, ?)",
      [payload.user_id, payload.title, payload.description, payload.banner_image, payload.status || 'active']
    );
    const offerId = offerRes.insertId;

    if (targets && targets.length > 0) {
      const targetValues = targets.map(t => [offerId, t.type, t.id]);
      await conn.query(
        "INSERT INTO offer_targets (offer_id, target_type, target_id) VALUES ?",
        [targetValues]
      );
    }

    await conn.commit();
    return offerId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function updateOffer(id, user_id, payload, targets) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Verify ownership if user_id is provided
    if (user_id) {
      const [rows] = await conn.query("SELECT id FROM promotional_offers WHERE id = ? AND user_id = ?", [id, user_id]);
      if (rows.length === 0) throw new Error("Unauthorized to update this offer");
    }

    await conn.query(
      "UPDATE promotional_offers SET title = ?, description = ?, banner_image = COALESCE(?, banner_image), status = ? WHERE id = ?",
      [payload.title, payload.description, payload.banner_image, payload.status, id]
    );

    if (targets) {
      // Refresh targets: delete old and insert new
      await conn.query("DELETE FROM offer_targets WHERE offer_id = ?", [id]);
      if (targets.length > 0) {
        const targetValues = targets.map(t => [id, t.type, t.id]);
        await conn.query(
          "INSERT INTO offer_targets (offer_id, target_type, target_id) VALUES ?",
          [targetValues]
        );
      }
    }

    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getAllOffers(userId = null) {
  const conn = await pool.getConnection();
  try {
    let query = "SELECT * FROM promotional_offers";
    let params = [];

    if (userId) {
      query += " WHERE user_id = ?";
      params.push(userId);
    }

    query += " ORDER BY created_at DESC";

    const [offers] = await conn.query(query, params);

    // For each offer, fetch its targets
    for (let offer of offers) {
      const [targets] = await conn.query(
        "SELECT target_type as type, target_id as id FROM offer_targets WHERE offer_id = ?",
        [offer.id]
      );
      offer.targets = targets;
    }

    return offers;
  } finally {
    conn.release();
  }
}

export async function updateOfferStatus(id, user_id, status) {
  const conn = await pool.getConnection();
  try {
    const [res] = await conn.query("UPDATE promotional_offers SET status = ? WHERE id = ? AND user_id = ?", [status, id, user_id]);
    return res.affectedRows > 0;
  } finally {
    conn.release();
  }
}

export async function deleteOffer(id, user_id) {
  const conn = await pool.getConnection();
  try {
    // Targets will be deleted automatically due to ON DELETE CASCADE
    const [res] = await conn.query("DELETE FROM promotional_offers WHERE id = ? AND user_id = ?", [id, user_id]);
    return res.affectedRows > 0;
  } finally {
    conn.release();
  }
}
