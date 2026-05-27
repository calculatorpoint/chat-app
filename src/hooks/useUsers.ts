import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, limit, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/services/firebase';
import { useAuthStore } from '@/store/useAuthStore';

export function useUsers() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    // First subscribe to my user doc to get blocked lists
    let allUsers: any[] = [];
    let blockedUsers: string[] = [];
    
    const applyFilter = () => {
       setUsers(allUsers.filter(u => u.id !== user.uid && !blockedUsers.includes(u.id)));
    };

    const unsubMyUser = onSnapshot(doc(db, "users", user.uid), (d) => {
       if (d.exists()) {
          blockedUsers = d.data().blockedUsers || [];
          applyFilter();
       }
    });

    const q = query(collection(db, 'users'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      allUsers = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }));
      applyFilter();
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
      setLoading(false);
    });
    
    return () => {
       unsubMyUser();
       unsubscribe();
    };
  }, [user]);

  return { users, loading };
}
