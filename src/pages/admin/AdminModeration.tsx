import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Plus, Trash2, Save, FileWarning, EyeOff, X } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/services/firebase";

export default function AdminModeration() {
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoFilter, setAutoFilter] = useState(true);
  
  const [action, setAction] = useState<"mask" | "delete" | "flag">("mask");

  useEffect(() => {
    async function loadConfig() {
      try {
        const d = await getDoc(doc(db, "system", "moderation"));
        if (d.exists()) {
          const data = d.data();
          setBannedWords(data.bannedWords || []);
          setAutoFilter(data.autoFilter ?? true);
          setAction(data.action || "mask");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "system", "moderation"), {
        bannedWords,
        autoFilter,
        action
      }, { merge: true });
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setSaving(false), 500); // Visual feedback
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const word = newWord.trim().toLowerCase();
    if (word && !bannedWords.includes(word)) {
      setBannedWords(prev => [word, ...prev]);
      setNewWord("");
    }
  };

  const handleRemove = (wordToRemove: string) => {
    setBannedWords(prev => prev.filter(w => w !== wordToRemove));
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-rose-500/30 border-t-rose-500 animate-spin rounded-full"/></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-500">
          <ShieldAlert size={20} />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-100">Content Moderation</h1>
          <p className="text-sm text-slate-400">Manage banned words and automated actions for chat messages.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-xl transition-all shadow-lg flex items-center gap-2"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : <Save size={16} />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Settings Panel */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-6">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <FileWarning size={16} className="text-rose-400"/> Automation Rules
          </h3>
          
          <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
            <div>
              <p className="font-medium text-slate-200">Enable Auto-Filter</p>
              <p className="text-xs text-slate-500 mt-0.5">Automatically scan incoming messages against the banned words list.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={autoFilter} onChange={(e) => setAutoFilter(e.target.checked)}/>
              <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
            </label>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
             <p className="font-medium text-slate-200 mb-2">When a banned word is detected:</p>
             
             <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${action === 'mask' ? 'bg-rose-500/10 border-rose-500/30' : 'border-slate-800 hover:bg-slate-800/50'}`}>
               <input type="radio" name="action" value="mask" checked={action === 'mask'} onChange={() => setAction("mask")} className="text-rose-500 focus:ring-rose-500 bg-slate-900 border-slate-700"/>
               <div>
                  <p className="text-sm font-medium text-slate-200">Mask Word <span className="text-rose-500 text-xs ml-1">(Recommended)</span></p>
                  <p className="text-xs text-slate-500">Replaces the word with asterisks (e.g. b***h)</p>
               </div>
             </label>

             <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${action === 'delete' ? 'bg-rose-500/10 border-rose-500/30' : 'border-slate-800 hover:bg-slate-800/50'}`}>
               <input type="radio" name="action" value="delete" checked={action === 'delete'} onChange={() => setAction("delete")} className="text-rose-500 focus:ring-rose-500 bg-slate-900 border-slate-700"/>
               <div>
                  <p className="text-sm font-medium text-slate-200">Block Message entirely</p>
                  <p className="text-xs text-slate-500">Prevents the message from being sent and notifies the sender.</p>
               </div>
             </label>

             <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${action === 'flag' ? 'bg-rose-500/10 border-rose-500/30' : 'border-slate-800 hover:bg-slate-800/50'}`}>
               <input type="radio" name="action" value="flag" checked={action === 'flag'} onChange={() => setAction("flag")} className="text-rose-500 focus:ring-rose-500 bg-slate-900 border-slate-700"/>
               <div>
                  <p className="text-sm font-medium text-slate-200">Just Flag & Send</p>
                  <p className="text-xs text-slate-500">Allows message but generates an admin report.</p>
               </div>
             </label>
          </div>
        </div>

        {/* Dictionary Panel */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col h-[500px]">
          <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <EyeOff size={16} className="text-rose-400"/> Restricted Dictionary ({bannedWords.length})
          </h3>
          
          <form onSubmit={handleAdd} className="flex gap-2 mb-4">
            <input 
               type="text"
               value={newWord}
               onChange={(e) => setNewWord(e.target.value)}
               placeholder="Add a word to ban..."
               className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            <button type="submit" disabled={!newWord.trim()} className="bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white disabled:opacity-50 px-4 rounded-xl transition-colors shrink-0">
               <Plus size={20} />
            </button>
          </form>

          <div className="flex-1 overflow-y-auto no-scrollbar border border-slate-800 rounded-xl bg-slate-950 p-2">
            {bannedWords.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 opacity-50">
                 <ShieldAlert size={40} />
                 <p className="text-sm">Dictionary is empty</p>
               </div>
            ) : (
               <div className="flex flex-wrap gap-2 content-start">
                 <AnimatePresence>
                   {bannedWords.map(word => (
                     <motion.div
                       key={word}
                       initial={{ opacity: 0, scale: 0.8 }}
                       animate={{ opacity: 1, scale: 1 }}
                       exit={{ opacity: 0, scale: 0.8 }}
                       className="bg-slate-800 text-slate-200 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 border border-slate-700 font-medium group"
                     >
                       {word}
                       <button onClick={() => handleRemove(word)} className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                         <X size={14} />
                       </button>
                     </motion.div>
                   ))}
                 </AnimatePresence>
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
