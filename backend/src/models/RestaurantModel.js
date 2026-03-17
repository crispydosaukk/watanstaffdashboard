import pool from "../config/db.js";

/**
 * Get all restaurants
 */
export async function getRestaurants() {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT rd.*, u.name as owner_name, u.email as owner_email 
       FROM restaurant_details rd 
       JOIN users u ON rd.user_id = u.id 
       ORDER BY rd.created_at DESC`
    );
    return rows;
  } finally {
    conn.release();
  }
}

/**
 * Get restaurant (and timings) by user id
 * returns null if none
 */
export async function getRestaurantById(restaurantId) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT rd.* FROM restaurant_details rd WHERE rd.id = ? LIMIT 1`,
      [restaurantId]
    );

    if (!rows.length) return null;
    const restaurant = rows[0];

    const [timings] = await conn.query(
      `SELECT id, day, opening_time, closing_time, is_active
       FROM restaurant_timings
       WHERE restaurant_id = ?
       ORDER BY FIELD(day,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')`,
      [restaurant.id]
    );

    restaurant.timings = Array.isArray(timings) ? timings : [];
    return restaurant;
  } finally {
    conn.release();
  }
}

/**
 * Wrapper to get restaurant by user_id
 */
export async function getRestaurantByUserId(userId) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT id FROM restaurant_details WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    if (!rows.length) return null;
    return await getRestaurantById(rows[0].id);
  } finally {
    conn.release();
  }
}

/**
 * Insert a restaurant row and return inserted id
 */
async function insertRestaurant(conn, userId, payload) {
  try {
    const foodTypeStr = Array.isArray(payload.food_type) ? payload.food_type.join(",") : payload.food_type ?? null;
    const [res] = await conn.query(
      `INSERT INTO restaurant_details
        (user_id, restaurant_name, restaurant_address, restaurant_phonenumber,
        restaurant_email, restaurant_facebook, restaurant_twitter, restaurant_instagram,
        restaurant_linkedin, google_review_link, website_url, delivery_partner_1_url, delivery_partner_2_url, delivery_partner_3_url, delivery_partner_4_url, parking_info, instore, kerbside, latitude, longitude, restaurant_photo,
        stripe_secret_key, stripe_publishable_key, food_type, is_halal, cuisine_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        payload.restaurant_name ?? null,
        payload.restaurant_address ?? null,
        payload.restaurant_phonenumber ?? null,
        payload.restaurant_email ?? null,
        payload.restaurant_facebook ?? null,
        payload.restaurant_twitter ?? null,
        payload.restaurant_instagram ?? null,
        payload.restaurant_linkedin ?? null,
        payload.google_review_link ?? null,
        payload.website_url ?? null,
        payload.delivery_partner_1_url ?? null,
        payload.delivery_partner_2_url ?? null,
        payload.delivery_partner_3_url ?? null,
        payload.delivery_partner_4_url ?? null,
        payload.parking_info ?? null,
        payload.instore ?? 0,
        payload.kerbside ?? 0,
        payload.latitude ?? null,
        payload.longitude ?? null,
        payload.restaurant_photo ?? null,
        payload.stripe_secret_key ?? null,
        payload.stripe_publishable_key ?? null,
        foodTypeStr,
        payload.is_halal ?? 0,
        Array.isArray(payload.cuisine_type) ? payload.cuisine_type.join(",") : payload.cuisine_type ?? null,
      ]
    );
    return res.insertId;
  } catch (err) {
    throw err;
  }
}

async function updateRestaurant(conn, restaurantId, payload) {
  try {
    const foodTypeStr = Array.isArray(payload.food_type) ? payload.food_type.join(",") : payload.food_type ?? null;
    const fieldsMap = {
      restaurant_name: payload.restaurant_name ?? null,
      restaurant_address: payload.restaurant_address ?? null,
      restaurant_phonenumber: payload.restaurant_phonenumber ?? null,
      restaurant_email: payload.restaurant_email ?? null,
      restaurant_facebook: payload.restaurant_facebook ?? null,
      restaurant_twitter: payload.restaurant_twitter ?? null,
      restaurant_instagram: payload.restaurant_instagram ?? null,
      restaurant_linkedin: payload.restaurant_linkedin ?? null,
      google_review_link: payload.google_review_link ?? null,
      website_url: payload.website_url ?? null,
      delivery_partner_1_url: payload.delivery_partner_1_url ?? null,
      delivery_partner_2_url: payload.delivery_partner_2_url ?? null,
      delivery_partner_3_url: payload.delivery_partner_3_url ?? null,
      delivery_partner_4_url: payload.delivery_partner_4_url ?? null,
      parking_info: payload.parking_info ?? null,
      instore: payload.instore ?? 0,
      kerbside: payload.kerbside ?? 0,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      stripe_secret_key: payload.stripe_secret_key ?? null,
      stripe_publishable_key: payload.stripe_publishable_key ?? null,
      food_type: foodTypeStr,
      is_halal: payload.is_halal ?? 0,
      cuisine_type: Array.isArray(payload.cuisine_type) ? payload.cuisine_type.join(",") : payload.cuisine_type ?? null,
    };

    // Only update photo if explicitly provided
    if (Object.prototype.hasOwnProperty.call(payload, "restaurant_photo")) {
      fieldsMap.restaurant_photo = payload.restaurant_photo ?? null;
    }

    const fields = Object.keys(fieldsMap);
    const values = Object.values(fieldsMap);

    const setClause = fields.map((f) => `${f} = ?`).join(", ");

    const [res] = await conn.query(
      `UPDATE restaurant_details SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, restaurantId]
    );
  } catch (err) {
    throw err;
  }
}


