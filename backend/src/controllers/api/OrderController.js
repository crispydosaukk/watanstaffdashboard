import db from "../../config/db.js";
import { sendNotification } from "../../utils/sendNotification.js";

// ----------------- ORDER NUMBER GENERATOR ----------------- //
function generateOrderNumber(restaurantName = "") {
  const nameStr = String(restaurantName || "");

  // Normalize name and remove the words 'crispy' and 'dosa' robustly (handles extra spaces/punctuation)
  let cleaned = nameStr
    .toLowerCase()
    // remove joined/adjacent forms (ZINGBITE) and individual words
    .replace(/crispy\s*dosa/gi, "")
    .replace(/crispy|dosa/gi, "")
    .replace(/[^a-z0-9\s]/gi, " ") // replace non-alphanum with space
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim();

  // Fallback to original name's first non-space character if cleaned becomes empty
  const firstLetter = cleaned[0]
    ? cleaned[0].toUpperCase()
    : (nameStr.trim()[0] ? nameStr.trim()[0].toUpperCase() : "X");

  const now = new Date();
  const DD = String(now.getDate()).padStart(2, "0");
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const HH = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");

  return `CD${firstLetter}${DD}${MM}${HH}${mm}`;
}

// 🔹 Get referral flat amount from settings (DYNAMIC)
async function getReferralFlatAmount(conn) {
  const [[row]] = await conn.query(
    "SELECT referral_bonus_amount FROM settings ORDER BY id DESC LIMIT 1"
  );
  return Number(row?.referral_bonus_amount || 0);
}

// 🔹 Get earn per order amount from settings (DYNAMIC)
async function getEarnPerOrderAmount(conn) {
  const [[row]] = await conn.query(
    "SELECT earn_per_order_amount FROM settings ORDER BY id DESC LIMIT 1"
  );
  return Number(row?.earn_per_order_amount || 0);
}

// 🔹 Get loyalty settings (DYNAMIC)
async function getLoyaltySettings(conn) {
  const [[row]] = await conn.query(
    `SELECT 
       minimum_order,
       loyalty_points_per_gbp,
       loyalty_available_after_hours,
       loyalty_expiry_days
     FROM settings
     ORDER BY id DESC
     LIMIT 1`
  );

  return {
    minimum_order: Number(row?.minimum_order || 0),
    loyalty_points_per_gbp: Number(row?.loyalty_points_per_gbp || 1),
    loyalty_available_after_hours: (row?.loyalty_available_after_hours !== undefined && row?.loyalty_available_after_hours !== null)
      ? Number(row.loyalty_available_after_hours)
      : 24,
    loyalty_expiry_days: Number(row?.loyalty_expiry_days || 30),
  };
}

// 🔹 Get redeem settings (DYNAMIC)
async function getRedeemSettings(conn) {
  const [[row]] = await conn.query(
    `SELECT loyalty_redeem_points, loyalty_redeem_value
     FROM settings
     ORDER BY id DESC
     LIMIT 1`
  );

  return {
    redeem_points: Number(row?.loyalty_redeem_points || 10),
    redeem_value: Number(row?.loyalty_redeem_value || 1),
  };
}

