import db from "../../config/db.js";
import Stripe from "stripe";

export const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const roleId = req.user.role_id;
        const roleName = req.user.role || req.user.role_title || null;
        const isSuperAdmin = (Number(roleId) === 6) || (typeof roleName === "string" && roleName.toLowerCase() === "super admin");

        const whereClause = isSuperAdmin ? "1=1" : "rd.user_id = ?";
        const baseParams = isSuperAdmin ? [] : [userId];

        // Filter by Restaurant (Super Admin only)
        // incoming filter parameters: dates are already handled above, but we also
        // allow filtering by specific customer IDs (comma-separated) and by a
        // time-of-day range.  These are only applied to the *selected range* queries
        // (not lifetime stats) so that the dashboard can show data for particular
        // customers/times on the chosen date.
        const { startDate, endDate, restaurantId, customerIds, startTime, endTime, compareStartDate, compareEndDate } = req.query;
        let targetUserId = userId;

        // Define where clauses for different tables
        let orderWhere = isSuperAdmin ? "1=1" : "o.user_id = ?";
        let productWhere = isSuperAdmin ? "1=1" : "p.user_id = ?";
        let effectiveParams = isSuperAdmin ? [] : [userId];

        if (isSuperAdmin && restaurantId && restaurantId !== "all") {
            orderWhere = "o.user_id = ?";
            productWhere = "p.user_id = ?";
            effectiveParams = [restaurantId];
            targetUserId = restaurantId;
        }

        // build extra SQL clauses for customer/time filters
        let extraWhere = "";
        const extraParams = [];
        if (customerIds) {
            const ids = customerIds
                .split(",")
                .map(i => parseInt(i, 10))
                .filter(i => !isNaN(i));
            if (ids.length) {
                extraWhere += ` AND o.customer_id IN (${ids.map(() => "?").join(",")})`;
                extraParams.push(...ids);
            }
        }
        if (startTime && endTime) {
            // basic validation: expect HH:MM(:SS) format
            extraWhere += " AND TIME(o.created_at) >= ? AND TIME(o.created_at) <= ?";
            extraParams.push(startTime, endTime);
        }

        // Parse Date or Range
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const targetStartDateStr = startDate || todayStr;
        const targetEndDateStr = endDate || startDate || todayStr;

        // Is Single Day?
        const isSingleDay = targetStartDateStr === targetEndDateStr;

        // Determine Previous Range
        let prevStartDateStr, prevEndDateStr;

        if (compareStartDate && compareEndDate) {
            prevStartDateStr = compareStartDate;
            prevEndDateStr = compareEndDate;
        } else if (isSingleDay) {
            // Previous day
            const d = new Date(targetStartDateStr);
            d.setDate(d.getDate() - 1);
            prevStartDateStr = d.toISOString().split('T')[0];
            prevEndDateStr = prevStartDateStr;
        } else {
            // Shift whole range back by duration
            const start = new Date(targetStartDateStr);
            const end = new Date(targetEndDateStr);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive

            const pStart = new Date(start);
            pStart.setDate(pStart.getDate() - diffDays);
            const pEnd = new Date(end);
            pEnd.setDate(pEnd.getDate() - diffDays);

            prevStartDateStr = pStart.toISOString().split('T')[0];
            prevEndDateStr = pEnd.toISOString().split('T')[0];
        }


        const conn = await db.getConnection();

        try {
            // Fetch Restaurant Name
            let restaurantName = "Dashboard";
            if (isSuperAdmin && (!restaurantId || restaurantId === "all")) {
                restaurantName = "Super Admin";
            } else {
                const lookupId = (isSuperAdmin && restaurantId) ? restaurantId : userId;
                const rQuery = `SELECT restaurant_name FROM restaurant_details WHERE user_id = ?`;
                const [[rDetails]] = await conn.query(rQuery, [lookupId]);
                if (rDetails) restaurantName = rDetails.restaurant_name;
            }

            // 1. LIFETIME STATS
            const totalOrderQuery = `
                SELECT 
                    COUNT(DISTINCT o.order_number) as total_orders, 
                    SUM(o.grand_total) as total_revenue
                FROM orders o
                WHERE ${orderWhere}
            `;
            const [[totalStats]] = await conn.query(totalOrderQuery, effectiveParams);

            const customerQuery = `
                SELECT COUNT(DISTINCT o.customer_id) as total_customers
                FROM orders o
                WHERE ${orderWhere} ${extraWhere}
                  AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
            `;
            const [[customerStats]] = await conn.query(customerQuery, [...effectiveParams, ...extraParams, targetStartDateStr, targetEndDateStr]);


            // 2. SELECTED RANGE STATS
            const rangeStatsQuery = `
                SELECT 
                    COUNT(DISTINCT o.order_number) as count, 
                    SUM(o.grand_total) as revenue 
                FROM orders o
                WHERE ${orderWhere} ${extraWhere}
                  AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
            `;
            const [[rangeStats]] = await conn.query(rangeStatsQuery, [...effectiveParams, ...extraParams, targetStartDateStr, targetEndDateStr]);

            // PREVIOUS RANGE STATS
            const [[prevRangeStats]] = await conn.query(rangeStatsQuery, [...effectiveParams, ...extraParams, prevStartDateStr, prevEndDateStr]);


            // 3. CHARTS

            // A. SALES COMPARISON (Revenue)
            // If Single Day: Compare Hourly Revenue (Today vs Yesterday)
            // If Range: Compare Daily Revenue (This Range vs Prev Range)
            let salesComparisonData = [];

            if (isSingleDay) {
                // Hourly Comparison
                const hourlyQuery = `
                    SELECT 
                        DATE(o.created_at) as date,
                        HOUR(o.created_at) as unit, 
                        SUM(o.grand_total) as total
                    FROM (
                         SELECT o.order_number, MAX(o.created_at) as created_at, MAX(o.grand_total) as grand_total
                         FROM orders o
                         WHERE ${orderWhere} AND DATE(o.created_at) IN (?, ?) ${extraWhere}
                         GROUP BY o.order_number
                    ) as o
                    GROUP BY DATE(o.created_at), HOUR(o.created_at)
                `;
                const [rows] = await conn.query(hourlyQuery, [...effectiveParams, prevStartDateStr, targetStartDateStr, ...extraParams]);

                const map = {};
                for (let i = 0; i < 24; i++) map[i] = { label: `${i}:00`, current: 0, previous: 0 };

                rows.forEach(row => {
                    const rowDateStr = row.date.toISOString().split('T')[0];
                    if (map[row.unit]) {
                        if (rowDateStr === targetStartDateStr) map[row.unit].current += Number(row.total);
                        else map[row.unit].previous += Number(row.total);
                    }
                });
                salesComparisonData = Object.values(map);

            } else {
                // Daily Comparison
                // We need to match Day 1 of current range with Day 1 of prev range
                // We'll calculate "Day Offset" from start
                const dailyQuery = `
                    SELECT 
                        DATE(o.created_at) as date,
                        SUM(o.grand_total) as total
                    FROM (
                         SELECT o.order_number, MAX(o.created_at) as created_at, MAX(o.grand_total) as grand_total
                         FROM orders o
                         WHERE ${orderWhere} ${extraWhere} AND (
                             (DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?) OR
                             (DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?)
                         )
                         GROUP BY o.order_number
                    ) as o
                    GROUP BY DATE(o.created_at)
                `;
                const [rows] = await conn.query(dailyQuery, [...effectiveParams, targetStartDateStr, targetEndDateStr, prevStartDateStr, prevEndDateStr, ...extraParams]);

                // Map results
                // Strategy: Create array of days for target range. Match previous by index.
                const days = [];
                let curr = new Date(targetStartDateStr);
                const end = new Date(targetEndDateStr);
                while (curr <= end) {
                    days.push(curr.toISOString().split('T')[0]);
                    curr.setDate(curr.getDate() + 1);
                }

                salesComparisonData = days.map((dayStr, idx) => {
                    // Find current val
                    const currentVal = rows.find(r => r.date.toISOString().split('T')[0] === dayStr)?.total || 0;

                    // Find prev val (dayStr - diff ?)
                    // Or simpler: We know the previous range has same duration.
                    // We need to find the date at 'idx' offset in previous range.
                    const pStart = new Date(prevStartDateStr);
                    pStart.setDate(pStart.getDate() + idx);
                    const pDayStr = pStart.toISOString().split('T')[0];
                    const prevVal = rows.find(r => r.date.toISOString().split('T')[0] === pDayStr)?.total || 0;

                    return { label: dayStr, current: Number(currentVal), previous: Number(prevVal) };
                });
            }


            // B. AVERAGE COST (Avg Order Value) Trend
            // Query: Sum(Total) / Count(Orders)
            let avgOrderValueData = [];

            if (isSingleDay) {
                const hourlyAvgQuery = `
                    SELECT 
                        HOUR(created_at) as unit,
                        SUM(grand_total) as total_rev,
                        COUNT(order_number) as total_orders
                    FROM (
                        SELECT o.order_number, MAX(o.created_at) as created_at, MAX(o.grand_total) as grand_total
                        FROM orders o
                        WHERE ${orderWhere} AND DATE(o.created_at) = ? ${extraWhere}
                        GROUP BY o.order_number
                    ) as unique_orders
                    GROUP BY HOUR(created_at)
                    ORDER BY unit ASC
                `;
                const [rows] = await conn.query(hourlyAvgQuery, [...effectiveParams, targetStartDateStr, ...extraParams]);

                for (let i = 0; i < 24; i++) {
                    const row = rows.find(r => r.unit === i);
                    const avg = row ? (Number(row.total_rev) / Number(row.total_orders)) : 0;
                    avgOrderValueData.push({ label: `${i}:00`, value: avg });
                }

            } else {
                const dailyAvgQuery = `
                    SELECT 
                        DATE(created_at) as date,
                        SUM(grand_total) as total_rev,
                        COUNT(order_number) as total_orders
                    FROM (
                        SELECT o.order_number, MAX(o.created_at) as created_at, MAX(o.grand_total) as grand_total
                        FROM orders o
                        WHERE ${orderWhere} AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ? ${extraWhere}
                        GROUP BY o.order_number
                    ) as unique_orders
                    GROUP BY DATE(created_at)
                    ORDER BY date ASC
                `;
                const [rows] = await conn.query(dailyAvgQuery, [...effectiveParams, targetStartDateStr, targetEndDateStr, ...extraParams]);

                // Fill gaps
                let curr = new Date(targetStartDateStr);
                const end = new Date(targetEndDateStr);
                while (curr <= end) {
                    const dStr = curr.toISOString().split('T')[0];
                    const row = rows.find(r => r.date.toISOString().split('T')[0] === dStr);
                    const avg = row ? (Number(row.total_rev) / Number(row.total_orders)) : 0;
                    avgOrderValueData.push({ label: dStr, value: avg });
                    curr.setDate(curr.getDate() + 1);
                }
            }


            // C. WEEKLY ORDERS (Monday - Sunday)
            // Always show current week (or if range is within a week, shows that week).
            // Let's stick to "Selected Range Orders Trend" to be safe and accurate to the filter.
            // If the user selects "This Week", it automatically covers Mon-Sun.
            const ordersTrendQuery = `
                SELECT DATE(o.created_at) as date, COUNT(DISTINCT o.order_number) as count
                FROM orders o
                WHERE ${orderWhere} 
                  AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
                GROUP BY DATE(o.created_at)
                ORDER BY date ASC
            `;
            const [ordersTrendRows] = await conn.query(ordersTrendQuery, [...effectiveParams, targetStartDateStr, targetEndDateStr, ...extraParams]);

            // Normalize dates to ensure continuity for graphs
            let ordersTrendData = [];
            if (!isSingleDay) {
                let curr = new Date(targetStartDateStr);
                const end = new Date(targetEndDateStr);
                while (curr <= end) {
                    const dStr = curr.toISOString().split('T')[0];
                    const found = ordersTrendRows.find(r => r.date.toISOString().split('T')[0] === dStr);
                    ordersTrendData.push({ date: dStr, count: found ? found.count : 0 });
                    curr.setDate(curr.getDate() + 1);
                }
            } else {
                // If single day, show hourly distribution instead? 
                // The prompt asks for "Weekly Orders". If selected range is "Today", showing "Weekly" might be confusing unless we explicitly fetch the surrounding week.
                // Let's implement logical "Weekly Context": Start of Week (Mon) to End of Week (Sun) containing the Target Date.

                const tDate = new Date(targetStartDateStr);
                const day = tDate.getDay() || 7; // 1=Mon, 7=Sun
                const weekStart = new Date(tDate);
                weekStart.setHours(-24 * (day - 1));
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);

                const sStr = weekStart.toISOString().split('T')[0];
                const eStr = weekEnd.toISOString().split('T')[0];

                const weeklyQuery = `
                    SELECT DATE(o.created_at) as date, COUNT(DISTINCT o.order_number) as count
                    FROM orders o
                    WHERE ${orderWhere} 
                      AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
                    GROUP BY DATE(o.created_at)
                    ORDER BY date ASC
                `;
                const [wRows] = await conn.query(weeklyQuery, [...effectiveParams, sStr, eStr, ...extraParams]);

                let currW = new Date(sStr);
                const endW = new Date(eStr);
                while (currW <= endW) {
                    const dStr = currW.toISOString().split('T')[0];
                    const found = wRows.find(r => r.date.toISOString().split('T')[0] === dStr);
                    ordersTrendData.push({ date: dStr, count: found ? found.count : 0 });
                    currW.setDate(currW.getDate() + 1);
                }
            }


            // D. Top Selling Products (Filtered by Range)
            const topProductsQuery = `
                SELECT 
                    p.product_name as name, 
                    p.product_image as image,
                    p.product_price as price,
                    p.product_desc as description,
                    c.category_name as category_name,
                    COUNT(*) as count
                FROM orders o
                JOIN products p ON o.product_id = p.id
                LEFT JOIN categories c ON p.cat_id = c.id
                WHERE ${orderWhere}
                  AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
                GROUP BY p.id, p.product_name, p.product_image, p.product_price, p.product_desc, c.category_name
                ORDER BY count DESC
                LIMIT 10
            `;
            const [topProductsRows] = await conn.query(topProductsQuery, [...effectiveParams, targetStartDateStr, targetEndDateStr, ...extraParams]);


            // 4. RECENT ORDERS
            const recentOrdersQuery = `
                SELECT 
                    o.order_number, 
                    SUM(o.grand_total) as grand_total, 
                    MAX(o.created_at) as created_at, 
                    MAX(o.order_status) as order_status, 
                    MAX(c.full_name) as customer_name,
                    MAX(c.email) as customer_email,
                    MAX(c.mobile_number) as customer_phone
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                WHERE ${orderWhere} AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ? ${extraWhere}
                GROUP BY o.order_number
                ORDER BY MAX(o.created_at) DESC
            `;
            const [recentOrders] = await conn.query(recentOrdersQuery, [...effectiveParams, targetStartDateStr, targetEndDateStr, ...extraParams]);

            // 5. NEW METRICS & EXTRAS
            let pendingOrdersVal = 0;
            let complaintRequestsVal = 0;
            let cancelledOrdersVal = 0;
            let yetToReceivePaymentsVal = 0;
            let deactiveProductsVal = 0;
            let totalProductsVal = 0;
            let completedOrdersVal = 0;
            let restaurantPerformance = [];

            // Fetch Pending Orders (Status 0: Placed, 1: Accepted, 3: Ready)
            const pendingQuery = `
                SELECT COUNT(DISTINCT o.order_number) as count
                FROM orders o
                WHERE o.order_status IN (0, 1, 3) AND ${orderWhere} ${extraWhere}
                  AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
            `;
            const [[pendingRes]] = await conn.query(pendingQuery, [...effectiveParams, ...extraParams, targetStartDateStr, targetEndDateStr]);
            pendingOrdersVal = pendingRes?.count || 0;

            // Fetch Rejected Orders (Status 2: Rejected)
            const rejectedQuery = `
                SELECT COUNT(DISTINCT o.order_number) as count
                FROM orders o
                WHERE o.order_status = 2 AND ${orderWhere} ${extraWhere}
                  AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
            `;
            const [[rejectedRes]] = await conn.query(rejectedQuery, [...effectiveParams, ...extraParams, targetStartDateStr, targetEndDateStr]);
            const rejectedOrdersVal = rejectedRes?.count || 0;
            complaintRequestsVal = rejectedOrdersVal;

            // Fetch Cancelled Orders (Status 5)
            const cancelledQuery = `
                SELECT COUNT(DISTINCT o.order_number) as count
                FROM orders o
                WHERE o.order_status = 5 AND ${orderWhere} ${extraWhere}
                  AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
            `;
            const [[cancelledRes]] = await conn.query(cancelledQuery, [...effectiveParams, ...extraParams, targetStartDateStr, targetEndDateStr]);
            cancelledOrdersVal = cancelledRes?.count || 0;

            // Yet to receive payments (Assume Cash and not Collected/Ready)
            const paymentsQuery = `
                SELECT COUNT(DISTINCT o.order_number) as count
                FROM orders o
                WHERE o.payment_mode = 0 AND o.order_status < 4 AND ${orderWhere} ${extraWhere}
                  AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
            `;
            const [[paymentsRes]] = await conn.query(paymentsQuery, [...effectiveParams, ...extraParams, targetStartDateStr, targetEndDateStr]);
            yetToReceivePaymentsVal = paymentsRes?.count || 0;

            // Deactive Products (status = 0)
            const stockQuery = `
                SELECT COUNT(*) as count
                FROM products p
                WHERE p.status = 0 AND ${productWhere}
            `;
            const [[stockRes]] = await conn.query(stockQuery, effectiveParams);
            deactiveProductsVal = stockRes?.count || 0;

            // Total products
            const productsCountQuery = `
                SELECT COUNT(*) as count
                FROM products p
                WHERE ${productWhere}
            `;
            const [[productsRes]] = await conn.query(productsCountQuery, effectiveParams);
            totalProductsVal = productsRes?.count || 0;

            // Completed orders (Status 4: Collected)
            const completedQuery = `
                SELECT COUNT(DISTINCT o.order_number) as count
                FROM orders o
                WHERE o.order_status = 4 AND ${orderWhere} ${extraWhere}
                  AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
            `;
            const [[completedRes]] = await conn.query(completedQuery, [...effectiveParams, ...extraParams, targetStartDateStr, targetEndDateStr]);
            completedOrdersVal = completedRes?.count || 0;

            if (isSuperAdmin) {
                // Restaurant Wise Data (in range)
                const perfQuery = `
                    SELECT 
                        rd.restaurant_name,
                        COUNT(DISTINCT o.order_number) as order_count,
                        SUM(o.grand_total) as revenue
                    FROM orders o
                    JOIN products p ON o.product_id = p.id
                    JOIN restaurant_details rd ON p.user_id = rd.user_id
                    WHERE DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
                    GROUP BY rd.restaurant_name
                    ORDER BY revenue DESC
                 `;
                const [perfRows] = await conn.query(perfQuery, [targetStartDateStr, targetEndDateStr]);
                restaurantPerformance = perfRows;
            }

            return res.json({
                status: 1,
                data: {
                    total_bookings: totalStats?.total_orders || 0, // Lifetime
                    total_revenue: totalStats?.total_revenue || 0, // Lifetime
                    restaurant_name: restaurantName,

                    // Range Stats
                    today_users: rangeStats?.count || 0,
                    daily_revenue: rangeStats?.revenue || 0,
                    prev_today_users: prevRangeStats?.count || 0,
                    prev_daily_revenue: prevRangeStats?.revenue || 0,

                    followers: customerStats?.total_customers || 0,

                    // New Charts
                    sales_comparison: salesComparisonData,  // Replaces orders_vs_yesterday
                    avg_order_cost: avgOrderValueData,      // Replaces today_revenue (trend)
                    weekly_orders: ordersTrendData,         // Replaces completed_week

                    top_selling_products: topProductsRows,

                    recent_orders: recentOrders,

                    // Extras
                    pending_orders: pendingOrdersVal,
                    complaint_requests: rejectedOrdersVal,
                    rejected_orders: rejectedOrdersVal,
                    cancelled_orders: cancelledOrdersVal,
                    yet_to_receive_payments: yetToReceivePaymentsVal,
                    deactive_products: deactiveProductsVal,
                    total_products: totalProductsVal,
                    completed_orders: completedOrdersVal,

                    restaurant_performance: restaurantPerformance,
                    is_super_admin: isSuperAdmin
                }
            });

        } finally {
            conn.release();
        }

    } catch (error) {
        return res.status(500).json({ status: 0, message: "Server error" });
    }
};

