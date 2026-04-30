const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Triggered when a new notification is added to Firestore (v2).
 */
exports.sendpushnotification = onDocumentCreated('notifications/{notificationId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;
    
    const data = snapshot.data();
    
    // Skip if it's a scheduled notification
    if (data.status === 'scheduled') {
        console.log('Notification is scheduled, skipping push.');
        return null;
    }

    const staffId = data.staff_id;
    const fcmToken = data.fcm_token;

    if (!fcmToken) {
        console.log(`No FCM token found for staff ${staffId}, cannot send push.`);
        return null;
    }

    const message = {
        notification: {
            title: data.title,
            body: data.body,
        },
        data: {
            notificationId: event.params.notificationId,
            type: data.type || 'announcement',
            priority: data.priority || 'normal',
        },
        token: fcmToken,
        android: {
            priority: data.priority === 'urgent' ? 'high' : 'normal',
            notification: {
                channelId: 'default',
                priority: 'max',
            }
        },
        apns: {
            payload: {
                aps: {
                    alert: {
                        title: data.title,
                        body: data.body,
                    },
                    sound: 'default',
                    badge: 1,
                }
            }
        }
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent push notification (v2):', response);
        return snapshot.ref.update({ push_sent_at: admin.firestore.FieldValue.serverTimestamp() });
    } catch (error) {
        console.error('Error sending push notification (v2):', error);
        return null;
    }
});

/**
 * Scheduled Function: Runs every hour to clean up forgotten clock-outs
 * If a session is open for > 24 hours, it auto-closes it and notifies Admin/Staff.
 */
exports.cleanupOldAttendance = onSchedule("every 1 hours", async (event) => {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
  
  const attendanceRef = admin.firestore().collection("attendance");
  const snapshot = await attendanceRef
    .where("clock_out", "==", null)
    .where("clock_in", "<", twentyFourHoursAgo)
    .get();

  if (snapshot.empty) {
    console.log("[Cleanup] No old attendance records found.");
    return null;
  }

  const batch = admin.firestore().batch();
  const notificationsRef = admin.firestore().collection("notifications");

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const staffId = data.staff_id;
    const staffName = data.staff_name || "Unknown Staff";
    
    // 1. Auto Clock-out: Set to exactly 24 hours after they started (to unlock the app)
    const clockInDate = data.clock_in.toDate();
    const forcedClockOutDate = new Date(clockInDate.getTime() + (24 * 60 * 60 * 1000));
    
    batch.update(docSnap.ref, {
      clock_out: admin.firestore.Timestamp.fromDate(forcedClockOutDate),
      total_minutes: 1440, // Exactly 24 hours
      auto_clocked_out: true,
      notes: "System: Auto clock-out (Forgot to logout). Recorded 24h limit reached."
    });

    // 2. Notify Staff Member
    batch.set(notificationsRef.doc(), {
      title: "Auto Clock-Out Triggered",
      body: "Your shift was automatically closed because you forgot to clock out yesterday.",
      staff_id: staffId,
      staff_name: staffName,
      type: "alert",
      priority: "high",
      status: "pending",
      sent_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3. Notify Admin Dashboard
    // We'll create a special notification that shows up in the dashboard
    batch.set(notificationsRef.doc(), {
      title: "Staff Attendance Alert",
      body: `FAIL: ${staffName} did not clock out on ${clockInDate.toLocaleDateString()}. System performed auto clock-out.`,
      staff_id: "admin_dashboard_alert", // Special ID for dashboard tracking if needed
      staff_name: "System Monitor",
      type: "alert",
      priority: "urgent",
      status: "pending",
      sent_at: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  await batch.commit();
  console.log(`[Cleanup] Successfully auto-closed ${snapshot.size} attendance records.`);
  return null;
});
