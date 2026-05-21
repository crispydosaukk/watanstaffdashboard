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
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Only authenticated users can call this function.");
  }

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
      notificationId: notificationId || "",
      type: type || 'announcement',
    },
    android: {
      priority: (priority === 'urgent' || priority === 'high') ? 'high' : 'normal',
      notification: {
        sound: 'default',
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
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
