const nodemailer = require("nodemailer");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

/**
 * Updates a user's email and/or password in Firebase Authentication.
 * Requires the caller to be authenticated.
 */
exports.updateUserCredentials = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Only authenticated users can call this function."
    );
  }

  const { uid, email, password } = data;

  if (!uid) {
    throw new functions.https.HttpsError("invalid-argument", "The 'uid' must be provided.");
  }

  try {
    const updatePayload = {};
    if (email) updatePayload.email = email;
    if (password) updatePayload.password = password;

    await admin.auth().updateUser(uid, updatePayload);

    return { success: true, message: "Successfully updated user credentials." };
  } catch (error) {
    console.error("Error updating user:", error);
    throw new functions.https.HttpsError("invalid-argument", error.message);
  }
});

/**
 * Deletes a user from Firebase Authentication.
 * Requires the caller to be authenticated.
 */
exports.deleteAuthUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Only authenticated users can call this function."
    );
  }

  const { uid } = data;

  if (!uid) {
    throw new functions.https.HttpsError("invalid-argument", "The 'uid' must be provided.");
  }

  try {
    await admin.auth().deleteUser(uid);
    return { success: true, message: "Successfully deleted user from Auth." };
  } catch (error) {
    console.error("Error deleting user from Auth:", error);
    // If user not found in Auth, that's fine - just return success
    if (error.code === 'auth/user-not-found') {
      return { success: true, message: "User was already removed from Auth." };
    }
    throw new functions.https.HttpsError("invalid-argument", error.message);
  }
});

/**
 * Restored: Sends a push notification via FCM.
 */
exports.sendpushnotification = functions.https.onCall(async (data, context) => {
  // if (!context.auth) {
  //   throw new functions.https.HttpsError("unauthenticated", "Only authenticated users can call this function.");
  // }

  const { fcm_token, title, body, priority, type, notificationId } = data;

  if (!fcm_token) {
    throw new functions.https.HttpsError("invalid-argument", "The 'fcm_token' must be provided.");
  }

  const message = {
    token: fcm_token,
    notification: {
      title: title || "Notification",
      body: body || "",
    },
    data: {
      notificationId: String(notificationId || ""),
      type: String(type || 'announcement'),
      priority: String(priority || "normal"),
    },
    android: {
      priority: "high",
      notification: {
        channelId: "high_importance_channel",
        sound: "default",
        defaultSound: true,
        priority: "max",
        visibility: "public"
      }
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1
        }
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error("Error sending push notification:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});


exports.sendEmailReport = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Unauthorized");

  const { to, subject, htmlBody, attachmentUrl, attachmentName } = data;
  if (!to || !subject || !htmlBody) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required email fields");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: functions.config().email?.user || process.env.EMAIL_USER || "your-email@gmail.com",
      pass: functions.config().email?.pass || process.env.EMAIL_PASS || "your-app-password"
    }
  });

  const mailOptions = {
    from: '"Watan Staff Dashboard" <noreply@watan.com>',
    to: to,
    subject: subject,
    html: htmlBody,
    attachments: attachmentUrl ? [
      {
        filename: attachmentName || "Report.pdf",
        path: attachmentUrl
      }
    ] : []
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    console.error("Error sending email:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Cron Job: Processes scheduled and recurring notifications every minute.
 */
exports.processScheduledNotifications = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
  const now = admin.firestore.Timestamp.now();
  
  try {
    const notificationsRef = admin.firestore().collection("notifications");
    const snapshot = await notificationsRef
      .where("status", "==", "scheduled")
      .where("scheduled_for", "<=", now)
      .get();

    if (snapshot.empty) {
      console.log("No scheduled notifications to process.");
      return null;
    }

    const batch = admin.firestore().batch();
    const messagingPromises = [];

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      
      // 1. Prepare push notification
      if (data.fcm_token) {
        const message = {
          token: data.fcm_token,
          notification: {
            title: data.title || "Notification",
            body: data.body || "",
          },
          data: {
            notificationId: String(docSnap.id),
            type: String(data.type || 'announcement'),
            priority: String(data.priority || "normal"),
          },
          android: {
            priority: "high",
            notification: {
              channelId: "high_importance_channel",
              sound: "default",
              defaultSound: true,
              priority: "max",
              visibility: "public"
            }
          },
          apns: { payload: { aps: { sound: "default", badge: 1 } } }
        };
        messagingPromises.push(admin.messaging().send(message).catch(err => console.error("FCM Send Error:", err)));
      }

      // 2. Handle DB updates for recurrence vs one-time
      if (data.recurring === "daily" || data.recurring === "weekly") {
        // Calculate next run time
        const currentScheduled = data.scheduled_for.toDate();
        const nextScheduled = new Date(currentScheduled);
        
        if (data.recurring === "daily") {
          nextScheduled.setDate(nextScheduled.getDate() + 1);
        } else if (data.recurring === "weekly") {
          nextScheduled.setDate(nextScheduled.getDate() + 7);
        }
        
        // Ensure the next scheduled time is actually in the future (if the cron fell behind)
        while(nextScheduled <= new Date()) {
           if (data.recurring === "daily") nextScheduled.setDate(nextScheduled.getDate() + 1);
           if (data.recurring === "weekly") nextScheduled.setDate(nextScheduled.getDate() + 7);
        }

        // Update original to next date (keeps it hidden in app but scheduled)
        batch.update(docSnap.ref, {
          scheduled_for: admin.firestore.Timestamp.fromDate(nextScheduled),
          last_sent_at: now
        });

        // Create a new notification instance for the user's inbox
        const newNotifRef = notificationsRef.doc();
        batch.set(newNotifRef, {
          ...data,
          status: "pending",
          scheduled_for: null, // No longer scheduled, it's an actual delivery
          recurring: "none",
          sent_at: now,
          is_recurring_instance: true,
          parent_schedule_id: docSnap.id
        });

      } else {
        // One-time scheduled notification: just update status so it shows up in app inbox
        batch.update(docSnap.ref, {
          status: "pending",
          sent_at: now
        });
      }
    });

    // Send FCM push notifications concurrently
    if (messagingPromises.length > 0) {
      await Promise.all(messagingPromises);
    }
    
    // Commit all database updates
    await batch.commit();

    console.log(`Successfully processed ${snapshot.size} scheduled notifications.`);
    return null;
  } catch (error) {
    console.error("Error processing scheduled notifications:", error);
    return null;
  }
});
