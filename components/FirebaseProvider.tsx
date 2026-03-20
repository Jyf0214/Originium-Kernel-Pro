'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '@/firebase';

interface FirebaseContextType {
  user: User | null;
  userRole: string | null;
  loading: boolean;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  userRole: null,
  loading: true,
});

export const useFirebase = () => useContext(FirebaseContext);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          } else {
            const isFirstUser = currentUser.email === 'yifan0886@gmail.com' && currentUser.emailVerified;
            const newRole = isFirstUser ? 'admin' : 'user';
            
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              name: currentUser.displayName || 'Anonymous',
              role: newRole,
              photoURL: currentUser.photoURL || '',
              createdAt: new Date().toISOString()
            });
            setUserRole(newRole);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'users');
        }
      } else {
        setUserRole(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <FirebaseContext.Provider value={{ user, userRole, loading }}>
      {!loading && children}
    </FirebaseContext.Provider>
  );
}
