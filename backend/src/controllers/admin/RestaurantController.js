// backend/controllers/admin/restaurantController.js
import jwt from "jsonwebtoken";
import {
  getRestaurantByUserId,
  upsertRestaurantForUser,
  getRestaurants,
} from "../../models/RestaurantModel.js";

export async function index(req, res) {
  try {
    const restaurants = await getRestaurants();
    return res.json({ success: true, data: restaurants });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

function extractUserId(req) {
  const header =
    (req.headers && (req.headers.authorization || req.headers.Authorization)) ||
    (req.cookies && (req.cookies.token || req.cookies.auth));
  if (!header) return null;

  const token = typeof header === "string" && header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : String(header).trim();

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "devsecret");
    return decoded?.id || decoded?.userId || decoded?.sub || null;
  } catch (err) {
    return null;
  }
}

export async function show(req, res) {
  const userId = extractUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized: invalid or missing token" });

  try {
    const restaurant = await getRestaurantByUserId(userId);
    return res.json({ success: true, data: restaurant || null });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function upsert(req, res) {
  const userId = extractUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

  let body = req.body || {};

  // When multipart is used, data will come inside req.body.payload
  if (body.payload) {
    try {
      body = JSON.parse(body.payload);
    } catch (err) {
      return res.status(400).json({ success: false, message: "Invalid payload JSON" });
    }
  }

  // Parse timings if still string
  if (body.timings && typeof body.timings === "string") {
    try { body.timings = JSON.parse(body.timings); } catch { }
  }

  // ✅ FIX: Only set photo if file was uploaded, otherwise preserve existing
  if (req.file && req.file.filename) {
    body.restaurant_photo = req.file.filename;
  } else {
    // Do NOT delete or overwrite existing photo
    delete body.restaurant_photo;
  }



  try {
    const updated = await upsertRestaurantForUser(userId, body);

    // ✅ CRITICAL: Return the full updated restaurant with photo field
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}


