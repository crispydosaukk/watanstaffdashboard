import db from "../../config/db.js";

function buildPhotoUrl(req, raw) {
  if (!raw) {
    return `${req.protocol}://${req.get("host")}/uploads/default_restaurant.png`;
  }

  let val = String(raw).trim();

  if (val.startsWith("http://") || val.startsWith("https://")) {
    return val;
  }

  val = val.replace(/^\.?\/?uploads\//, "");

  return `${req.protocol}://${req.get("host")}/uploads/${val}`;
}

export const getRestaurants = async (req, res) => {
  const { lat, lng } = req.query;

  let query;
  let queryParams = [];

  if (lat && lng) {
    // Haversine formula to calculate distance and sort
    query = `
      SELECT
        id,
        user_id,
        restaurant_name AS name,
        restaurant_photo AS photo,
        restaurant_address AS address,
        instore,
        kerbside,
        food_type,
        is_halal,
        latitude,
        longitude,
        ( 6371 * acos( cos( radians(?) ) * cos( radians( latitude ) ) * cos( radians( longitude ) - radians(?) ) + sin( radians(?) ) * sin( radians( latitude ) ) ) ) AS distance
      FROM restaurant_details
      ORDER BY distance ASC
    `;
    queryParams = [lat, lng, lat];
  } else {
    query = `
      SELECT
        id,
        user_id,
        restaurant_name AS name,
        restaurant_photo AS photo,
        restaurant_address AS address,
        instore,
        kerbside,
        food_type,
        is_halal,
        latitude,
        longitude
      FROM restaurant_details
      ORDER BY id DESC
    `;
  }

  try {
    const [results] = await db.query(query, queryParams);

    const data = results.map(r => ({
      id: r.id,
      userid: r.user_id,
      name: r.name,
      address: r.address,
      photo: buildPhotoUrl(req, r.photo),
      instore: !!r.instore,
      kerbside: !!r.kerbside,
      food_type: r.food_type,
      is_halal: !!r.is_halal,
      latitude: r.latitude,
      longitude: r.longitude,
      distance: r.distance ? parseFloat(r.distance.toFixed(2)) : null
    }));

    return res.json({ status: 1, data });
  } catch (err) {
    console.error("DB Error:", err);
    return res.status(500).json({ status: 0, message: "Database error", data: [] });
  }
};

export const getRestaurantById = async (req, res) => {
  const { id } = req.params;

  const query = `SELECT * FROM restaurant_details WHERE user_id = ?`;

  try {
    const [results] = await db.query(query, [id]);

    if (!results.length) {
      return res.json({ status: 0, message: "Restaurant not found", data: [] });
    }

    const r = results[0];

    let foodTypeArr = [];
    if (typeof r.food_type === "string" && r.food_type.length > 0) {
      foodTypeArr = r.food_type.split(",").map(v => Number(v)).filter(v => !isNaN(v));
    } else if (typeof r.food_type === "number") {
      foodTypeArr = [r.food_type];
    }
    const restaurant = {
      id: r.id,
      userid: r.user_id,
      restaurant_name: r.restaurant_name,
      restaurant_address: r.restaurant_address,
      restaurant_phonenumber: r.restaurant_phonenumber,
      restaurant_photo: buildPhotoUrl(req, r.restaurant_photo),
      instore: !!r.instore,
      kerbside: !!r.kerbside,
      latitude: r.latitude,
      longitude: r.longitude,
      food_type: foodTypeArr,
      is_halal: !!r.is_halal,
    };

    return res.json({ status: 1, data: [restaurant] });
  } catch (err) {
    console.error("DB Error:", err);
    return res.status(500).json({ status: 0, message: "Database error", data: [] });
  }
};

export const getRestaurantTimings = async (req, res) => {
  const { restaurant_id } = req.params;

  const query = `
    SELECT day, opening_time, closing_time, is_active
    FROM restaurant_timings
    WHERE restaurant_id = ?
    ORDER BY FIELD(day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
  `;

  try {
    const [results] = await db.query(query, [restaurant_id]);

    if (!results.length) {
      return res.json({ status: 0, message: "No timings found", data: [] });
    }

    return res.json({ status: 1, data: results });
  } catch (err) {
    console.error("DB Error:", err);
    return res.status(500).json({ status: 0, message: "Database error", data: [] });
  }
};
