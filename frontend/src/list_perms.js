import { db } from './lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function listPermissions() {
  console.log("Fetching permissions...");
  const snap = await getDocs(collection(db, "permissions"));
  snap.forEach(doc => {
    console.log(`Permission: ${doc.id} -> ${JSON.stringify(doc.data())}`);
  });
}

listPermissions();
