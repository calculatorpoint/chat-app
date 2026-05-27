import { useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuthStore } from '@/store/useAuthStore';

export function useNotifications() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user || !('Notification' in window)) return;

    // Listen for incoming calls
    const callsQuery = query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'calling')
    );

    const unsubCalls = onSnapshot(callsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          if (Notification.permission === 'granted' && document.hidden) {
            new Notification('Incoming Call', {
              body: 'You have a new incoming call.',
            });
          }
        }
      });
    });

    // Listen for incoming chats updates
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    let initialLoad = true;
    const unsubChats = onSnapshot(chatsQuery, (snapshot) => {
      if (initialLoad) {
        initialLoad = false;
        return;
      }
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
           const data = change.doc.data();
           if (data.lastMessageSenderId && data.lastMessageSenderId !== user.uid && document.hidden) {
              if (Notification.permission === 'granted') {
                 new Notification(data.groupName || 'New Message', {
                   body: data.lastMessageText || 'Sent a message',
                 });
              }
           }
        }
      });
    });

    return () => {
      unsubCalls();
      unsubChats();
    };
  }, [user]);
}
