
import { db } from './lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

async function debugNotifications() {
  const q = query(collection(db, "notifications"), orderBy("sent_at", "desc"), limit(1));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    console.log("Latest Notification Data:", JSON.stringify(doc.data(), null, 2));
  } else {
    console.log("No notifications found.");
  }
}

debugNotifications();
