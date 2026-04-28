import * as AttendanceModel from "../../models/AttendanceModel.js";
import * as StaffModel from "../../models/StaffModel.js";

/**
 * POST /api/staff/clock-in
 * Staff clocks in.  Token must carry { id, type:"staff", restaurant_id }
 */
export const handleClockIn = async (req, res) => {
  try {
    const staffId = req.user.id;
    const restaurantId = req.user.restaurant_id;

    // 1. Proactively close any sessions from previous days
    await AttendanceModel.autoCloseStaleSessions(staffId);

    // 2. Double check for any other active session
    const active = await AttendanceModel.getActiveSession(staffId);
    if (active) {
      return res.json({
        status: 1,
        alreadyClockedIn: true,
        message: "Already clocked in",
        data: active,
      });
    }

    const sessionId = await AttendanceModel.clockIn(staffId, restaurantId);
    const session = await AttendanceModel.getSessionById(sessionId);

    return res.json({ status: 1, message: "Clocked in successfully", data: session });
  } catch (err) {
    console.error("Clock-in error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

/**
 * POST /api/staff/clock-out
 * Staff clocks out from active session.
 */
export const handleClockOut = async (req, res) => {
  try {
    const staffId = req.user.id;
    const active = await AttendanceModel.getActiveSession(staffId);

    if (!active) {
      return res.status(400).json({ status: 0, message: "No active session found" });
    }

    const session = await AttendanceModel.clockOut(active.id);
    return res.json({ status: 1, message: "Clocked out successfully", data: session });
  } catch (err) {
    console.error("Clock-out error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

/**
 * GET /api/staff/session-status
 * Returns current active session or null.
 */
export const getSessionStatus = async (req, res) => {
  try {
    const staffId = req.user.id;
    
    // Proactively close stale sessions so UI is accurate
    await AttendanceModel.autoCloseStaleSessions(staffId);

    const active = await AttendanceModel.getActiveSession(staffId);
    const todayLog = await AttendanceModel.getTodayLog(staffId);
    const yesterdayLog = await AttendanceModel.getYesterdayLog(staffId);

    return res.json({
      status: 1,
      data: {
        activeSession: active || null,
        isClockedIn: !!active,
        todayLog,
        yesterdayLog,
      },
    });
  } catch (err) {
    console.error("Session status error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

/**
 * GET /api/admin/staff/:staffId/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Dashboard: view attendance records for a specific staff member.
 * Accessible by admin only (no staff-type check needed in admin routes).
 */
export const getStaffAttendance = async (req, res) => {
  try {
    const { staffId } = req.params;

    // Default: current week Mon–Sun
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const toISO = (d) => d.toISOString().slice(0, 10);
    const from = req.query.from || toISO(monday);
    const to = req.query.to || toISO(sunday);

    const records = await AttendanceModel.getAttendanceByStaff(staffId, from, to);
    const staffInfo = await StaffModel.getStaffById(staffId);

    return res.json({
      status: 1,
      data: {
        staff: staffInfo,
        from,
        to,
        records,
      },
    });
  } catch (err) {
    console.error("Get attendance error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};

/**
 * PUT /api/staff/attendance/:id
 * Admin updates an attendance record.
 */
export const handleUpdateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { clock_in, clock_out, notes } = req.body;

    if (!clock_in || !clock_out) {
      return res.status(400).json({ status: 0, message: "Clock-in and Clock-out times are required." });
    }

    const updated = await AttendanceModel.updateAttendance(id, { clock_in, clock_out, notes });

    return res.json({
      status: 1,
      message: "Attendance record updated successfully",
      data: updated
    });
  } catch (err) {
    console.error("Update attendance error:", err);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};
