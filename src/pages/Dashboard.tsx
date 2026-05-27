import { useState } from "react";
import { useChats } from "@/hooks/useChats";
import { useUsers } from "@/hooks/useUsers";
import { useAuthStore } from "@/store/useAuthStore";
import { formatMessageTime } from "@/utils/date";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GlassWrapper } from "@/components/layout/GlassWrapper";
import { Search, Plus, MessageSquare, X, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, handleFirestoreError, OperationType } from "@/services/firebase";
import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";

export default function Dashboard() {
  const { chats, loading: chatsLoading } = useChats();
  const { users, loading: usersLoading } = useUsers();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [isStealthMode, setIsStealthMode] = useState(false);
  const [isLockedRevealed, setIsLockedRevealed] = useState(false);
  const [lockedPinInput, setLockedPinInput] = useState("");
  const [showLockedPrompt, setShowLockedPrompt] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const handleCreateGroup = async () => {
    if (!user || selectedUsers.length === 0 || !groupName.trim()) return;
    
    const chatId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const allParticipants = [user.uid, ...selectedUsers];
    
    try {
      const chatRef = doc(db, "chats", chatId);
      await setDoc(chatRef, {
        participants: allParticipants,
        isGroup: true,
        groupName: groupName.trim(),
        groupAdmins: [user.uid],
        updatedAt: Date.now(),
        lastMessageText: "Group created",
        lastMessageId: ""
      });
      navigate(`/chat/${chatId}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `chats/${chatId}`);
    }
  };

  const handleStartChat = async (otherUser: any) => {
    if (!user) return;
    
    let chatId = "";
    if (isStealthMode) {
      chatId = `stealth_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    } else {
      // Sort UIDs to maintain a consistent chat ID
      const sortedIds = [user.uid, otherUser.id].sort();
      chatId = `${sortedIds[0]}_${sortedIds[1]}`;
    }
    
    try {
      const chatRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (!chatDoc.exists()) {
        const batch = writeBatch(db);
        batch.set(chatRef, {
          participants: [user.uid, otherUser.id],
          isStealth: isStealthMode,
          updatedAt: Date.now(),
          lastMessageText: isStealthMode ? "Stealth Chat Started" : "",
          lastMessageId: ""
        });
        await batch.commit();
      }
      navigate(`/chat/${chatId}?otherUser=${otherUser.id}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `chats/${chatId}`);
    }
  };

  const filteredUsers = users.filter((u) => 
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950">
      <header className="p-4 md:p-6 pb-2 sticky top-0 z-10 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
            Messages
          </h1>
          <Button size="icon" className="rounded-full shadow-lg shadow-indigo-500/20" onClick={() => setShowNewChat(true)}>
            <Plus size={20} />
          </Button>
        </div>
        <Input 
          icon={<Search size={18} />} 
          placeholder="Search chats..." 
          className="rounded-full bg-slate-900 border-slate-800"
        />
        {users.find(u => u.id === user?.uid)?.lockedChats?.length > 0 && (
          <div className="flex justify-center mt-3">
             <button 
               onClick={() => {
                 if (isLockedRevealed) setIsLockedRevealed(false);
                 else setShowLockedPrompt(true);
               }}
               className="text-xs text-slate-500 hover:text-indigo-400 py-1 px-3 bg-slate-900/50 rounded-full border border-slate-800"
             >
               {isLockedRevealed ? "Hide Locked Chats" : "Show Locked Chats"}
             </button>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-2 md:p-4">
        {chatsLoading ? (
          <div className="flex flex-col gap-3 p-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 items-center p-3">
                <div className="w-12 h-12 rounded-full bg-slate-800/50 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-800/50 rounded w-1/3 animate-pulse" />
                  <div className="h-3 bg-slate-800/50 rounded w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 p-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 rotate-12">
              <MessageSquare size={32} className="text-indigo-400/50 -rotate-12" />
            </div>
            <h3 className="text-lg font-medium text-slate-300 mb-1">No messages yet</h3>
            <p className="text-sm">Start a conversation with someone</p>
            <Button variant="secondary" className="mt-4" onClick={() => setShowNewChat(true)}>
              Start New Chat
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {chats.filter(c => {
                 const lockedChats = users.find(u => u.id === user?.uid)?.lockedChats || [];
                 if (lockedChats.includes(c.id)) {
                    return isLockedRevealed; // Only show if revealed
                 }
                 return true;
              }).map((chat) => {
                const otherUserId = chat.participants.find((p: string) => p !== user?.uid);
                const otherUser = users.find((u) => u.id === otherUserId);
                
                return (
                  <motion.div
                    key={chat.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => navigate(chat.isGroup ? `/chat/${chat.id}` : `/chat/${chat.id}?otherUser=${otherUserId}`)}
                    className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    {chat.isGroup ? (
                      <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                        {chat.groupName?.[0]?.toUpperCase() || 'G'}
                      </div>
                    ) : (
                      <Avatar 
                        src={otherUser?.photoURL} 
                        fallback={otherUser?.displayName} 
                        size="lg" 
                        online={otherUser?.isOnline} 
                        className="shadow-md shadow-black/20"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-slate-100 truncate pr-4">
                          {chat.isGroup ? chat.groupName : (otherUser?.displayName || 'Unknown User')}
                        </h4>
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          {formatMessageTime(chat.updatedAt)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 truncate">
                        {chat.lastMessageText || 'No messages yet'}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showNewChat && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 sm:p-6 mt-[env(safe-area-inset-top)] mb-[env(safe-area-inset-bottom)]">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowNewChat(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
                <h3 className="text-lg font-bold">{isGroupMode ? 'New Group' : 'New Chat'}</h3>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-indigo-400 hover:bg-indigo-500/10" onClick={() => setIsGroupMode(!isGroupMode)}>
                    {isGroupMode ? 'Cancel Group' : 'Create Group'}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => { setShowNewChat(false); setIsGroupMode(false); setSelectedUsers([]); setGroupName(""); }}>
                    <X size={18} />
                  </Button>
                </div>
              </div>
              
              {isGroupMode && (
                <div className="p-4 shrink-0 border-b border-slate-800 bg-slate-800/20">
                  <Input 
                    placeholder="Group Name" 
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="rounded-xl mb-3"
                  />
                  <div className="flex gap-2flex-wrap">
                    <span className="text-xs text-slate-400">{selectedUsers.length} selected</span>
                  </div>
                </div>
              )}

              <div className="p-4 shrink-0 flex flex-col gap-3">
                {!isGroupMode && (
                   <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer w-max bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors">
                     <input type="checkbox" checked={isStealthMode} onChange={e => setIsStealthMode(e.target.checked)} className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0" />
                     🔥 Burner Mode (Stealth)
                   </label>
                )}
                <Input 
                  icon={<Search size={18} />} 
                  placeholder="Search users..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-full"
                  autoFocus={!isGroupMode}
                />
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar p-2">
                {usersLoading ? (
                  <div className="flex justify-center p-4">
                    <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 animate-spin rounded-full" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-center text-slate-500 p-4 text-sm">No users found.</p>
                ) : (
                  <div className="space-y-1">
                    {filteredUsers.map((u) => {
                      const isSelected = selectedUsers.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => {
                            if (isGroupMode) {
                              setSelectedUsers(prev => 
                                isSelected ? prev.filter(id => id !== u.id) : [...prev, u.id]
                              );
                            } else {
                              handleStartChat(u);
                            }
                          }}
                          className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-colors ${isSelected ? 'bg-indigo-500/20 ring-1 ring-indigo-500/50' : 'hover:bg-slate-800/60'}`}
                        >
                          <Avatar src={u.photoURL} fallback={u.displayName} size="md" online={u.isOnline} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-slate-200 truncate">{u.displayName}</p>
                            <p className="text-xs text-slate-500 truncate">{u.status || 'Available'}</p>
                          </div>
                          {isGroupMode && isSelected && (
                            <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0">
                              ✓
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {isGroupMode && (
                <div className="p-4 border-t border-slate-800 bg-slate-900 shrink-0">
                  <Button 
                    className="w-full bg-indigo-500 hover:bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20" 
                    disabled={selectedUsers.length === 0 || !groupName.trim()}
                    onClick={handleCreateGroup}
                  >
                    Create Group
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showLockedPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowLockedPrompt(false)} />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full flex flex-col items-center">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4">
                   <Lock size={24} className="text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Locked Chats</h3>
                <p className="text-sm text-slate-400 text-center mb-6">Enter your 4-digit App PIN to view locked chats.</p>
                <div className="flex gap-2">
                   <Input 
                     type="password"
                     autoFocus
                     value={lockedPinInput}
                     onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setLockedPinInput(val);
                        if (val.length === 4) {
                           const localPin = localStorage.getItem(`nova_chat_pin_${user?.uid}`);
                           if (!localPin) {
                              alert("No PIN configured on this device. Please go to Settings/Profile to set it up.");
                              setShowLockedPrompt(false);
                              setLockedPinInput("");
                           } else if (val === localPin) {
                              setIsLockedRevealed(true);
                              setShowLockedPrompt(false);
                              setLockedPinInput("");
                           } else {
                              alert("Incorrect PIN");
                              setLockedPinInput("");
                           }
                        }
                     }}
                     className="w-full text-center text-xl tracking-[1em]"
                     placeholder="****"
                   />
                </div>
                <Button variant="ghost" className="mt-4 text-xs" onClick={() => setShowLockedPrompt(false)}>Cancel</Button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

