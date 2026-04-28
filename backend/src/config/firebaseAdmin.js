// backend/src/config/firebaseAdmin.js
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load JSON manually
const serviceAccountPath = path.join(__dirname, "../../firebaseServiceAccount.json");
let adminInstance = null;

try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    adminInstance = admin;
    console.log("✅ Firebase Admin initialized");
  } else {
    console.warn("⚠️ Firebase service account file NOT found. Notifications will be disabled.");
  }
} catch (error) {
  console.error("❌ Firebase initialization failed:", error.message);
}

export default adminInstance;
