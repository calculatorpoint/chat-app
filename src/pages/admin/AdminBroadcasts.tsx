import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, Send, Clock, Trash2, X, Check, BellRing } from "lucide-react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { formatTimeIST } from "@/utils/date";

export default function AdminBroadcasts() {
  const { user } = useAuthStore();
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"info" | "warning" | "success" | "maintenance">("info");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "system_broadcasts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setBroadcasts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !title.trim()) return;
    
    setSending(true);
    try {
      await addDoc(collection(db, "system_broadcasts"), {
        title: title.trim(),
        message: newMessage.trim(),
        type,
        createdBy: user?.uid,
        createdAt: serverTimestamp(),
        active: true
      });
      setNewMessage("");
      setTitle("");
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "system_broadcasts", id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-500">
          <Megaphone size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Global Broadcasts</h1>
          <p className="text-sm text-slate-400">Send system-wide alerts and announcements to all users.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Composer */}
        <div className="lg:col-span-1 border border-slate-800 bg-slate-900/50 rounded-2xl p-5 shadow-lg relative overflow-hidden">
           <div className="absolute top-0 right-0 p-3 opacity-10">
              <Megaphone size={100} />
           </div>
           <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2 relative z-10">
             <Send size={16} className="text-rose-400"/> New Broadcast
           </h3>
           <form onSubmit={handleSend} className="space-y-4 relative z-10">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Scheduled Maintenance"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 transition-shadow"
                  required
                />
              </div>
              
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Message</label>
                <textarea 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-rose-500 transition-shadow"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Alert Type</label>
                <div className="flex flex-wrap gap-2">
                  {(['info', 'success', 'warning', 'maintenance'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        type === t 
                        ? (t === 'info' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 
                          t === 'success' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' :
                          t === 'warning' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' :
                          'bg-rose-500/20 text-rose-400 border-rose-500/50')
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-800'
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {(title || newMessage) && (
                <div className="mt-4 p-3 rounded-xl border border-slate-700 bg-slate-950">
                  <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-wide">Live Preview</p>
                  <div className={`flex gap-3 items-start p-3 rounded-lg border ${
                        type === 'info' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 
                        type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                        'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                    <BellRing size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm mb-0.5">{title}</h4>
                      <p className="text-xs opacity-90 leading-relaxed">{newMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={sending || !title || !newMessage}
                className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-medium py-2 rounded-xl transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
              >
                {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
                {sending ? "Sending..." : "Publish Broadcast"}
              </button>
           </form>
        </div>

        {/* History */}
        <div className="lg:col-span-2 border border-slate-800 bg-slate-900/50 rounded-2xl p-5 shadow-lg flex flex-col h-[600px]">
           <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
             <Clock size={16} className="text-rose-400"/> Broadcast History
           </h3>
           <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-3">
             {loading ? (
               <div className="flex justify-center py-10 opacity-50"><div className="w-6 h-6 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin"/></div>
             ) : broadcasts.length === 0 ? (
               <div className="text-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                 No broadcasts found.
               </div>
             ) : (
               <AnimatePresence>
                 {broadcasts.map((b) => (
                   <motion.div 
                     key={b.id}
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     className="bg-slate-950 border border-slate-800 rounded-xl p-4 group relative"
                   >
                     <div className="flex justify-between items-start gap-4">
                       <div className="flex gap-3">
                         <div className={`mt-1 shrink-0 ${
                            b.type === 'info' ? 'text-blue-400' : 
                            b.type === 'success' ? 'text-emerald-400' :
                            b.type === 'warning' ? 'text-amber-400' :
                            'text-rose-400'
                         }`}>
                           <BellRing size={18} />
                         </div>
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-slate-200 text-sm">{b.title}</h4>
                              <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${
                                  b.type === 'info' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 
                                  b.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                  b.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                  'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              }`}>
                                {b.type}
                              </span>
                            </div>
                            <p className="text-sm text-slate-400 whitespace-pre-wrap leading-relaxed">{b.message}</p>
                            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                               <Clock size={10} /> {b.createdAt ? formatTimeIST(b.createdAt.toMillis()) : 'Just now'}
                            </p>
                         </div>
                       </div>
                       
                       <button
                         onClick={() => handleDelete(b.id)}
                         className="p-1.5 bg-rose-500/10 text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 hover:text-white"
                         title="Delete Broadcast"
                       >
                         <Trash2 size={16} />
                       </button>
                     </div>
                   </motion.div>
                 ))}
               </AnimatePresence>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