/**
 * Synchronize timings for a restaurant:
 * - payloadTimings: [{ day, opening_time, closing_time, is_active }, ...]
 *
 * Behavior:
 * - If a day is present in payloadTimings -> upsert (insert or update) with provided is_active and times.
 * - If a day is NOT present in payloadTimings but exists in DB -> delete that DB row.
 */
async function syncTimings(conn, restaurantId, payloadTimings = []) {
  const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  function normalizeTimeForSql(v) {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    if (s === "") return null;
    if (/^\d{1,2}:\d{2}$/.test(s)) return s.length === 5 ? s + ":00" : s;
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(s)) return s;
    console.warn("syncTimings: invalid time format, treating as null:", v);
    return null;
  }

  // Build a map day -> { opening_time, closing_time, is_active }
  const byDay = {};
  for (const t of payloadTimings) {
    if (!t || !t.day) continue;
    const raw = String(t.day).trim();
    const day = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    if (!validDays.includes(day)) {
      continue;
    }

    const opening_time_raw = normalizeTimeForSql(t.opening_time);
    const closing_time_raw = normalizeTimeForSql(t.closing_time);

    // If times are null, we will store "00:00:00" as placeholder (or keep null if you prefer).
    // Here we store "00:00:00" to avoid timezone/time issues; is_active controls if day is on/off.
    const opening_time = opening_time_raw === null ? "00:00:00" : opening_time_raw;
    const closing_time = closing_time_raw === null ? "00:00:00" : closing_time_raw;

    const is_active = (typeof t.is_active === "boolean") ? (t.is_active ? 1 : 0)
      : (t.is_active === 1 || t.is_active === "1" || t.is_active === "true") ? 1 : 0;

    byDay[day] = { opening_time, closing_time, is_active };
  }

  try {
    const [existing] = await conn.query(
      `SELECT id, day FROM restaurant_timings WHERE restaurant_id = ? `,
      [restaurantId]
    );

    const existingByDay = {};
    for (const r of existing) existingByDay[r.day] = r.id;

    // Delete DB rows for days absent in payload
    const daysToDelete = existing.map((r) => r.day).filter((d) => !(d in byDay));
    if (daysToDelete.length) {
      const placeholders = daysToDelete.map(() => "?").join(",");
      await conn.query(
        `DELETE FROM restaurant_timings WHERE restaurant_id = ? AND day IN(${placeholders})`,
        [restaurantId, ...daysToDelete]
      );
    }

    // Upsert all supplied days
    for (const day of Object.keys(byDay)) {
      const t = byDay[day];
      if (existingByDay[day]) {
        await conn.query(
          `UPDATE restaurant_timings
           SET opening_time = ?, closing_time = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? `,
          [t.opening_time, t.closing_time, t.is_active, existingByDay[day]]
        );
      } else {
        await conn.query(
          `INSERT INTO restaurant_timings(restaurant_id, day, opening_time, closing_time, is_active)
           VALUES(?, ?, ?, ?, ?)`,
          [restaurantId, day, t.opening_time, t.closing_time, t.is_active]
        );
      }
    }
  } catch (err) {
    throw err;
  }
}

/**
 * Upsert (create or update) restaurant and timings for a user
 * Returns the restaurant object (with timings) after changes
 */
export async function upsertRestaurantForUser(userId, payload) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT id FROM restaurant_details WHERE user_id = ? LIMIT 1`,
      [userId]
    );

    let restaurantId;
    if (rows.length) {
      restaurantId = rows[0].id;
      await updateRestaurant(conn, restaurantId, payload);
    } else {
      restaurantId = await insertRestaurant(conn, userId, payload);
    }

    if (Array.isArray(payload.timings)) {
      await syncTimings(conn, restaurantId, payload.timings);
    }

    await conn.commit();

    // Fetch the fresh data by the EXACT ID we just updated/inserted
    return await getRestaurantById(restaurantId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
