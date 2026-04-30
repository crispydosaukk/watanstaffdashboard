import { db } from './lib/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

async function checkSpecificStaff() {
  const targetUid = 'd0ViJAVpHtWATryLq1IenE7zEfE3';
  console.log(`Checking Firestore for UID: ${targetUid}`);
  
  const staffRef = doc(db, 'staff', targetUid);
  const staffSnap = await getDoc(staffRef);
  
  if (staffSnap.exists()) {
    console.log('Staff Found:', JSON.stringify(staffSnap.data(), null, 2));
  } else {
    console.log('Staff NOT FOUND in "staff" collection.');
    
    // Check if it exists in "users" collection (Admins)
    const userRef = doc(db, 'users', targetUid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      console.log('User found in "users" collection (Admin/Manager).');
    } else {
      console.log('User NOT FOUND in "users" collection either.');
    }
  }
}

checkSpecificStaff();
