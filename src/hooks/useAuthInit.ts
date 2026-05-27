import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '@/services/firebase';
import { useAuthStore } from '@/store/useAuthStore';

export function useAuthInit() {
  const { setUser, setLoading, setIsAdmin, setAdminRole, setSystemSettings, user } = useAuthStore();

  useEffect(() => {
    // Listen to system settings globally
    const unsubSettings = onSnapshot(doc(db, 'settings', 'system'), (docSnap) => {
      if(docSnap.exists()) {
        setSystemSettings(docSnap.data());
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
             const data = userDoc.data();
             if (data.isBanned) {
               alert("Your account has been banned. Please contact the administrator.");
               await auth.signOut();
               return;
             }
             
             // Auto-upgrade for testing
             let isAdmin = !!data.isAdmin;
             let adminRole = data.adminRole || (data.isAdmin ? 'super_admin' : null);
             if (firebaseUser.email === 'calculatorpoint.com@gmail.com' && !isAdmin) {
               isAdmin = true;
               adminRole = 'super_admin';
               await updateDoc(userDocRef, { isAdmin: true, adminRole: 'super_admin' });
             }

             setIsAdmin(isAdmin);
             setAdminRole(adminRole);
             await updateDoc(userDocRef, { isOnline: true, lastSeen: Date.now() });
          } else {
            // New user via Google Sign-In or just created
            const isFirstAdmin = firebaseUser.email === 'calculatorpoint.com@gmail.com';
            const userData = {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || 'New User',
              photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
              status: 'Hey there! I am using NovaChat.',
              isOnline: true,
              lastSeen: Date.now(),
              isAdmin: isFirstAdmin,
              adminRole: isFirstAdmin ? 'super_admin' : null,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            await setDoc(userDocRef, userData);
            setIsAdmin(isFirstAdmin);
            setAdminRole(isFirstAdmin ? 'super_admin' : null);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setAdminRole(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      unsubSettings();
    };
  }, [setUser, setLoading, setIsAdmin, setAdminRole, setSystemSettings]);

  // Handle tab visibility / window focus for online presence
  useEffect(() => {
    if (!auth.currentUser) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
         updateDoc(doc(db, 'users', auth.currentUser!.uid), {
             isOnline: false,
             lastSeen: Date.now()
         }).catch(console.error);
      } else {
         updateDoc(doc(db, 'users', auth.currentUser!.uid), {
             isOnline: true,
             lastSeen: Date.now()
         }).catch(console.error);
      }
    };

    const handleBeforeUnload = () => {
      // Best effort synchronous write attempt (sometimes fails, but worth trying)
      updateDoc(doc(db, 'users', auth.currentUser!.uid), {
          isOnline: false,
          lastSeen: Date.now()
      }).catch(console.error);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user]); // re-run if `user` state changes
}