export const getOrderDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const roleId = req.user.role_id;
        const roleName = req.user.role || req.user.role_title || null;
        const isSuperAdmin = (Number(roleId) === 6) || (typeof roleName === "string" && roleName.toLowerCase() === "super admin");
        const { order_number } = req.params;

        const whereClause = isSuperAdmin ? "1=1" : "rd.user_id = ?";
        const params = isSuperAdmin ? [order_number] : [userId, order_number];

        const query = `
            SELECT 
                p.product_name,
                p.product_image,
                o.quantity,
                o.price,
                (o.quantity * o.price) as total_price,
                o.grand_total, -- Included for reference
                o.special_instruction,
                o.created_at
            FROM orders o
            JOIN products p ON o.product_id = p.id
            JOIN restaurant_details rd ON p.user_id = rd.user_id
            WHERE ${whereClause} AND o.order_number = ?
        `;

        const conn = await db.getConnection();
        const [rows] = await conn.query(query, params);
        conn.release();

        return res.json({
            status: 1,
            data: rows
        });

    } catch (error) {
        return res.status(500).json({ status: 0, message: "Server error" });
    }
};

export const getFinanceSummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const roleId = req.user.role_id;
        const roleName = req.user.role || req.user.role_title || null;
        const isSuperAdmin = (Number(roleId) === 6) || (typeof roleName === "string" && roleName.toLowerCase() === "super admin");

        const { startDate, endDate, restaurantId, search, page = 1, limit = 20 } = req.query;

        let orderWhere = isSuperAdmin ? "1=1" : "o.user_id = ?";
        let effectiveParams = isSuperAdmin ? [] : [userId];

        if (isSuperAdmin && restaurantId && restaurantId !== "all") {
            orderWhere = "o.user_id = ?";
            effectiveParams = [restaurantId];
        }

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const startStr = startDate || todayStr;
        const endStr = endDate || startStr;

        const conn = await db.getConnection();
        try {
            // Summary Stats: Gross Sales, Refunds, Net
            const statsQuery = `
                SELECT
                    SUM(CASE WHEN o.order_status NOT IN (2,5,6) THEN o.grand_total ELSE 0 END) as gross_intake,
                    SUM(CASE WHEN o.order_status IN (2,5,6) THEN o.grand_total ELSE 0 END) as refund_outflow,
                    COUNT(DISTINCT CASE WHEN o.order_status NOT IN (2,5,6) THEN o.order_number END) as total_sales_count,
                    COUNT(DISTINCT CASE WHEN o.order_status IN (2,5,6) THEN o.order_number END) as total_refund_count
                FROM orders o
                WHERE ${orderWhere}
                  AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
            `;
            const [[summary]] = await conn.query(statsQuery, [...effectiveParams, startStr, endStr]);

            const grossIntake = Number(summary?.gross_intake || 0);
            const refundOutflow = Number(summary?.refund_outflow || 0);
            const netLiquidity = grossIntake - refundOutflow;

            // Transaction list (grouped by order_number)
            let searchWhere = "";
            const searchParams = [];
            if (search) {
                searchWhere = " AND (o.order_number LIKE ? OR c.full_name LIKE ?)";
                searchParams.push(`%${search}%`, `%${search}%`);
            }

            const offset = (Number(page) - 1) * Number(limit);

            const txQuery = `
                SELECT
                    o.order_number,
                    MAX(c.full_name) as customer_name,
                    MAX(o.created_at) as created_at,
                    SUM(o.grand_total) as amount,
                    MAX(o.order_status) as order_status,
                    MAX(o.payment_mode) as payment_mode
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                WHERE ${orderWhere}
                  AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
                  ${searchWhere}
                GROUP BY o.order_number
                ORDER BY MAX(o.created_at) DESC
                LIMIT ? OFFSET ?
            `;

            const txParams = [...effectiveParams, startStr, endStr, ...searchParams, Number(limit), offset];
            const [transactions] = await conn.query(txQuery, txParams);

            // Count total for pagination
            const countQuery = `
                SELECT COUNT(DISTINCT o.order_number) as total
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                WHERE ${orderWhere}
                  AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
                  ${searchWhere}
            `;
            const [[countRes]] = await conn.query(countQuery, [...effectiveParams, startStr, endStr, ...searchParams]);
            const totalCount = countRes?.total || 0;

            return res.json({
                status: 1,
                data: {
                    gross_intake: grossIntake,
                    refund_outflow: refundOutflow,
                    net_liquidity: netLiquidity,
                    total_sales_count: summary?.total_sales_count || 0,
                    total_refund_count: summary?.total_refund_count || 0,
                    transactions,
                    pagination: {
                        total: totalCount,
                        page: Number(page),
                        limit: Number(limit),
                        totalPages: Math.ceil(totalCount / Number(limit))
                    }
                }
            });
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error("Finance summary error:", error);
        return res.status(500).json({ status: 0, message: "Server error" });
    }
};

