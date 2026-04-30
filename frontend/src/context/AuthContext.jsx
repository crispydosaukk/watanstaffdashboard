import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [perms, setPerms] = useState([]);


  useEffect(() => {
    // Set persistence to local
    setPersistence(auth, browserLocalPersistence);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        try {
          let data = null;
          let perms = [];

          // 1. Try 'users' collection
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            data = userDoc.data();
          } else {
            // 2. Try 'staff' collection
            const staffDoc = await getDoc(doc(db, 'staff', firebaseUser.uid));
            if (staffDoc.exists()) {
              data = staffDoc.data();
            }
          }

          // 3. Handle data if found
          if (data) {
            if (data.role_id) {
              const roleDoc = await getDoc(doc(db, 'roles', String(data.role_id)));
              if (roleDoc.exists()) {
                perms = roleDoc.data().permission_ids || roleDoc.data().permissions || [];
              }
            }
          } else {
            // 4. Fallback for new Auth users not in Firestore yet
            data = { role_title: 'Super Admin', role_id: 6 };
            perms = ["dashboard", "staff_management", "all_staff", "restaurant", "access"];
          }

          // 5. Finalize state and localStorage
          localStorage.setItem('user', JSON.stringify({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            ...data
          }));
          localStorage.setItem('perms', JSON.stringify(perms));
          
          setPerms(perms);
          setUserData(data);

        } catch (err) {
          console.error("Firestore fetch error:", err);
          const fallbackData = { role_title: 'Super Admin', role_id: 6 };
          const fallbackPerms = ["dashboard", "staff_management", "all_staff", "restaurant", "access"];
          
          localStorage.setItem('user', JSON.stringify({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            ...fallbackData
          }));
          localStorage.setItem('perms', JSON.stringify(fallbackPerms));
          
          setPerms(fallbackPerms);
          setUserData(fallbackData);
        }
      } else {
        setUser(null);
        setUserData(null);
        setPerms([]);
        localStorage.removeItem('user');
        localStorage.removeItem('perms');
        localStorage.removeItem('token');
      }
      setLoading(false);
    });


    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userData, perms, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
