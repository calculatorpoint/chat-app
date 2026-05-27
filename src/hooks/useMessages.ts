import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, writeBatch, doc, arrayUnion } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '@/services/firebase';

export function useMessages(chatId: string | undefined) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId || !auth.currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      setLoading(false);

      // Mark unread messages as read
      const unreadMyMsgs = snapshot.docs.filter(d => {
        const data = d.data();
        if (data.senderId === auth.currentUser?.uid) return false;
        
        // If it's a group, checking readBy array
        if (data.readBy && data.readBy.includes(auth.currentUser?.uid)) return false;
        
        return data.status !== 'read';
      });

      if (unreadMyMsgs.length > 0) {
        const batch = writeBatch(db);
        unreadMyMsgs.forEach(d => {
           batch.update(d.ref, { 
             status: 'read',
             readBy: arrayUnion(auth.currentUser?.uid)
           });
        });
        batch.commit().catch(e => console.error("Failed to mark as read", e));
      }

    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId]);

  return { messages, loading };
}
