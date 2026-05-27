import { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuthStore } from '@/store/useAuthStore';
import { useCallStore } from '@/store/useCallStore';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { Avatar } from '@/components/ui/Avatar';
import { RingtonePlayer } from '@/utils/ringtone';

export function CallManager() {
  const { user } = useAuthStore();
  const { callId, isIncoming, status, remoteUserId, setCallState, resetCall } = useCallStore();
  const navigate = useNavigate();
  const [callerName, setCallerName] = useState('Incoming Call...');
  const [callerPhoto, setCallerPhoto] = useState<string | undefined>(undefined);
  const [withVideo, setWithVideo] = useState(true);
  const ringtonePlayerRef = useRef<RingtonePlayer | null>(null);

  useEffect(() => {
    if (!ringtonePlayerRef.current) {
      ringtonePlayerRef.current = new RingtonePlayer();
    }
    return () => {
      ringtonePlayerRef.current?.stop();
    };
  }, []);

  // Effect to listen for incoming calls globally
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        if (change.type === 'added' && data.status === 'calling') {
          // Ignore calls older than 60 seconds
          if (data.createdAt && Date.now() - data.createdAt > 60000) return;
          
          setWithVideo(data.isVideo ?? !!data.offer?.sdp?.includes('m=video'));
          setCallState({
            callId: change.doc.id,
            remoteUserId: data.callerId,
            isIncoming: true,
            status: 'ringing'
          });
        }
        if (change.type === 'modified' && data.status === 'ended') {
          if (isIncoming && status === 'ringing') {
             resetCall();
          }
        }
      });
    });

    return () => unsubscribe();
  }, [user, setCallState, isIncoming, status, resetCall]);

  // Effect to play/stop sound base on ringing status
  useEffect(() => {
    if (isIncoming && status === 'ringing') {
      ringtonePlayerRef.current?.start('incoming');
    } else {
      ringtonePlayerRef.current?.stop();
    }
  }, [isIncoming, status]);

  // Effect to fetch caller name when ringing
  useEffect(() => {
    if (remoteUserId && status === 'ringing') {
        getDoc(doc(db, 'users', remoteUserId)).then(doc => {
            if (doc.exists()) {
                setCallerName(doc.data().displayName);
                setCallerPhoto(doc.data().photoURL);
            }
        });
    }
  }, [remoteUserId, status]);

  const handleAccept = () => {
    navigate(`/call/${callId}?isCaller=false&video=${withVideo}`);
    setCallState({ status: 'connected' }); // Optimistic transition
  };

  const handleDecline = async () => {
    if (callId) {
      try {
        await updateDoc(doc(db, 'calls', callId), { status: 'ended' });
      } catch (e) {}
    }
    resetCall();
  };

  return (
    <AnimatePresence>
      {isIncoming && status === 'ringing' && (
        <motion.div 
          initial={{ opacity: 0, y: -100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed inset-x-0 top-0 z-[100] p-4 md:p-6 flex justify-center pointer-events-none"
        >
          <div className="bg-slate-950/80 border border-slate-700 p-4 md:p-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-6 pointer-events-auto backdrop-blur-2xl">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-30" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
                <Avatar src={callerPhoto} fallback={callerName} size="lg" className="border-2 border-indigo-500/50 shadow-lg relative z-10" />
              </div>
              <div className="pr-2 md:pr-6 border-r border-slate-800 flex flex-col justify-center">
                <p className="text-indigo-400 text-xs font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                  Incoming {withVideo ? 'Video' : 'Audio'} Call
                </p>
                <h2 className="text-xl font-bold text-white leading-tight truncate max-w-[150px] md:max-w-xs">{callerName}</h2>
              </div>
            </div>
            
            <div className="flex gap-3 shrink-0">
              <Button onClick={handleDecline} variant="danger" className="rounded-full w-12 h-12 md:w-14 md:h-14 p-0 flex items-center justify-center shadow-lg shadow-rose-500/20 hover:scale-110 transition-transform">
                <PhoneOff size={22} className="text-white" />
              </Button>
              <Button onClick={handleAccept} className="rounded-full w-12 h-12 md:w-14 md:h-14 p-0 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 hover:scale-110 transition-transform border-0">
                {withVideo ? <Video size={22} className="text-white" /> : <Phone size={22} className="text-white" />}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
