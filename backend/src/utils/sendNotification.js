// backend/src/utils/sendNotification.js
import admin from "../config/firebaseAdmin.js";
import db from "../config/db.js";

export async function sendNotification({
  userType,
  userId,
  title,
  body,
  data = {}
}) {
  try {
    await db.query(
      `INSERT INTO notifications
       (user_type, user_id, title, body, order_number, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userType,
        userId,
        title,
        body,
        data.order_number || null,
        data.status || null
      ]
    );
  } catch (err) {
    console.error("Notification DB insert failed:", err.message);
  }

  const [rows] = await db.query(
    `SELECT fcm_token
     FROM fcm_tokens
     WHERE user_type = ? AND user_id = ?`,
    [userType, userId]
  );

  if (!rows.length) return;

  const tokens = rows.map(r => r.fcm_token);

  if (!admin) {
    console.warn("Firebase not initialized. Skipping push notification.");
    return;
  }

  await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data,
  });
}
