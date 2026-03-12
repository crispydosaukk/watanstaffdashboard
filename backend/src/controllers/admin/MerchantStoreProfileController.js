import { 
  createMerchantStoreProfile, 
  getAllMerchantStoreProfiles, 
  updateMerchantStatus,
  getSuperAdminIds,
  createNotification,
  getProfileByUserId,
  updateMerchantProfile,
  markMerchantNotificationsAsRead 
} from "../../models/MerchantStoreProfileModel.js";
import { sendNotification } from "../../utils/sendNotification.js";

export async function store(req, res) {
  try {
    const payload = req.body;
    const userId = req.user?.id;
    
    console.log("Submit Profile - User ID:", userId);

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    if (!payload.first_name || !payload.surname || !payload.email || !payload.store_name) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    payload.user_id = userId;

    const insertId = await createMerchantStoreProfile(payload);
    const refId = `#ZBR-${insertId.toString().padStart(4, '0')}`;

    // Send notification to Super Admins
    const adminIds = await getSuperAdminIds();
    for (const adminId of adminIds) {
      try {
        // DB Notification (Legacy fallback)
        await createNotification(
          adminId, 
          'admin', 
          'New Restaurant Registration', 
          `A new registration request has been submitted by ${payload.first_name} ${payload.surname} for ${payload.store_name}.`,
          refId
        );

        // Firebase Push Notification
        await sendNotification({
          userType: 'admin',
          userId: adminId,
          title: '🏪 New Merchant Onboarding',
          body: `${payload.store_name} has submitted a new registration request (${refId}).`,
          data: { 
            type: 'MERCHANT_REGISTRATION', 
            id: String(insertId),
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            sound: 'notification_sound.mp3'
          }
        });
      } catch (err) {
        console.error(`Notification failed for Admin ${adminId}:`, err.message);
      }
    }

    return res.json({ success: true, message: "Profile registered successfully", id: insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: "A registration request has already been submitted for this account." });
    }
    console.error("Error storing merchant profile:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function index(req, res) {
  try {
    const profiles = await getAllMerchantStoreProfiles();
    return res.json({ success: true, data: profiles });
  } catch (err) {
    console.error("Error fetching merchant profiles:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    if (status === undefined) {
      return res.status(400).json({ success: false, message: "Status is required" });
    }

    await updateMerchantStatus(id, status, rejection_reason);

    // Mark related notifications as read
    const refId = `#ZBR-${id.toString().padStart(4, '0')}`;
    await markMerchantNotificationsAsRead(refId);

    return res.json({ success: true, message: "Status updated successfully" });
  } catch (err) {
    console.error("Error updating merchant status:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function updateMyProfile(req, res) {
  try {
    const userId = req.user.id;
    const payload = req.body;

    if (!payload.first_name || !payload.surname || !payload.email || !payload.store_name) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    await updateMerchantProfile(userId, payload);

    // Notify Super Admins of the update/resubmission
    const adminIds = await getSuperAdminIds();
    for (const adminId of adminIds) {
      try {
        await sendNotification({
          userType: 'admin',
          userId: adminId,
          title: '📝 Merchant Profile Updated',
          body: `${payload.store_name} has updated their registration details.`,
          data: { 
            type: 'MERCHANT_UPDATE', 
            user_id: String(userId),
            sound: 'notification_sound.mp3'
          }
        });
      } catch (err) {
        console.error(`Firebase notification failed for Admin ${adminId}:`, err.message);
      }
    }

    return res.json({ success: true, message: "Profile updated successfully" });
  } catch (err) {
    console.error("Error updating my profile:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}

export async function getMyProfile(req, res) {
  try {
    const userId = req.user.id;
    const profile = await getProfileByUserId(userId);
    return res.json({ success: true, data: profile });
  } catch (err) {
    console.error("Error fetching my profile:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
