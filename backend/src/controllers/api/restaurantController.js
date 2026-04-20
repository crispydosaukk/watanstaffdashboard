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

  try {
    const query = `
      SELECT
        rd.id,
        rd.user_id,
        rd.restaurant_name AS name,
        rd.restaurant_photo AS photo,
        rd.restaurant_address AS address,
        rd.instore,
        rd.kerbside,
        rd.food_type,
        rd.is_halal,
        rd.latitude,
        rd.longitude
        ${lat && lng ? `, ( 6371 * acos( cos( radians(${db.escape(lat)}) ) * cos( radians( rd.latitude ) ) * cos( radians( rd.longitude ) - radians(${db.escape(lng)}) ) + sin( radians(${db.escape(lat)}) ) * sin( radians( rd.latitude ) ) ) ) AS distance` : ""}
      FROM restaurant_details rd
      ${lat && lng ? "ORDER BY distance ASC" : "ORDER BY rd.id DESC"}
    `;

    const [results] = await db.query(query);
    const [timingsResults] = await db.query("SELECT restaurant_id, day, opening_time, closing_time, is_active FROM restaurant_timings");

    const timingsMap = {};
    timingsResults.forEach(t => {
      if (!timingsMap[t.restaurant_id]) timingsMap[t.restaurant_id] = [];
      timingsMap[t.restaurant_id].push({
        day: t.day,
        opening_time: t.opening_time,
        closing_time: t.closing_time,
        is_active: t.is_active
      });
    });

    const data = results.map(r => {
      return {
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
        distance: r.distance ? parseFloat(r.distance.toFixed(2)) : null,
        timings: timingsMap[r.id] || []
      };
    });

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
    let cuisineTypeArr = [];
    if (typeof r.cuisine_type === "string" && r.cuisine_type.length > 0) {
      cuisineTypeArr = r.cuisine_type.split(",").map(v => Number(v)).filter(v => !isNaN(v));
    } else if (typeof r.cuisine_type === "number") {
      cuisineTypeArr = [r.cuisine_type];
    }

    const [timingRows] = await db.query(
      "SELECT day, opening_time, closing_time, is_active FROM restaurant_timings WHERE restaurant_id = ?",
      [r.id]
    );

    const restaurant = {
      id: r.id,
      userid: r.user_id,
      restaurant_name: r.restaurant_name,
      restaurant_address: r.restaurant_address,
      restaurant_phonenumber: r.restaurant_phonenumber,
      restaurant_email: r.restaurant_email,
      restaurant_photo: buildPhotoUrl(req, r.restaurant_photo),
      instore: !!r.instore,
      kerbside: !!r.kerbside,
      latitude: r.latitude,
      longitude: r.longitude,
      food_type: foodTypeArr,
      cuisine_type: cuisineTypeArr,
      is_halal: r.is_halal ? 1 : 0,
      parking_info: r.parking_info || null,
      google_review_link: r.google_review_link || null,
      website_url: r.website_url || null,
      restaurant_facebook: r.restaurant_facebook || null,
      restaurant_instagram: r.restaurant_instagram || null,
      restaurant_twitter: r.restaurant_twitter || null,
      restaurant_tiktok: r.restaurant_tiktok || null,
      timings: timingRows || []
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
