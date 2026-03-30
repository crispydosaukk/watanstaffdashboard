import pool from "../../config/db.js";
import { sendNotification } from "../../utils/sendNotification.js";

export const getTableReservations = async (req, res) => {
  try {
    const userId = req.user.id;
    const roleId = req.user.role_id;
    const roleName = req.user.role || req.user.role_title || null;
    const isSuperAdmin = (Number(roleId) === 6) || (typeof roleName === "string" && roleName.toLowerCase() === "super admin");

    let query = `SELECT * FROM table_reservations ORDER BY created_at DESC`;
    let params = [];

    if (!isSuperAdmin) {
      query = `SELECT * FROM table_reservations WHERE user_id = ? ORDER BY created_at DESC`;
      params = [userId];
    }

    const [rows] = await pool.query(query, params);
    res.json({ status: 1, data: rows });
  } catch (error) {
    console.error("Error in getTableReservations:", error);
    res.status(500).json({ status: 0, message: "Internal server error." });
  }
};

export const updateReservationStatus = async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!status) {
    return res.status(400).json({ status: 0, message: "Status is required." });
  }

  try {
    // 1️⃣ Get Customer Info for Notification
    const [[resData]] = await pool.query(
      "SELECT customer_id, customer_name, table_number FROM table_reservations WHERE id = ?",
      [id]
    );

    // 2️⃣ Update Status
    await pool.query(
      `UPDATE table_reservations SET status = ?, notes = ? WHERE id = ?`,
      [status, notes || null, id]
    );

    // 3️⃣ Notify Customer
    if (resData?.customer_id) {
        const statusMap = {
          confirmed: { title: "✅ Table Confirmed", body: `Your reservation for table ${resData.table_number || "request"} is confirmed!` },
          seated:    { title: "🍴 You're Seated",  body: "Welcome to ZingBite! Enjoy your meal." },
          completed: { title: "✨ Thank You",      body: "We hope you enjoyed your visit. See you again soon!" },
          cancelled: { title: "❌ Table Cancelled", body: "Your reservation has been cancelled." },
          no_show:   { title: "⚠️ No Show",        body: "We missed you today!" }
        };

        if (statusMap[status]) {
          const notif = statusMap[status];
          try {
            await sendNotification({
              userType: "customer",
              userId: resData.customer_id,
              title: notif.title,
              body: notif.body,
              data: { type: "RESERVATION_UPDATE", res_id: String(id), status }
            });
          } catch (e) {
            console.error("Customer notification failed:", e.message);
          }
        }
    }

    res.json({ status: 1, message: "Reservation status updated." });
  } catch (error) {
    console.error("Error in updateReservationStatus:", error);
    res.status(500).json({ status: 0, message: "Internal server error." });
  }
};

export const deleteReservation = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM table_reservations WHERE id = ?", [id]);
    res.json({ status: 1, message: "Reservation deleted successfully." });
  } catch (error) {
    console.error("Error in deleteReservation:", error);
    res.status(500).json({ status: 0, message: "Internal server error." });
  }
};