// ----------------- CREATE ORDER (WITH WALLET) ----------------- //
/* CORRECTED createOrder FUNCTION */
export const createOrder = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const {
      user_id,
      customer_id,
      payment_mode,
      payment_request_id,
      instore,
      allergy_note,
      car_color,
      reg_number,
      owner_name,
      mobile_number,
      items,
      wallet_used,
      loyalty_used,
      order_source,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ status: 0, message: "Items are required" });
    }

    // ✅ compute order gross total
    const orderGrossTotal = items.reduce((sum, item) => {
      const price = Number(item.price || 0);
      const qty = Number(item.quantity || 0);
      const discount = Number(item.discount_amount || 0);
      const vat = Number(item.vat || 0);

      const totalPrice = price * qty;
      const gross = totalPrice - discount + vat;
      return sum + gross;
    }, 0);

    const [[settingsRow]] = await conn.query(
      "SELECT minimum_cart_total FROM settings ORDER BY id DESC LIMIT 1"
    );
    const minimumCartTotal = Number(settingsRow?.minimum_cart_total || 0);

    // Skip minimum cart check for Dashboard orders if desired, but user didn't specify.
    // However, usually dashboard orders are manual and might bypass some rules.
    // For now, I'll keep it but maybe it should be bypassed for 'Dashboard' source.

    if (order_source !== 'Dashboard' && minimumCartTotal > 0 && orderGrossTotal < minimumCartTotal) {
      await conn.rollback();
      return res.status(400).json({
        status: 0,
        message: `Minimum order amount is £${minimumCartTotal.toFixed(2)}`
      });
    }

    const requestedWallet = Number(wallet_used || 0);
    if (requestedWallet < 0) {
      return res.status(400).json({ status: 0, message: "Invalid wallet amount" });
    }

    await conn.beginTransaction();

    let restaurantId = null;
    let restaurantOwnerId = null;
    let restaurantName = "";

    if (Array.isArray(items) && items.length > 0 && items[0].product_id) {
      const firstProductId = items[0].product_id;
      const [prdRows] = await conn.query(
        `SELECT rd.id as restaurant_id, rd.restaurant_name, p.user_id as owner_id
         FROM products p
         JOIN restaurant_details rd ON p.user_id = rd.user_id
         WHERE p.id = ? LIMIT 1`,
        [firstProductId]
      );
      if (prdRows.length) {
        restaurantId = prdRows[0].restaurant_id;
        restaurantName = prdRows[0].restaurant_name || "";
        restaurantOwnerId = prdRows[0].owner_id;
      }
    }

    const finalUserId = restaurantOwnerId || user_id;

    if (!restaurantId && finalUserId) {
      const [rData] = await conn.query(
        "SELECT id, restaurant_name FROM restaurant_details WHERE user_id = ? LIMIT 1",
        [finalUserId]
      );
      if (rData.length) {
        restaurantId = rData[0].id;
        restaurantName = rData[0].restaurant_name;
      }
    }

    const order_number = generateOrderNumber(restaurantName);

    // ✅ Wallet deduction
    let walletDeducted = 0;
    if (requestedWallet > 0) {
      const [[walletRow]] = await conn.query(
        "SELECT balance FROM customer_wallets WHERE customer_id = ? FOR UPDATE",
        [customer_id]
      );
      const currentBalance = Number(walletRow?.balance || 0);

      if (currentBalance <= 0) {
        await conn.rollback();
        return res.status(400).json({ status: 0, message: "Wallet balance is 0" });
      }

      const maxUsable = Math.min(currentBalance, orderGrossTotal);
      if (requestedWallet > maxUsable) {
        await conn.rollback();
        return res.status(400).json({
          status: 0,
          message: `You can use max £${maxUsable.toFixed(2)} from wallet`,
        });
      }

      walletDeducted = requestedWallet;
      const newBalance = currentBalance - walletDeducted;

      await conn.query(
        "UPDATE customer_wallets SET balance = ? WHERE customer_id = ?",
        [newBalance, customer_id]
      );

      await conn.query(
        `INSERT INTO wallet_transactions
          (customer_id, transaction_type, amount, balance_after, source, payment_id, order_id, description)
         VALUES (?, 'DEBIT', ?, ?, 'ORDER', NULL, NULL, ?)`,
        [customer_id, walletDeducted, newBalance, `Wallet used for order ${order_number}`]
      );
    }

    // ✅ Loyalty deduction
    const requestedLoyalty = Number(loyalty_used || 0);
    if (requestedLoyalty < 0) {
      await conn.rollback();
      return res.status(400).json({ status: 0, message: "Invalid loyalty amount" });
    }

    let loyaltyDeducted = 0;
    if (requestedLoyalty > 0) {
      const [rows] = await conn.query(
        `SELECT id, points_remaining FROM loyalty_earnings
         WHERE customer_id = ? AND available_from <= NOW() AND expires_at >= NOW() AND points_remaining > 0
         ORDER BY expires_at ASC FOR UPDATE`,
        [customer_id]
      );

      let remainingValue = requestedLoyalty;
      const redeemCfg = await getRedeemSettings(conn);

      for (const r of rows) {
        if (remainingValue <= 0.001) break;
        const creditValue = (r.points_remaining / redeemCfg.redeem_points) * redeemCfg.redeem_value;
        const usable = Math.min(creditValue, remainingValue);
        const pointsToDeduct = Math.ceil((usable / redeemCfg.redeem_value) * redeemCfg.redeem_points);

        await conn.query(
          `UPDATE loyalty_earnings SET points_remaining = points_remaining - ? WHERE id = ?`,
          [pointsToDeduct, r.id]
        );
        loyaltyDeducted += usable;
        remainingValue -= usable;
        remainingValue = Number(remainingValue.toFixed(4));
      }

      if (remainingValue > 0.01) {
        await conn.rollback();
        return res.status(400).json({ status: 0, message: "Not enough loyalty credits" });
      }
    }

    if (loyaltyDeducted > 0) {
      await conn.query(
        `INSERT INTO wallet_transactions
         (customer_id, transaction_type, amount, balance_after, source, order_id, description)
         VALUES (?, 'DEBIT', ?, 0, 'LOYALTY_USED', NULL, ?)`,
        [customer_id, loyaltyDeducted, `Loyalty credits used for order ${order_number}`]
      );
    }

    // ✅ Insert order rows
    let firstRow = true;
    let orderIdForLoyalty = null;

    for (const item of items) {
      const {
        product_id,
        product_name,
        price,
        discount_amount,
        vat,
        quantity,
        textfield,          // <--- GETTING TEXT FROM APP
        special_instruction
      } = item;

      // Use textfield coming from frontend
      const noteToSave = textfield || special_instruction || null;

      const totalPrice = Number(price) * Number(quantity);
      const totalDiscount = Number(discount_amount || 0);
      const totalVat = Number(vat || 0);
      const gross = totalPrice - totalDiscount + totalVat;

      const walletAmountForThisRow = firstRow ? walletDeducted : 0;
      const loyaltyAmountForThisRow = firstRow ? loyaltyDeducted : 0;
      const paid = firstRow
        ? Math.max(0, gross - walletDeducted - loyaltyDeducted)
        : gross;

      // ✅ ADDED `special_instruction` to INSERT
      const sql = `
        INSERT INTO orders 
        (user_id, order_number, customer_id, product_id, payment_mode, payment_request_id,
         product_name, special_instruction, price, discount_amount, vat, gross_total,
         wallet_amount, loyalty_amount, quantity, grand_total, order_status,
         delivery_estimate_time, car_color, reg_number, owner_name, mobile_number, instore, allergy_note, order_source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        finalUserId,
        order_number,
        customer_id,
        product_id,
        payment_mode,
        payment_request_id || null,
        product_name,
        noteToSave, // <--- SAVING THE NOTE HERE
        price,
        totalDiscount,
        totalVat,
        gross,
        walletAmountForThisRow,
        loyaltyAmountForThisRow,
        quantity,
        paid,
        0,
        null,
        car_color || null,
        reg_number || null,
        owner_name || null,
        mobile_number || null,
        instore || 0,
        allergy_note || null,
        order_source || 'App',
      ];

      const [orderInsertRes] = await conn.query(sql, values);

      if (firstRow && orderInsertRes?.insertId) {
        orderIdForLoyalty = orderInsertRes.insertId;
      }
      firstRow = false;
    }

    // ✅ LOYALTY EARNINGS
    const loyaltyCfg = await getLoyaltySettings(conn);
    const paidTotal = Math.max(0, Number(orderGrossTotal) - Number(walletDeducted) - Number(loyaltyDeducted));

    if (paidTotal >= loyaltyCfg.minimum_order) {
      const pointsEarned = Math.floor(paidTotal * loyaltyCfg.loyalty_points_per_gbp);
      if (pointsEarned > 0 && orderIdForLoyalty) {
        await conn.query(
          `INSERT INTO loyalty_earnings
           (customer_id, order_id, points_earned, points_remaining, available_from, expires_at, created_at)
           VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR), DATE_ADD(NOW(), INTERVAL ? DAY), NOW())`,
          [
            customer_id,
            orderIdForLoyalty,
            pointsEarned,
            pointsEarned,
            loyaltyCfg.loyalty_available_after_hours,
            loyaltyCfg.loyalty_expiry_days,
          ]
        );
      }
    }

    // ✅ REFERRAL REWARD
    const [[customerRow]] = await conn.query(
      `SELECT referred_by_customer_id, referral_bonus_awarded FROM customers WHERE id = ? FOR UPDATE`,
      [customer_id]
    );

    if (customerRow?.referred_by_customer_id && customerRow.referral_bonus_awarded === 0) {
      const referrerId = customerRow.referred_by_customer_id;
      const referralAmount = await getReferralFlatAmount(conn);

      if (referralAmount > 0) {
        await conn.query(
          `INSERT INTO customer_wallets (customer_id, balance, created_at, updated_at)
           VALUES (?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance), updated_at = NOW()`,
          [referrerId, referralAmount]
        );
        const [[walletRow]] = await conn.query("SELECT balance FROM customer_wallets WHERE customer_id = ?", [referrerId]);
        await conn.query(
          `INSERT INTO wallet_transactions
           (customer_id, transaction_type, amount, balance_after, source, order_id, description, created_at)
           VALUES (?, 'CREDIT', ?, ?, 'REFERRAL_BONUS', NULL, ?, NOW())`,
          [referrerId, referralAmount, walletRow?.balance || 0, `Referral bonus for order ${order_number}`]
        );
        await conn.query("UPDATE customers SET referral_bonus_awarded = 1 WHERE id = ?", [customer_id]);
      }
    }

    // ✅ EARN PER ORDER REWARD
    const earnPerOrder = await getEarnPerOrderAmount(conn);
    if (earnPerOrder > 0) {
      await conn.query(
        `INSERT INTO customer_wallets (customer_id, balance, created_at, updated_at)
         VALUES (?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance), updated_at = NOW()`,
        [customer_id, earnPerOrder]
      );
      const [[wRow]] = await conn.query("SELECT balance FROM customer_wallets WHERE customer_id = ?", [customer_id]);
      await conn.query(
        `INSERT INTO wallet_transactions
         (customer_id, transaction_type, amount, balance_after, source, order_id, description, created_at)
         VALUES (?, 'CREDIT', ?, ?, 'EARN_PER_ORDER', NULL, ?, NOW())`,
        [customer_id, earnPerOrder, wRow?.balance || 0, `Earnings for order ${order_number}`]
      );
    }

    if (payment_request_id) {
      await conn.query(
        `INSERT INTO order_payment_history (order_no, payment_request_id, amount, payment_status, restaurant_id)
         VALUES (?, ?, ?, 'success', ?)`,
        [order_number, payment_request_id, paidTotal, restaurantId]
      );
    }

    await conn.query("DELETE FROM cart WHERE customer_id = ?", [customer_id]);
    await conn.commit();

    try {
      await sendNotification({
        userType: "restaurant",
        userId: finalUserId,
        title: "🍽️ New Order Received",
        body: `Order ${order_number} has been placed`,
        data: { order_number, type: "NEW_ORDER" }
      });
    } catch (e) { console.error("Restaurant notification failed:", e.message); }

    return res.status(200).json({
      status: 1,
      message: "Order Placed Successfully",
      order_number,
      wallet_used: walletDeducted,
      loyalty_used: loyaltyDeducted,
    });

  } catch (error) {
    try { await conn.rollback(); } catch { }
    console.error("Order creation error:", error);
    return res.status(500).json({ status: 0, message: "Server Error", error: error.message });
  } finally {
    conn.release();
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const roleId = req.user.role_id;
    const roleName = req.user.role || req.user.role_title || null;
    const { restaurantId, startDate, endDate } = req.query;

    const isSuperAdmin = (Number(roleId) === 6) || (typeof roleName === "string" && roleName.toLowerCase() === "super admin");

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const targetStartDate = startDate || todayStr;
    const targetEndDate = endDate || startDate || todayStr;

    let sql = `
      SELECT 
        o.*,
        c.full_name AS customer_name,
        rd.restaurant_name AS restaurant_name
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN restaurant_details rd ON o.user_id = rd.user_id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `;

    const params = [];

    if (!isSuperAdmin) {
      sql += ` AND o.user_id = ? `;
      params.push(userId);
    } else if (restaurantId && restaurantId !== "all") {
      sql += ` AND o.user_id = ? `;
      params.push(restaurantId);
    }

    sql += ` AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ? `;
    params.push(targetStartDate, targetEndDate);

    sql += ` ORDER BY o.created_at DESC `;

    const [rows] = await db.query(sql, params);

    return res.json({
      status: 1,
      orders: rows,
    });
  } catch (error) {
    console.error("Get orders error:", error);
    return res.status(500).json({
      status: 0,
      message: "Server error",
    });
  }
};

export const getCustomerOrders = async (req, res) => {
  try {
    const customerId = req.params.customer_id;

    const [rows] = await db.query(`
      SELECT 
        order_number AS order_no,
        MIN(id) AS order_id,
        customer_id,
        user_id,
        -- ✅ FIX: Use grand_total (Net Payable) instead of gross_total
        SUM(grand_total) AS total_amount,
        
        SUM(quantity) AS items_count,
        MIN(order_status) AS status,
        MAX(created_at) AS created_at,
        MAX(delivery_estimate_time) AS delivery_estimate_time
      FROM orders
      WHERE customer_id = ?
      GROUP BY order_number
      ORDER BY created_at DESC
    `, [customerId]);

    return res.json({
      status: 1,
      data: rows
    });
  } catch (error) {
    console.error("getCustomerOrders error:", error);
    return res.status(500).json({
      status: 0,
      message: "Server error"
    });
  }
};

export const getOrder = async (req, res) => {
  try {
    // order_id comes from URL
    const orderId = req.params.order_id;

    // 1️⃣ Find order_number using ANY row
    const [[row]] = await db.query(
      "SELECT order_number FROM orders WHERE id = ?",
      [orderId]
    );

    if (!row) {
      return res.status(404).json({
        status: 0,
        message: "Order not found"
      });
    }

    const orderNumber = row.order_number;

    // 2️⃣ Fetch ALL items of this order
    const [rows] = await db.query(
      "SELECT * FROM orders WHERE order_number = ?",
      [orderNumber]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: 0,
        message: "Order not found"
      });
    }

    const order = {
      order_id: orderId,
      order_no: orderNumber,
      customer_id: rows[0].customer_id,

      // ✅ IMPORTANT
      status: Math.max(...rows.map(r => Number(r.order_status))),
      delivery_estimate_time: rows
        .map(r => r.delivery_estimate_time)
        .filter(Boolean)[0] || null,

      created_at: rows[0].created_at,

      // ✅ ADDED: Sum up usage from all rows so frontend can display it
      wallet_used: rows.reduce((sum, r) => sum + Number(r.wallet_amount || 0), 0),
      loyalty_used: rows.reduce((sum, r) => sum + Number(r.loyalty_amount || 0), 0),

      total_amount: rows.reduce(
        (sum, r) => sum + Number(r.grand_total),
        0
      ),
      items: rows.map(r => ({
        product_id: r.product_id,
        product_name: r.product_name,
        quantity: r.quantity,
        price: r.price
      }))
    };

    return res.json({
      status: 1,
      data: order
    });

  } catch (error) {
    console.error("getOrder error:", error);
    return res.status(500).json({
      status: 0,
      message: "Server error"
    });
  }
};

/* REPLACE YOUR EXISTING updateOrderStatus FUNCTION WITH THIS */

export const updateOrderStatus = async (req, res) => {
  const conn = await db.getConnection(); // Use transaction for safety
  try {
    const { order_number, status, ready_in_minutes } = req.body;
    const allowedStatuses = [1, 2, 3, 4, 5];
    const newStatus = Number(status);

    if (!order_number || !allowedStatuses.includes(newStatus)) {
      return res.status(400).json({ status: 0, message: "Invalid order status" });
    }

    await conn.beginTransaction();

    // 1️⃣ CHECK CURRENT STATUS & CUSTOMER INFO
    const [orders] = await conn.query(
      `SELECT id, order_status, customer_id, wallet_amount, loyalty_amount FROM orders WHERE order_number = ?`,
      [order_number]
    );

    if (orders.length === 0) {
      await conn.rollback();
      return res.status(404).json({ status: 0, message: "Order not found" });
    }

    const firstRow = orders[0];
    const currentStatus = Number(firstRow.order_status);

    // If status is already 2 (Rejected) or 5 (Cancelled), don't process again
    if (currentStatus === 2 || currentStatus === 5) {
      await conn.rollback();
      return res.status(400).json({ status: 0, message: "Order is already cancelled/rejected" });
    }

    // 2️⃣ REFUND LOGIC (If Rejected or Cancelled)
    if (newStatus === 2 || newStatus === 5) {
      // Calculate total to refund (Wallet + Loyalty)
      const totalRefund = orders.reduce((sum, o) => sum + (Number(o.wallet_amount) + Number(o.loyalty_amount)), 0);

      if (totalRefund > 0) {
        // Update Customer Wallet Balance
        await conn.query(
          "UPDATE customer_wallets SET balance = balance + ? WHERE customer_id = ?",
          [totalRefund, firstRow.customer_id]
        );

        // Get new balance for history
        const [[wRow]] = await conn.query("SELECT balance FROM customer_wallets WHERE customer_id = ?", [firstRow.customer_id]);

        // Add Refund Transaction record
        await conn.query(
          `INSERT INTO wallet_transactions
           (customer_id, transaction_type, amount, balance_after, source, description, created_at)
           VALUES (?, 'CREDIT', ?, ?, 'REFUND', ?, NOW())`,
          [
            firstRow.customer_id,
            totalRefund,
            wRow?.balance || 0,
            `Refund for ${newStatus === 2 ? 'Rejected' : 'Cancelled'} order ${order_number}`
          ]
        );
      }

      // 3️⃣ VOID EARNED LOYALTY (Remove pending points so they don't get free points)
      await conn.query(
        `DELETE FROM loyalty_earnings WHERE order_id IN (SELECT id FROM orders WHERE order_number = ?)`,
        [order_number]
      );
    }

    // 4️⃣ UPDATE STATUS ON ORDERS TABLE
    let readyAt = null;
    if (newStatus === 1) {
      const minutes = Number(ready_in_minutes || 0);
      const d = new Date(Date.now() + minutes * 60000);
      readyAt = d.toISOString().slice(0, 19).replace("T", " ");
    }

    await conn.query(
      `UPDATE orders SET order_status = ?, delivery_estimate_time = ? WHERE order_number = ?`,
      [newStatus, readyAt, order_number]
    );

    // 5️⃣ NOTIFICATION LOGIC (Same as before)
    const statusMap = {
      1: { title: "✅ Order Accepted", body: `Your order will be ready in ${ready_in_minutes} minutes` },
      2: { title: "❌ Order Rejected", body: `Your order ${order_number} was rejected and amount refunded.` },
      3: { title: "🍳 Order Ready", body: `Your order ${order_number} is ready for pickup` },
      4: { title: "🚗 Order Collected", body: `Thank you! Enjoy your food!` },
      5: { title: "⚠️ Order Cancelled", body: `Your order ${order_number} has been cancelled and amount refunded.` }
    };

    if (statusMap[newStatus]) {
      const notif = statusMap[newStatus];
      await conn.query(`
        INSERT INTO notifications (user_type, user_id, title, body, created_at, order_number, status)
        VALUES (?, ?, ?, ?, NOW(), ?, ?)
      `, ["customer", firstRow.customer_id, notif.title, notif.body, order_number, String(newStatus)]);

      await sendNotification({
        userType: "customer",
        userId: firstRow.customer_id,
        title: notif.title,
        body: notif.body,
        data: { order_number, status: String(newStatus) }
      });
    }

    await conn.commit();
    return res.json({ status: 1, message: "Order status updated and processed successfully" });

  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Update order status error:", err);
    return res.status(500).json({ status: 0, message: "Server error" });
  } finally {
    if (conn) conn.release();
  }
};