export const getRestaurantsList = async (req, res) => {
    try {
        const query = `SELECT user_id, restaurant_name FROM restaurant_details ORDER BY restaurant_name ASC`;
        const conn = await db.getConnection();
        const [rows] = await conn.query(query);
        conn.release();
        return res.json({ status: 1, data: rows });
    } catch (error) {
        return res.status(500).json({ status: 0, message: "Server error" });
    }
};

export const refundOrder = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const { order_number } = req.body;
        if (!order_number) {
            return res.status(400).json({ status: 0, message: "Order number is required" });
        }

        await conn.beginTransaction();

        // 1. Fetch Order Details
        const [orders] = await conn.query(
            "SELECT id, grand_total, payment_request_id, customer_id, wallet_amount, loyalty_amount, order_status, payment_mode FROM orders WHERE order_number = ?",
            [order_number]
        );

        if (!orders.length) {
            await conn.rollback();
            return res.status(404).json({ status: 0, message: "Order not found" });
        }

        const firstRow = orders[0];
        const currentStatus = Number(firstRow.order_status);

        // If status is already refunded (6), don't process
        if (currentStatus === 6) {
            await conn.rollback();
            return res.status(400).json({ status: 0, message: "Order is already refunded" });
        }

        const totalPaidAmount = orders.reduce((sum, o) => sum + Number(o.grand_total), 0);
        const pi_id = firstRow.payment_request_id;
        const paymentMode = Number(firstRow.payment_mode); // Assume 1 is Online

        // 2. Process Stripe Refund if applicable
        let stripeRefundId = null;
        if (paymentMode === 1 && pi_id && totalPaidAmount > 0) {
            const [settings] = await conn.query("SELECT stripe_secret_key FROM settings LIMIT 1");
            const secretKey = settings[0]?.stripe_secret_key;

            if (!secretKey) {
                await conn.rollback();
                return res.status(500).json({ status: 0, message: "Stripe is not configured in settings." });
            }

            const stripe = new Stripe(secretKey);
            try {
                const refund = await stripe.refunds.create({
                    payment_intent: pi_id,
                    amount: Math.round(totalPaidAmount * 100), // convert to pence
                });
                stripeRefundId = refund.id;
            } catch (stripeErr) {
                console.error("Stripe refund error:", stripeErr);
                await conn.rollback();
                return res.status(500).json({ status: 0, message: `Stripe Refund Error: ${stripeErr.message}` });
            }
        }

        // 3. Internal Refund (Wallet/Loyalty restored to customer)
        const totalWalletLoyalty = orders.reduce((sum, o) => sum + (Number(o.wallet_amount) + Number(o.loyalty_amount)), 0);
        if (totalWalletLoyalty > 0) {
            await conn.query(
                "UPDATE customer_wallets SET balance = balance + ? WHERE customer_id = ?",
                [totalWalletLoyalty, firstRow.customer_id]
            );

            const [[wRow]] = await conn.query("SELECT balance FROM customer_wallets WHERE customer_id = ?", [firstRow.customer_id]);

            await conn.query(
                `INSERT INTO wallet_transactions
                 (customer_id, transaction_type, amount, balance_after, source, description, created_at)
                 VALUES (?, 'CREDIT', ?, ?, 'REFUND', ?, NOW())`,
                [
                    firstRow.customer_id,
                    totalWalletLoyalty,
                    wRow?.balance || 0,
                    `Full refund for order ${order_number}`
                ]
            );
        }

        // 4. Record the refund in order_refunds table
        await conn.query(
            `INSERT INTO order_refunds 
             (order_number, payment_intent_id, refund_id, amount, status) 
             VALUES (?, ?, ?, ?, ?)`,
            [order_number, pi_id || null, stripeRefundId || null, totalPaidAmount + totalWalletLoyalty, 'processed']
        );

        // 5. Update Order Status to 6 (Refunded)
        await conn.query("UPDATE orders SET order_status = 6 WHERE order_number = ?", [order_number]);

        // 6. Void any loyalty earnings for this order
        await conn.query(
            "DELETE FROM loyalty_earnings WHERE order_id IN (SELECT id FROM orders WHERE order_number = ?)",
            [order_number]
        );

        await conn.commit();
        return res.json({ status: 1, message: "Order refunded successfully" });

    } catch (err) {
        if (conn) await conn.rollback();
        console.error("Refund implementation error:", err);
        return res.status(500).json({ status: 0, message: "Critical error during refund execution." });
    } finally {
        if (conn) conn.release();
    }
};
