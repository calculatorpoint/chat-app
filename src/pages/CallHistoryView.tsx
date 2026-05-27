import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video, Clock } from "lucide-react";
import { formatTimeIST } from "@/utils/date";
import { Avatar } from "@/components/ui/Avatar";
import { useNavigate } from "react-router-dom";

export default function CallHistoryView() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [calls, setCalls] = useState<any[]>([]);
  const [users, setUsers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchCalls = async () => {
      try {
         const callerQ = query(collection(db, "calls"), where("callerId", "==", user.uid));
         const receiverQ = query(collection(db, "calls"), where("receiverId", "==", user.uid));
         
         const [callerSnap, receiverSnap] = await Promise.all([
           getDocs(callerQ),
           getDocs(receiverQ)
         ]);

         const allCalls: any[] = [
           ...callerSnap.docs.map(d => ({id: d.id, ...d.data()})),
           ...receiverSnap.docs.map(d => ({id: d.id, ...d.data()}))
         ];
         
         allCalls.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
         const uniqueCalls = Array.from(new Map(allCalls.map(item => [item.id, item])).values());
         setCalls(uniqueCalls);

         const userIds = new Set<string>();
         uniqueCalls.forEach(c => {
           if (c.callerId !== user.uid) userIds.add(c.callerId);
           if (c.receiverId !== user.uid) userIds.add(c.receiverId);
         });

         const usersData: Record<string, any> = {};
         for (const uid of userIds) {
            const userSnap = await getDocs(query(collection(db, "users"), where("id", "==", uid)));
            if (!userSnap.empty) {
               usersData[uid] = userSnap.docs[0].data();
            }
         }
         setUsers(usersData);
      } catch (error) {
         console.error("Error fetching call history:", error);
      } finally {
         setLoading(false);
      }
    };

    fetchCalls();
  }, [user]);

  const renderCallIcon = (c: any) => {
    const isOutgoing = c.callerId === user?.uid;
    const isMissed = c.status !== 'ended' && c.status !== 'connected';

    if (isOutgoing) {
      return <PhoneOutgoing size={16} className="text-emerald-500" />;
    } else if (isMissed) {
      return <PhoneMissed size={16} className="text-rose-500" />;
    } else {
      return <PhoneIncoming size={16} className="text-indigo-400" />;
    }
  };

  const startCall = (otherUserId: string, video: boolean) => {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    navigate(`/call/${callId}?target=${otherUserId}&video=${video}&isCaller=true`);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 md:bg-slate-950/40 relative">
      <header className="p-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl z-20">
        <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <Phone className="text-indigo-400" size={24} />
          Call History
        </h2>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : calls.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-slate-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
               <PhoneMissed className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-200">No calls yet</h3>
            <p className="text-slate-500 mt-1">Recent calls will appear here</p>
          </div>
        ) : (
          calls.map(c => {
             const otherUserId = c.callerId === user?.uid ? c.receiverId : c.callerId;
             const otherUser = users[otherUserId];
             
             return (
               <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-800 group gap-3">
                 <div className="flex items-center gap-4">
                   <Avatar src={otherUser?.photoURL} fallback={otherUser?.displayName} size="md" />
                   <div>
                     <h4 className="font-medium text-slate-200">{otherUser?.displayName || "Unknown User"}</h4>
                     <div className="flex items-center gap-1.5 text-xs mt-1">
                       {renderCallIcon(c)}
                       <span className={c.status !== 'ended' && c.status !== 'connected' && c.callerId !== user?.uid ? "text-rose-400 font-medium" : "text-slate-400"}>
                          {c.isVideo ? "Video" : "Voice"} call {c.callerId !== user?.uid && c.status !== 'ended' && c.status !== 'connected' ? "(Missed)" : ""}
                       </span>
                       <span className="mx-1 text-slate-600">•</span>
                       <Clock size={12} className="text-slate-500" />
                       <span className="text-slate-500">{formatTimeIST(c.createdAt)}</span>
                     </div>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                   <button 
                     onClick={() => startCall(otherUserId, false)}
                     className="p-2.5 rounded-full text-slate-300 hover:text-emerald-400 hover:bg-slate-800 border border-slate-800 bg-slate-900 shadow-sm"
                     title="Voice Call"
                   >
                     <Phone size={16} />
                   </button>
                   <button 
                     onClick={() => startCall(otherUserId, true)}
                     className="p-2.5 rounded-full text-slate-300 hover:text-indigo-400 hover:bg-slate-800 border border-slate-800 bg-slate-900 shadow-sm"
                     title="Video Call"
                   >
                     <Video size={16} />
                   </button>
                 </div>
               </div>
             )
          })
        )}
      </div>
    </div>
  );
}
