import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { useMessages } from "@/hooks/useMessages";
import { useUsers } from "@/hooks/useUsers";
import { db, handleFirestoreError, OperationType } from "@/services/firebase";
import { collection, doc, writeBatch, getDoc, setDoc, onSnapshot, arrayUnion, arrayRemove, updateDoc, deleteDoc } from "firebase/firestore";
import { supabase } from "@/services/supabase";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Phone, Video, Send, ArrowLeft, Image as ImageIcon, Smile, Paperclip, Mic, Check, CheckCheck, X, File as FileIcon, Play, Square, Flag, Edit2, Reply, MessageSquare, LayoutGrid, Maximize2, Search, Pin, Ban, Hourglass, Trash2, Link as LinkIcon, Star, Forward, ShieldCheck, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatTimeIST, formatLastSeen } from "@/utils/date";
import { applyAudioFilter } from "@/utils/audioFilters";
import LinkPreview from "@/components/LinkPreview";

export default function ChatView() {
  const { userId } = useParams(); // This is the chatId
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const otherUserId = searchParams.get("otherUser");
  
  const { user } = useAuthStore();
  const { messages, loading } = useMessages(userId);
  const { users } = useUsers();
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const [chatMeta, setChatMeta] = useState<any>(null);
  
  // Feature states
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryTab, setGalleryTab] = useState<'media' | 'links' | 'docs'>('media');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewMedia, setPreviewMedia] = useState<{url: string, type: string} | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState<{isOpen: boolean, message: any} | null>(null);
  
  const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);
  const [deleteMessageDialog, setDeleteMessageDialog] = useState<{isOpen: boolean, messageId: string, isMine: boolean} | null>(null);
  
  const handleReactToMessage = async (messageId: string, emoji: string) => {
    if (!userId || !user) return;
    try {
      await updateDoc(doc(db, "chats", userId, "messages", messageId), {
        [`reactions.${user.uid}`]: emoji
      });
      setShowReactionPicker(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `chats/${userId}/messages/${messageId}`);
    }
  };
  
  // Media Attachment State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const sentMessageTimes = useRef<number[]>([]);
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [voiceFilter, setVoiceFilter] = useState<'none' | 'robot' | 'echo' | 'radio'>('none');
  const [showVoiceFilters, setShowVoiceFilters] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioWaveform, setAudioWaveform] = useState<number[]>(new Array(20).fill(2));
  const animationFrameRef = useRef<number | null>(null);
  const holdStartTimeRef = useRef<number>(0);

  const updateWaveform = (analyser: AnalyserNode, dataArray: Uint8Array) => {
     analyser.getByteFrequencyData(dataArray);
     setAudioWaveform(Array.from(dataArray).slice(0, 20).map(v => Math.max(2, (v / 255) * 24)));
     animationFrameRef.current = requestAnimationFrame(() => updateWaveform(analyser, dataArray));
  };

  const handlePinMessage = async (msg: any) => {
     if (!userId) return;
     try {
       await updateDoc(doc(db, "chats", userId), {
         pinnedMessage: {
            id: msg.id,
            text: msg.text || "Media Attachment",
            senderId: msg.senderId
         }
       });
     } catch (e) {
       handleFirestoreError(e, OperationType.WRITE, `chats/${userId}`);
     }
  };

  const handleUnpinMessage = async () => {
     if (!userId) return;
     try {
       await updateDoc(doc(db, "chats", userId), {
         pinnedMessage: null
       });
     } catch (e) {
       handleFirestoreError(e, OperationType.WRITE, `chats/${userId}`);
     }
  };

  const handleStarMessage = async (messageId: string) => {
    if (!userId || !user) return;
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;
    try {
      const isStarred = msg.starredBy?.includes(user.uid);
      await updateDoc(doc(db, "chats", userId, "messages", messageId), {
         starredBy: isStarred ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `chats/${userId}/messages/${messageId}`);
    }
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [myUser, setMyUser] = useState<any>(null);

  useEffect(() => {
    // Wait for the DOM to render the new messages before scrolling
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [messages]);

  const resolvedOtherUserId = otherUserId || (chatMeta?.participants?.find((id: string) => id !== user?.uid)) || (chatMeta?.participants?.[0]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (d) => {
      if (d.exists()) {
        setMyUser({ id: d.id, ...d.data() });
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!resolvedOtherUserId) return;
    const unsub = onSnapshot(doc(db, "users", resolvedOtherUserId), (d) => {
      if (d.exists()) {
        setOtherUser({ id: d.id, ...d.data() });
      }
    });
    return () => unsub();
  }, [resolvedOtherUserId]);

  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(doc(db, "chats", userId), (d) => {
      if (d.exists()) {
        setChatMeta(d.data());
      }
    });
    return () => unsub();
  }, [userId]);

  // Stealth Mode Self-Destruct
  const isStealthRef = useRef(false);
  const messagesRef = useRef(messages);
  
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (chatMeta?.isStealth) {
       isStealthRef.current = true;
    }
  }, [chatMeta?.isStealth]);

  useEffect(() => {
    const handleUnload = () => {
      if (isStealthRef.current && userId) {
        // Best effort to burn everything
        try {
          const batch = writeBatch(db);
          messagesRef.current.forEach(m => {
             batch.delete(doc(db, `chats/${userId}/messages`, m.id));
          });
          batch.delete(doc(db, "chats", userId));
          batch.commit().catch(() => {}); // Fire and forget
        } catch (e) {
          console.error("Failed to destroy stealth chat", e);
        }
      }
    };
    
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      handleUnload();
    };
  }, [userId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current && user && userId) {
        clearTimeout(typingTimeoutRef.current);
        updateDoc(doc(db, "chats", userId), {
          typingUsers: arrayRemove(user.uid)
        }).catch(console.error);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [user, userId]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (!user || !userId) return;

    // Set typing to true
    if (!typingTimeoutRef.current) {
      updateDoc(doc(db, "chats", userId), {
        typingUsers: arrayUnion(user.uid)
      }).catch(console.error);
    } else {
      clearTimeout(typingTimeoutRef.current);
    }

    // Clear typing after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      updateDoc(doc(db, "chats", userId), {
        typingUsers: arrayRemove(user.uid)
      }).catch(console.error);
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const isRecordingIntentRef = useRef(false);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
         alert("Microphone recording is not supported in this browser or requires HTTPS.");
         return;
      }
      isRecordingIntentRef.current = true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isRecordingIntentRef.current) {
         stream.getTracks().forEach(t => t.stop());
         return;
      }
      streamRef.current = stream;
      
      let finalStream = stream;
      try {
         const audioContext = new window.AudioContext();
         audioContextRef.current = audioContext;
         const source = audioContext.createMediaStreamSource(stream);
         
         const dest = applyAudioFilter(audioContext, source, voiceFilter);
         
         finalStream = dest.stream;

         const analyser = audioContext.createAnalyser();
         source.connect(analyser); // visualize original audio
         analyser.fftSize = 64;
         const dataArray = new Uint8Array(analyser.frequencyBinCount);
         updateWaveform(analyser, dataArray);
      } catch(e) { console.error("Audio API error", e); }

      const mediaRecorder = new MediaRecorder(finalStream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      holdStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        // Auto-send if hold duration is > 600ms, otherwise just attach it
        if (Date.now() - holdStartTimeRef.current > 600) {
           handleSend(undefined, file);
        } else {
           setAttachment(file);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    isRecordingIntentRef.current = false;
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioWaveform(new Array(20).fill(2));
      
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    }
  };

  const handleSend = async (e?: React.FormEvent, overrideAttachment?: File) => {
    if (e) e.preventDefault();
    const activeAttachment = overrideAttachment || attachment;
    if ((!newMessage.trim() && !activeAttachment) || !user || !userId) return;

    if (uploading) return;
    
    // Rate Limiting (Anti Spam)
    const now = Date.now();
    sentMessageTimes.current = sentMessageTimes.current.filter(t => now - t < 60000); // Only keep last minute
    if (sentMessageTimes.current.length > 50) {
      alert("You are sending messages too fast! Please slow down.");
      return;
    }
    sentMessageTimes.current.push(now);

    const messageText = newMessage.trim();
    setNewMessage("");

    if (activeAttachment) {
      setUploading(true);
    }

    try {
      if (editingMessageId) {
        const msgRef = doc(db, `chats/${userId}/messages`, editingMessageId);
        await updateDoc(msgRef, {
          text: messageText,
          isEdited: true,
          editedAt: Date.now()
        });
        setEditingMessageId(null);
        if (activeAttachment) setUploading(false);
        return;
      }

      let mediaUrl = "";
      let fileType = "";
      let fileName = "";

      if (activeAttachment) {
        const filePath = `chats/${userId}/${Date.now()}_${activeAttachment.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(filePath, activeAttachment, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error("Supabase storage error:", uploadError);
          // Show error or handle it securely instead of failing silently? 
          // Let's just alert for now so user knows what's happening
          alert(`Failed to upload to Supabase: ${uploadError.message}. Make sure you have created the 'chat-media' bucket and configured it as public.`);
          setUploading(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('chat-media')
          .getPublicUrl(filePath);

        mediaUrl = publicUrl;
        fileName = activeAttachment.name;
        if (activeAttachment.type.startsWith("image/")) fileType = "image";
        else if (activeAttachment.type.startsWith("video/")) fileType = "video";
        else if (activeAttachment.type.startsWith("audio/")) fileType = "audio";
        else if (activeAttachment.type === "application/pdf") fileType = "pdf";
        else fileType = "file";
      }

      setAttachment(null);
      const isViewOnceFlag = isViewOnce && (fileType === 'image' || fileType === 'video');
      setIsViewOnce(false);

      const batch = writeBatch(db);
      const messageRef = doc(collection(db, `chats/${userId}/messages`));
      
      const msgData: any = {
        senderId: user.uid,
        text: messageText,
        status: "sent",
        createdAt: Date.now(),
        readBy: [user.uid]
      };
      
      if (replyingTo) {
         msgData.replyToId = replyingTo.id;
      }
      
      if (mediaUrl) {
         msgData.mediaUrl = mediaUrl;
         msgData.fileType = fileType;
         msgData.fileName = fileName;
         if (isViewOnceFlag) {
           msgData.viewOnce = true;
           msgData.viewedBy = [];
         }
      }

      // Optimistically clear reply state immediately
      setReplyingTo(null);

      batch.set(messageRef, msgData);

      const chatRef = doc(db, "chats", userId);
      batch.update(chatRef, {
        lastMessageText: mediaUrl ? (isViewOnceFlag ? "💣 View Once Media" : (fileType === "image" ? "📷 Image" : `📎 ${fileName}`)) : messageText,
        lastMessageId: messageRef.id,
        updatedAt: Date.now()
      });

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `chats/${userId}`);
    } finally {
      if (activeAttachment) setUploading(false);
    }
  };

  const handleReportMessage = async (msg: any) => {
    if (!user || !userId) return;
    const reason = prompt("Enter reason for reporting this message:");
    if (!reason || !reason.trim()) return;
    
    try {
      const newReportRef = doc(collection(db, "reports"));
      await setDoc(newReportRef, {
        messageId: msg.id,
        chatId: userId,
        messageText: msg.text || "Media Attachment",
        reporterId: user.uid,
        reportedUserId: msg.senderId,
        reason: reason.trim(),
        status: "pending",
        createdAt: Date.now()
      });
      alert("Message reported successfully.");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "reports");
    }
  };


  const startCall = (video: boolean) => {
    if (!user || !resolvedOtherUserId) return;
    // Generate a unique call ID
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    navigate(`/call/${callId}?target=${resolvedOtherUserId}&video=${video}&isCaller=true`);
  };

  const handleBlockUser = async () => {
    if (!user || chatMeta?.isGroup || !resolvedOtherUserId) return;
    try {
      const userRef = doc(db, "users", user.uid);
      
      if (otherUser?.blockedBy?.includes(user.uid)) {
         // Unblock
         await updateDoc(userRef, { blockedUsers: arrayRemove(resolvedOtherUserId) });
         const otherRef = doc(db, "users", resolvedOtherUserId);
         await updateDoc(otherRef, { blockedBy: arrayRemove(user.uid) });
      } else {
         // Block
         await updateDoc(userRef, { blockedUsers: arrayUnion(resolvedOtherUserId) });
         const otherRef = doc(db, "users", resolvedOtherUserId);
         await updateDoc(otherRef, { blockedBy: arrayUnion(user.uid) });
      }
    } catch (e) {
      console.error("Error blocking/unblocking user", e);
    }
  };

  const handleToggleDisappearing = async () => {
     if (!userId) return;
     try {
       await updateDoc(doc(db, "chats", userId), {
         disappearing: !chatMeta?.disappearing
       });
     } catch (e) {
       handleFirestoreError(e, OperationType.WRITE, `chats/${userId}`);
     }
  };

  const handleClearChat = async () => {
    if (!userId || !user) return;
    setConfirmDialog({
       isOpen: true,
       title: "Clear Chat",
       message: "Are you sure you want to clear this chat? This action cannot be undone.",
       onConfirm: async () => {
          try {
            await updateDoc(doc(db, "chats", userId), {
              [`clearedAt.${user.uid}`]: Date.now()
            });
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `chats/${userId}`);
          }
       }
    });
  };

  const handleToggleLockChat = async () => {
    if (!userId || !user) return;
    
    // Check if user has setup a PIN first
    const hasPin = localStorage.getItem(`nova_chat_pin_${user.uid}`);
    if (!hasPin) {
      alert("Please setup your App Lock PIN in Settings/Profile first to use Locked Chats.");
      return;
    }

    try {
      const uRef = doc(db, "users", user.uid);
      const isCurrentlyLocked = users.find(u => u.id === user.uid)?.lockedChats?.includes(userId);
      if (isCurrentlyLocked) {
        await updateDoc(uRef, { lockedChats: arrayRemove(userId) });
      } else {
        await updateDoc(uRef, { lockedChats: arrayUnion(userId) });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const executeDeleteMessage = async (messageId: string, type: 'me' | 'everyone') => {
    if (!userId || !user) return;
    try {
      if (type === 'everyone') {
         await deleteDoc(doc(db, "chats", userId, "messages", messageId));
      } else {
         await updateDoc(doc(db, "chats", userId, "messages", messageId), {
            deletedFor: arrayUnion(user.uid)
         });
      }
      setDeleteMessageDialog(null);
    } catch (e) {
      handleFirestoreError(e, type === 'everyone' ? OperationType.DELETE : OperationType.WRITE, `chats/${userId}/messages/${messageId}`);
    }
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-slate-900 md:bg-slate-950/40">
      <div className="flex-1 flex flex-col h-full relative border-r border-slate-800">
        <header className="p-3 md:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="md:hidden shrink-0">
              <ArrowLeft size={20} />
            </Button>
            {chatMeta?.isGroup ? (
               <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                 {chatMeta.groupName?.[0]?.toUpperCase() || 'G'}
               </div>
            ) : (
              <Avatar 
                src={otherUser?.privacyPhoto === 'nobody' ? undefined : otherUser?.photoURL} 
                fallback={otherUser?.displayName} 
                size="md" 
                online={otherUser?.privacyLastSeen === 'nobody' ? undefined : otherUser?.isOnline} 
              />
            )}
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-slate-100 flex items-center gap-1.5 truncate">
                 <span className="truncate">{chatMeta?.isGroup ? chatMeta.groupName : (otherUser?.displayName || "Loading...")}</span>
                 {chatMeta?.isStealth && <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full shrink-0">Burner</span>}
                 {chatMeta?.disappearing && <Hourglass size={12} className="text-indigo-400 shrink-0" title="Disappearing messages enabled" />}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {chatMeta?.isGroup ? (
                   <span className="text-slate-500">{chatMeta.participants?.length} participants</span>
                ) : chatMeta?.typingUsers?.includes(resolvedOtherUserId) ? (
                   <span className="text-indigo-400 font-medium animate-pulse">typing...</span>
                ) : otherUser?.privacyLastSeen === 'nobody' ? (
                   ""
                ) : otherUser?.isOnline ? (
                   "Online"
                ) : otherUser?.lastSeen ? (
                   formatLastSeen(otherUser.lastSeen)
                ) : (
                   "Offline"
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar ml-2 shrink-0 max-w-[50vw] sm:max-w-none">
            <Button variant="ghost" size="icon" title="Toggle 24h Disappearing Messages" className={`rounded-full shrink-0 hover:text-indigo-400 hover:bg-indigo-500/10 ${chatMeta?.disappearing ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-300'}`} onClick={handleToggleDisappearing}>
              <Hourglass size={18} />
            </Button>
            <Button variant="ghost" size="icon" className={`rounded-full shrink-0 hover:text-indigo-400 hover:bg-indigo-500/10 ${showSearch ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-300'}`} onClick={() => setShowSearch(!showSearch)}>
              <Search size={18} />
            </Button>
            <Button variant="ghost" size="icon" className={`rounded-full shrink-0 hover:text-indigo-400 hover:bg-indigo-500/10 ${showGallery ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-300'}`} onClick={() => setShowGallery(!showGallery)}>
              <LayoutGrid size={18} />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full shrink-0 text-slate-300 hover:text-indigo-400 hover:bg-indigo-500/10" onClick={() => startCall(false)}>
              <Phone size={18} />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full shrink-0 text-slate-300 hover:text-indigo-400 hover:bg-indigo-500/10" onClick={() => startCall(true)}>
              <Video size={18} />
            </Button>
            {!chatMeta?.isGroup ? (
              <Button variant="ghost" size="icon" title={otherUser?.blockedBy?.includes(user?.uid) ? "Unblock User" : "Block User"} className={`rounded-full shrink-0 hover:bg-red-500/10 ${otherUser?.blockedBy?.includes(user?.uid) ? "text-red-500" : "text-slate-300 hover:text-red-400"}`} onClick={handleBlockUser}>
                <Ban size={18} />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" title="Group Settings" className="rounded-full shrink-0 text-slate-300 hover:text-indigo-400 hover:bg-slate-800" onClick={() => setShowGroupSettings(true)}>
                <Edit2 size={18} />
              </Button>
            )}
            <Button variant="ghost" size="icon" title={users.find(u => u.id === user?.uid)?.lockedChats?.includes(userId || "") ? "Unlock Chat" : "Lock Chat"} className={`rounded-full shrink-0 hover:bg-indigo-500/10 ${users.find(u => u.id === user?.uid)?.lockedChats?.includes(userId || "") ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-300 hover:text-indigo-400'}`} onClick={handleToggleLockChat}>
              <Lock size={18} />
            </Button>
            <Button variant="ghost" size="icon" title="Clear Chat" className="rounded-full shrink-0 text-slate-300 hover:text-red-400 hover:bg-red-500/10" onClick={handleClearChat}>
              <Trash2 size={18} />
            </Button>
          </div>
        </header>

        <AnimatePresence>
          {showSearch && (
             <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-slate-900 border-b border-slate-800 p-2 px-4 shadow-inner">
               <div className="relative">
                 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                 <input 
                    type="text" 
                    placeholder="Search in conversation..." 
                    className="w-full bg-slate-950 border border-slate-800 rounded-full py-1.5 pl-9 pr-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                 />
                 {searchQuery && (
                   <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                     <X size={14} />
                   </button>
                 )}
               </div>
             </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {chatMeta?.pinnedMessage && (
            <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="bg-slate-800/80 backdrop-blur-md border-b border-indigo-500/30 p-2.5 px-4 flex justify-between items-center z-10 sticky top-0 shadow-sm">
              <div className="flex flex-col overflow-hidden">
                 <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
                   <Pin size={12} className="fill-indigo-400" /> Pinned Message
                 </div>
                 <p className="text-sm text-slate-300 truncate w-[250px] md:w-[400px] mt-0.5">{chatMeta.pinnedMessage.text}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-200 bg-slate-900/50 rounded-full" onClick={handleUnpinMessage}>
                <X size={14} />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 animate-spin rounded-full" />
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.length > 0 && (
              <div className="flex justify-center my-4">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 max-w-sm w-full text-center">
                  <div className="flex items-center gap-2 justify-center text-amber-400 mb-1">
                    <ShieldCheck size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wider">End-to-End Encrypted</span>
                  </div>
                  <p className="text-[10px] text-amber-400/80">Messages and calls are secured with end-to-end encryption. No one outside of this chat, not even NovaChat, can read or listen to them.</p>
                </div>
              </div>
            )}
            {messages.filter(msg => {
              if (chatMeta?.disappearing && (Date.now() - msg.createdAt > 86400000)) return false;
              if (searchQuery && !msg.text?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
              if (chatMeta?.clearedAt?.[user?.uid || ""] && msg.createdAt < chatMeta.clearedAt[user?.uid || ""]) return false;
              if (msg.deletedFor?.includes(user?.uid)) return false;
              return true;
            }).map((msg, index) => {
              const isMine = msg.senderId === user?.uid;
              const sender = users.find(u => u.id === msg.senderId);
              
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                >
                  <div className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"} group/message relative`}>
                    {!isMine && chatMeta?.isGroup && (
                       <Avatar 
                         src={sender?.privacyPhoto === 'nobody' ? undefined : sender?.photoURL}
                         fallback={sender?.displayName}
                         size="sm"
                         className="mb-5 shrink-0"
                       />
                    )}
                    
                    {/* Action buttons Desktop */}
                    <div className={`
                      hidden md:flex absolute top-2 flex-col transition-all z-20 gap-1 opacity-0 group-hover/message:opacity-100 
                      ${isMine ? "-left-10" : "-right-10"}
                    `}>
                      <div className={`relative`}>
                        <button 
                          onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                          className="p-1.5 bg-slate-800 rounded-full text-slate-400 hover:text-amber-400 hover:bg-slate-700 border border-slate-700"
                          title="React"
                        >
                          <Smile size={14} />
                        </button>
                        
                        <AnimatePresence>
                          {showReactionPicker === msg.id && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                              className={`absolute top-0 ${isMine ? "-left-[210px]" : "-right-[210px]"} bg-slate-800 border border-slate-700 rounded-full shadow-lg p-1.5 flex gap-1 z-30 flex-wrap w-[200px] justify-center`}
                            >
                               {EMOJIS.map(emoji => (
                                 <button key={emoji} onClick={() => handleReactToMessage(msg.id, emoji)} className="hover:scale-125 transition-transform hover:bg-slate-700 rounded-full w-7 h-7 flex items-center justify-center text-lg">{emoji}</button>
                               ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      {!isMine && (
                        <button 
                          onClick={() => handleReportMessage(msg)}
                          className="p-1.5 bg-slate-800 rounded-full text-slate-400 hover:text-rose-400 hover:bg-slate-700 border border-slate-700"
                          title="Report Message"
                        >
                          <Flag size={14} />
                        </button>
                      )}
                      <button 
                        onClick={() => handlePinMessage(msg)}
                        className="p-1.5 bg-slate-800 rounded-full text-slate-400 hover:text-indigo-400 hover:bg-slate-700 border border-slate-700"
                        title="Pin Message"
                      >
                        <Pin size={14} />
                      </button>
                      <button 
                        onClick={() => handleStarMessage(msg.id)}
                        className={`p-1.5 bg-slate-800 rounded-full hover:bg-slate-700 border border-slate-700 ${msg.starredBy?.includes(user?.uid) ? 'text-yellow-400' : 'text-slate-400 hover:text-yellow-500'}`}
                        title={msg.starredBy?.includes(user?.uid) ? "Unstar Message" : "Star Message"}
                      >
                        <Star size={14} fill={msg.starredBy?.includes(user?.uid) ? "currentColor" : "none"} />
                      </button>
                      <button 
                        onClick={() => setShowForwardModal({isOpen: true, message: msg})}
                        className="p-1.5 bg-slate-800 rounded-full text-slate-400 hover:text-indigo-400 hover:bg-slate-700 border border-slate-700"
                        title="Forward Message"
                      >
                        <Forward size={14} />
                      </button>
                      <button 
                        onClick={() => setReplyingTo(msg)}
                        className="p-1.5 bg-slate-800 rounded-full text-slate-400 hover:text-indigo-400 hover:bg-slate-700 border border-slate-700"
                        title="Reply"
                      >
                        <Reply size={14} />
                      </button>
                      {isMine && !msg.mediaUrl && (
                        <button 
                          onClick={() => {
                            setEditingMessageId(msg.id);
                            setNewMessage(msg.text);
                            fileInputRef.current?.focus();
                          }}
                          className="p-1.5 bg-slate-800 rounded-full text-slate-400 hover:text-indigo-400 hover:bg-slate-700 border border-slate-700"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                        <button 
                          onClick={() => setDeleteMessageDialog({isOpen: true, messageId: msg.id, isMine})}
                          className="p-1.5 bg-slate-800 rounded-full text-slate-400 hover:text-red-400 hover:bg-slate-700 border border-slate-700"
                          title="Delete Message"
                        >
                          <Trash2 size={14} />
                        </button>
                    </div>

                    {/* Action buttons Mobile Bottom Sheet */}
                    <AnimatePresence>
                      {selectedMessageId === msg.id && (
                        <>
                          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSelectedMessageId(null)} />
                          <motion.div 
                            initial={{ y: "100%" }} 
                            animate={{ y: 0 }} 
                            exit={{ y: "100%" }}
                            className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 rounded-t-2xl p-4 z-50 md:hidden flex flex-col gap-3 pb-safe-offset-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
                          >
                            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-2" />
                            <div className="flex flex-wrap items-center justify-center gap-4">
                              <button onClick={() => { handleReactToMessage(msg.id, "❤️"); setSelectedMessageId(null); }} className="flex flex-col items-center gap-1">
                                 <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl">❤️</div>
                                 <span className="text-[10px] text-slate-400">Heart</span>
                              </button>
                              <button onClick={() => { handleReactToMessage(msg.id, "😂"); setSelectedMessageId(null); }} className="flex flex-col items-center gap-1">
                                 <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl">😂</div>
                                 <span className="text-[10px] text-slate-400">Haha</span>
                              </button>
                              <button onClick={() => { handleReactToMessage(msg.id, "👍"); setSelectedMessageId(null); }} className="flex flex-col items-center gap-1">
                                 <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl">👍</div>
                                 <span className="text-[10px] text-slate-400">Like</span>
                              </button>
                              
                              <button onClick={() => { setReplyingTo(msg); setSelectedMessageId(null); }} className="flex flex-col items-center gap-1">
                                 <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400"><Reply size={20} /></div>
                                 <span className="text-[10px] text-slate-400">Reply</span>
                              </button>
                              <button onClick={() => { setShowForwardModal({isOpen: true, message: msg}); setSelectedMessageId(null); }} className="flex flex-col items-center gap-1">
                                 <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400"><Forward size={20} /></div>
                                 <span className="text-[10px] text-slate-400">Forward</span>
                              </button>
                              <button onClick={() => { handlePinMessage(msg); setSelectedMessageId(null); }} className="flex flex-col items-center gap-1">
                                 <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-300"><Pin size={20} /></div>
                                 <span className="text-[10px] text-slate-400">Pin</span>
                              </button>
                              <button onClick={() => { handleStarMessage(msg.id); setSelectedMessageId(null); }} className="flex flex-col items-center gap-1">
                                 <div className={`w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center ${msg.starredBy?.includes(user?.uid) ? 'text-yellow-400' : 'text-slate-300'}`}><Star size={20} fill={msg.starredBy?.includes(user?.uid) ? 'currentColor' : 'none'} /></div>
                                 <span className="text-[10px] text-slate-400">Star</span>
                              </button>
                              {isMine && !msg.mediaUrl ? (
                                <button onClick={() => { setEditingMessageId(msg.id); setNewMessage(msg.text); fileInputRef.current?.focus(); setSelectedMessageId(null); }} className="flex flex-col items-center gap-1">
                                   <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-300"><Edit2 size={20} /></div>
                                   <span className="text-[10px] text-slate-400">Edit</span>
                                </button>
                              ) : !isMine ? (
                                <button onClick={() => { handleReportMessage(msg); setSelectedMessageId(null); }} className="flex flex-col items-center gap-1">
                                   <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-rose-400"><Flag size={20} /></div>
                                   <span className="text-[10px] text-slate-400">Report</span>
                                </button>
                              ) : null}
                              
                              <button onClick={() => { setDeleteMessageDialog({isOpen: true, messageId: msg.id, isMine}); setSelectedMessageId(null); }} className="flex flex-col items-center gap-1">
                                 <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500"><Trash2 size={20} /></div>
                                 <span className="text-[10px] text-slate-400">Delete</span>
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>

                    <div 
                      onClick={() => {
                         if (window.innerWidth < 768) {
                            setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id);
                         }
                      }}
                      onDoubleClick={() => {
                         if (!user) return;
                         const chatRef = doc(db, `chats/${userId}/messages`, msg.id);
                         const reactions = msg.reactions || {};
                         const newReaction = reactions[user.uid] === "❤️" ? null : "❤️";
                         
                         const update = { ...reactions };
                         if (newReaction) {
                            update[user.uid] = newReaction;
                         } else {
                            delete update[user.uid];
                         }
                         updateDoc(chatRef, { reactions: update }).catch(console.error);
                      }}
                      className={`max-w-[75vw] md:max-w-[60vw] rounded-2xl p-3 px-4 select-none relative ${
                        isMine 
                          ? "bg-indigo-500 text-white rounded-br-sm shadow-lg shadow-indigo-500/20" 
                          : "bg-slate-800 text-slate-100 rounded-bl-sm shadow-md"
                      }`}
                    >
                      
                      {!isMine && chatMeta?.isGroup && (
                        <p className="text-xs font-semibold text-indigo-300 mb-1">{sender?.displayName}</p>
                      )}
                      <div className="flex items-center gap-2 mb-1 absolute -top-3 left-2 right-2">
                         {msg.forwarded && (
                           <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-300 bg-slate-800/90 px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                              <Forward size={10} /> Forwarded
                           </div>
                         )}
                         {msg.starredBy?.includes(user?.uid) && (
                           <div className="flex items-center gap-1 text-[9px] font-semibold text-yellow-400 bg-slate-800/90 px-1.5 py-0.5 rounded-full shadow-sm ml-auto">
                              <Star size={10} className="fill-yellow-400" />
                           </div>
                         )}
                      </div>
                      
                      {/* Replied Message Banner */}
                      {msg.replyToId && (
                        <div className="mb-2 p-2 rounded bg-black/20 border-l-2 border-indigo-300 text-sm opacity-80 cursor-pointer">
                          <p className="font-semibold text-xs mb-0.5">
                            {users.find(u => u.id === messages.find(m => m.id === msg.replyToId)?.senderId)?.displayName || 'Someone'}
                          </p>
                          <p className="truncate text-xs">
                            {messages.find(m => m.id === msg.replyToId)?.text || "Media"}
                          </p>
                        </div>
                      )}

                      {msg.viewOnce ? (
                        msg.viewedBy?.includes(user?.uid) || isMine ? (
                          <div className="flex items-center gap-2 mb-2 p-3 bg-black/20 rounded-xl italic text-xs text-slate-300">
                             <Trash2 size={16} className="text-slate-500" /> Opened (View Once)
                          </div>
                        ) : (
                          <div 
                            onClick={async () => {
                               setPreviewMedia({url: msg.mediaUrl!, type: msg.fileType});
                               if (user && msg.id && userId) {
                                  try {
                                    await updateDoc(doc(db, "chats", userId, "messages", msg.id), {
                                       viewedBy: arrayUnion(user.uid)
                                    });
                                  } catch(e) { console.error(e) }
                               }
                            }}
                            className="flex items-center gap-3 mb-2 p-4 bg-indigo-500/20 hover:bg-indigo-500/30 cursor-pointer rounded-xl transition-colors border border-indigo-500/30"
                          >
                             <div className="w-10 h-10 rounded-full bg-indigo-500/30 flex items-center justify-center">
                               {msg.fileType === 'video' ? <Video size={20} className="text-indigo-300" /> : <ImageIcon size={20} className="text-indigo-300" />}
                             </div>
                             <div className="flex flex-col">
                               <span className="font-semibold text-sm text-indigo-300">View Once {msg.fileType === 'video' ? 'Video' : 'Photo'}</span>
                               <span className="text-xs text-indigo-400/80">Tap to view</span>
                             </div>
                          </div>
                        )
                      ) : (
                        <>
                          {msg.mediaUrl && msg.fileType === "image" && (
                             <img 
                               src={msg.mediaUrl} 
                               alt="attachment" 
                               onClick={() => setPreviewMedia({url: msg.mediaUrl!, type: 'image'})}
                               className="rounded-xl mb-2 max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity" 
                             />
                          )}
                          {msg.mediaUrl && msg.fileType === "video" && (
                             <div className="relative group/video">
                               <video src={msg.mediaUrl} className="rounded-xl mb-2 max-w-full h-[240px] bg-black/20" />
                               <div 
                                 onClick={() => setPreviewMedia({url: msg.mediaUrl!, type: 'video'})}
                                 className="absolute inset-0 bg-black/30 opacity-0 group-hover/video:opacity-100 flex items-center justify-center cursor-pointer rounded-xl mb-2 transition-opacity"
                               >
                                 <Play className="text-white drop-shadow-md" size={32} />
                               </div>
                             </div>
                          )}
                        </>
                      )}

                      {msg.mediaUrl && msg.fileType !== "image" && msg.fileType !== "video" && msg.fileType !== "audio" && (
                         <div className="flex items-center gap-2 mb-2 bg-black/20 p-2 rounded-lg">
                           <FileIcon size={20} className="text-white/80" />
                           <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline text-white/90">
                             {msg.fileName || "Download Attachment"}
                           </a>
                         </div>
                      )}
                      {msg.mediaUrl && msg.fileType === "audio" && (
                         <div className="mb-2 w-full min-w-[200px]">
                            <audio src={msg.mediaUrl} controls className="h-10 w-full" />
                         </div>
                      )}
                      {msg.text && (
                        <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                          {msg.text}
                          {msg.text.match(/(https?:\/\/[^\s]+)/g)?.map((url: string, idx: number) => (
                             <LinkPreview key={idx} url={url} />
                          ))}
                        </div>
                      )}
                      
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className={`flex items-center gap-1 mt-2 -mb-5 relative z-10 ${isMine ? "justify-end" : "justify-start"}`}>
                           {Object.values(msg.reactions).map((emoji: any, i) => (
                              <span key={i} className="bg-slate-900 border border-slate-700 rounded-full px-1.5 py-0.5 text-xs shadow-sm">
                                {emoji}
                              </span>
                           ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 mt-1 mx-1 ${!isMine && chatMeta?.isGroup ? "ml-10" : ""}`}>
                    <span className="text-[10px] text-slate-500">
                      {formatTimeIST(msg.createdAt)}
                    </span>
                    {msg.isEdited && (
                      <span className="text-[9px] text-slate-500 italic">
                        (edited)
                      </span>
                    )}
                    {isMine && (
                      <span className="text-slate-500 flex items-center gap-1">
                        {chatMeta?.isGroup && msg.readBy?.length > 1 && (
                          <div className="flex -space-x-1 mr-1">
                             {msg.readBy.filter((id: string) => id !== user?.uid).slice(0, 3).map((readerId: string) => {
                               const reader = users.find(u => u.id === readerId);
                               return <img key={readerId} src={reader?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reader?.displayName}`} className="w-3.5 h-3.5 rounded-full ring-1 ring-slate-900 bg-slate-800 object-cover" title={`Read by ${reader?.displayName}`} />
                             })}
                             {msg.readBy.length > 4 && (
                               <div className="w-3.5 h-3.5 rounded-full ring-1 ring-slate-900 bg-slate-800 text-[6px] flex items-center justify-center text-slate-300">
                                 +{msg.readBy.length - 4}
                               </div>
                             )}
                          </div>
                        )}
                        {msg.status === 'read' ? (
                           <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                             <CheckCheck size={14} className="text-blue-400 drop-shadow-[0_0_2px_rgba(96,165,250,0.5)]" />
                           </motion.div>
                        ) : msg.status === 'delivered' ? (
                           <CheckCheck size={14} className="text-slate-400" />
                        ) : (
                           <Check size={14} className="text-slate-400" />
                        )}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        
        {chatMeta?.typingUsers && chatMeta.typingUsers.filter((id: string) => id !== user?.uid).length > 0 && (
           <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="flex items-start"
           >
              <div className="bg-slate-800 rounded-2xl rounded-bl-sm p-2 px-4 shadow-md flex items-center gap-2 h-[42px]">
                <div className="flex -space-x-1 mr-1">
                  {chatMeta.typingUsers.filter((id: string) => id !== user?.uid).slice(0, 3).map((id: string) => {
                     const typer = users.find(u => u.id === id);
                     return <img key={id} src={typer?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${typer?.displayName}`} className="w-5 h-5 rounded-full ring-2 ring-slate-800 bg-slate-700 object-cover" title={`${typer?.displayName} is typing`} />
                  })}
                </div>
                <div className="flex gap-1 pr-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                </div>
              </div>
           </motion.div>
        )}

        <div ref={messagesEndRef} className="h-1" />
      </div>

        {attachment && (
          <div className="max-w-4xl mx-auto px-4 pt-2 -mb-2">
            <div className="bg-slate-800 rounded-t-xl p-3 flex flex-col gap-2 border-l-4 border-emerald-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate pl-1">
                  <FileIcon size={16} className="text-emerald-400 shrink-0" />
                  <span className="text-sm font-medium text-slate-200 truncate">{attachment.name}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-400 shrink-0" onClick={() => setAttachment(null)}>
                  <X size={14} />
                </Button>
              </div>
              {attachment.type.startsWith("image/") && (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-slate-700 ml-1">
                  <img src={URL.createObjectURL(attachment)} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}
              {attachment.type.startsWith("video/") && (
                <div className="relative w-48 h-32 rounded-lg overflow-hidden border border-slate-700 ml-1 bg-black">
                  <video src={URL.createObjectURL(attachment)} className="w-full h-full object-contain" />
                </div>
              )}
              
              {(attachment.type.startsWith("image/") || attachment.type.startsWith("video/")) && (
                 <label className="flex items-center gap-2 text-sm text-slate-300 ml-1 mt-1 cursor-pointer w-max select-none">
                    <input 
                      type="checkbox" 
                      checked={isViewOnce} 
                      onChange={e => setIsViewOnce(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-indigo-500/20"
                    />
                    View Once Media
                 </label>
              )}
            </div>
          </div>
        )}

        {replyingTo && (
          <div className="max-w-4xl mx-auto px-4 pt-2 -mb-2">
            <div className="bg-slate-800 rounded-t-xl p-3 flex items-center justify-between border-l-4 border-indigo-500">
              <div className="flex flex-col truncate pl-2">
                <span className="text-xs font-semibold text-indigo-400 mb-0.5">Replying to {users.find(u => u.id === replyingTo.senderId)?.displayName || 'Someone'}</span>
                <span className="text-sm text-slate-300 truncate">{replyingTo.text || "Media Attachment"}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-400 shrink-0" onClick={() => setReplyingTo(null)}>
                <X size={14} />
              </Button>
            </div>
          </div>
        )}
        
        {editingMessageId && (
          <div className="max-w-4xl mx-auto px-4 pt-2 -mb-2">
            <div className="bg-slate-800 rounded-t-xl p-3 flex items-center justify-between border-l-4 border-rose-500">
              <div className="flex flex-col truncate pl-2">
                <span className="text-xs font-semibold text-rose-400 mb-0.5">Editing Message</span>
                <span className="text-sm text-slate-300 truncate">{messages.find(m => m.id === editingMessageId)?.text}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-400 shrink-0" onClick={() => {
                 setEditingMessageId(null);
                 setNewMessage("");
              }}>
                <X size={14} />
              </Button>
            </div>
          </div>
        )}

      <footer className="p-3 border-t border-slate-800 bg-slate-950/80 backdrop-blur-xl z-10 pb-safe">
        {(!chatMeta?.isGroup && (myUser?.blockedUsers?.includes(resolvedOtherUserId) || otherUser?.blockedBy?.includes(user?.uid) || otherUser?.blockedUsers?.includes(user?.uid))) ? (
          <div className="max-w-4xl mx-auto flex items-center justify-center p-3 text-slate-500 bg-slate-900 border border-slate-800 rounded-xl">
             You cannot reply to this conversation.
          </div>
        ) : chatMeta?.isGroup && chatMeta.adminsOnlySend && !chatMeta.groupAdmins?.includes(user?.uid) ? (
          <div className="max-w-4xl mx-auto flex items-center justify-center p-3 text-slate-500 bg-slate-900 border border-slate-800 rounded-xl">
             Only admins can send messages.
          </div>
        ) : (
        <form id="chat-form" onSubmit={handleSend} className="max-w-4xl mx-auto flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setAttachment(e.target.files[0]);
              }
            }} 
          />
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className={`rounded-full shrink-0 ${isRecording ? 'hidden' : 'text-slate-400 hover:text-slate-100'}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={20} />
          </Button>
          
          {isRecording ? (
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
               className="flex-1 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-full h-11 px-4"
            >
              <div className="flex items-center gap-2 pr-2 border-r border-red-500/20">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                <span className="text-red-400 font-medium text-sm">Recording</span>
              </div>
              <div className="flex-1 flex items-center gap-0.5 h-6">
                 {audioWaveform.map((val, i) => (
                    <motion.div key={i} className="flex-1 bg-red-400 rounded-full" animate={{ height: `${val}px` }} transition={{ type: "tween", duration: 0.05 }} />
                 ))}
              </div>
              <span className="text-xs text-red-400 font-medium whitespace-nowrap">Release to send</span>
            </motion.div>
          ) : (
            <Input 
              className="rounded-full bg-slate-900 border-slate-800 h-11"
              placeholder={uploading ? "Uploading media..." : "Type a message..."}
              value={newMessage}
              onChange={handleTyping}
              disabled={uploading}
            />
          )}

          {!newMessage.trim() && !attachment && !uploading && (
             <div className="relative group/filter">
                <Button 
                   type="button" 
                   variant="ghost" 
                   size="icon" 
                   className={`rounded-full shrink-0 ${isRecording ? 'hidden' : 'text-slate-400 hover:text-indigo-400'}`}
                   onClick={() => setShowVoiceFilters(!showVoiceFilters)}
                   title="Voice Filter"
                >
                   {voiceFilter !== 'none' ? <p className="text-[10px] font-bold bg-indigo-500 text-white rounded px-1">{voiceFilter.toUpperCase()}</p> : <Smile size={20} />}
                </Button>
                {showVoiceFilters && (
                   <div className="absolute bottom-full right-0 mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-2 flex flex-col gap-1 z-50 min-w-[120px]">
                      <span className="text-xs text-slate-400 px-2 pb-1 font-semibold border-b border-slate-700 mb-1">Voice Filter</span>
                      {['none', 'robot', 'echo', 'radio'].map(f => (
                         <button 
                            key={f} 
                            onClick={() => { setVoiceFilter(f as any); setShowVoiceFilters(false); }}
                            className={`text-left px-3 py-2 text-sm rounded ${voiceFilter === f ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-300 hover:bg-slate-700'}`}
                         >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                         </button>
                      ))}
                   </div>
                )}
             </div>
          )}

          {!newMessage.trim() && !attachment && !uploading ? (
             <Button 
                type="button" 
                size="icon" 
                className={`rounded-full shrink-0 h-11 w-11 transition-all ${isRecording ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-indigo-400'} touch-none`}
                onPointerDown={(e) => { e.preventDefault(); startRecording(); }}
                onPointerUp={(e) => { e.preventDefault(); stopRecording(); }}
                onPointerLeave={(e) => { e.preventDefault(); stopRecording(); }}
                onContextMenu={(e) => e.preventDefault()}
             >
                <Mic size={18} />
             </Button>
          ) : (
             <Button 
               type="submit" 
               size="icon" 
               className={`rounded-full shrink-0 h-11 w-11 transition-all ${
                 (newMessage.trim() || attachment) && !uploading
                   ? "bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                   : "bg-slate-800 text-slate-500 cursor-not-allowed"
               }`}
                disabled={(!newMessage.trim() && !attachment) || uploading}
             >
               {uploading ? (
                   <div className="w-5 h-5 border-2 border-slate-500/30 border-t-slate-300 animate-spin rounded-full" />
               ) : (
                   <Send size={18} className={(newMessage.trim() || attachment) ? "ml-1" : ""} />
               )}
             </Button>
          )}
        </form>
        )}
      </footer>
      </div>

      {/* Shared Media / Links Gallery */}
      <AnimatePresence>
        {showGallery && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute z-40 right-0 inset-y-0 w-full max-w-sm bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <h3 className="font-semibold text-slate-200">Shared Output</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowGallery(false)} className="h-8 w-8 text-slate-400 hover:text-white rounded-full">
                <X size={16} />
              </Button>
            </div>
            
            <div className="flex border-b border-slate-800 shrink-0">
               {(['media', 'links', 'docs'] as const).map(tab => (
                 <button 
                   key={tab}
                   onClick={() => setGalleryTab(tab)}
                   className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${galleryTab === tab ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                 >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                 </button>
               ))}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {galleryTab === 'media' && (
                <div className="grid grid-cols-3 gap-2">
                  {messages.filter(m => m.mediaUrl && (m.fileType === 'image' || m.fileType === 'video')).reverse().map((msg) => (
                    <div key={msg.id} className="aspect-square bg-slate-800 rounded-lg overflow-hidden relative group cursor-pointer" onClick={() => setPreviewMedia({url: msg.mediaUrl!, type: msg.fileType})}>
                      {msg.fileType === "image" ? (
                        <img src={msg.mediaUrl} alt="media" className="w-full h-full object-cover" />
                      ) : (
                        <video src={msg.mediaUrl} className="w-full h-full object-cover" />
                      )}
                      {msg.fileType === "video" && (
                         <div className="absolute top-1 right-1 bg-black/60 rounded p-0.5 text-white">
                            <Play size={10} fill="currentColor" />
                         </div>
                      )}
                      
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 size={24} className="text-white drop-shadow-md" />
                      </div>
                    </div>
                  ))}
                  {messages.filter(m => m.mediaUrl && (m.fileType === 'image' || m.fileType === 'video')).length === 0 && (
                    <div className="col-span-3 text-center p-8 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                      <ImageIcon size={32} className="mx-auto text-slate-600 mb-3" />
                      <p className="text-sm font-medium text-slate-400">No media found</p>
                      <p className="text-xs text-slate-500 mt-1">Photos and videos will appear here</p>
                    </div>
                  )}
                </div>
              )}

              {galleryTab === 'links' && (
                <div className="space-y-3">
                  {messages.flatMap(m => {
                     const urlRegex = /(https?:\/\/[^\s]+)/g;
                     const urls = m.text?.match(urlRegex) || [];
                     return urls.map((url, i) => ({ url, msg: m, id: `${m.id}-${i}` }));
                  }).reverse().map(({url, msg, id}) => (
                    <div key={id} className="bg-slate-800/80 hover:bg-slate-800 rounded-xl p-3 border border-slate-700/50 transition-colors">
                       <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                             <LinkIcon size={20} className="text-indigo-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-sm font-medium text-blue-400 truncate hover:underline">{url}</p>
                             <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                               <span>{msg.senderId === user?.uid ? 'You' : users.find(u => u.id === msg.senderId)?.displayName || 'Someone'}</span>
                               <span>{formatTimeIST(msg.createdAt)}</span>
                             </p>
                          </div>
                       </a>
                    </div>
                  ))}
                  {messages.filter(m => /(https?:\/\/[^\s]+)/g.test(m.text || "")).length === 0 && (
                    <div className="text-center p-8 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                      <LinkIcon size={32} className="mx-auto text-slate-600 mb-3" />
                      <p className="text-sm font-medium text-slate-400">No links found</p>
                    </div>
                  )}
                </div>
              )}

              {galleryTab === 'docs' && (
                <div className="space-y-2">
                  {messages.filter(m => m.mediaUrl && m.fileType !== 'image' && m.fileType !== 'video').reverse().map((msg) => (
                    <a key={msg.id} href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700/80 rounded-xl border border-slate-700/50 transition-colors">
                       <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                          <FileIcon size={20} className="text-rose-400" />
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">{msg.fileName || 'Document'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                             {formatTimeIST(msg.createdAt)}
                          </p>
                       </div>
                    </a>
                  ))}
                  {messages.filter(m => m.mediaUrl && m.fileType !== 'image' && m.fileType !== 'video').length === 0 && (
                    <div className="text-center p-8 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                      <FileIcon size={32} className="mx-auto text-slate-600 mb-3" />
                      <p className="text-sm font-medium text-slate-400">No documents found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Preview Modal */}
      <AnimatePresence>
        {previewMedia && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
            onClick={() => setPreviewMedia(null)}
          >
            <Button 
               variant="ghost" size="icon" 
               className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 hover:bg-black/70 rounded-full z-10"
               onClick={() => setPreviewMedia(null)}
            >
              <X size={24} />
            </Button>
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-full max-h-full"
              onClick={e => e.stopPropagation()}
            >
              {previewMedia.type === 'image' ? (
                <img src={previewMedia.url} alt="preview fullscreen" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
              ) : (
                <video src={previewMedia.url} controls autoPlay className="max-w-full max-h-[85vh] rounded-xl shadow-2xl outline-none ring-1 ring-white/10" />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {confirmDialog?.isOpen && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
               <h3 className="text-lg font-semibold text-white mb-2">{confirmDialog.title}</h3>
               <p className="text-slate-400 text-sm mb-6">{confirmDialog.message}</p>
               <div className="flex justify-end gap-3">
                 <Button variant="ghost" className="text-slate-300 hover:text-white" onClick={() => setConfirmDialog(null)}>Cancel</Button>
                 <Button variant="danger" onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}>Confirm</Button>
               </div>
             </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteMessageDialog?.isOpen && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-[300px] w-full shadow-2xl flex flex-col gap-2">
               <h3 className="text-lg font-semibold text-white mb-2">Delete Message</h3>
               
               {deleteMessageDialog.isMine && (
                 <Button variant="danger" className="w-full justify-center" onClick={() => executeDeleteMessage(deleteMessageDialog.messageId, 'everyone')}>
                   Delete for everyone
                 </Button>
               )}
               
               <Button variant="outline" className="w-full justify-center border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800" onClick={() => executeDeleteMessage(deleteMessageDialog.messageId, 'me')}>
                 Delete for me
               </Button>
               
               <Button variant="ghost" className="w-full justify-center text-slate-400 mt-2" onClick={() => setDeleteMessageDialog(null)}>
                 Cancel
               </Button>
             </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForwardModal?.isOpen && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl flex flex-col max-h-[80vh]">
               <h3 className="text-lg font-semibold text-white mb-4">Forward Message To</h3>
               <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                  {users.filter(u => u.id !== user?.uid).map(u => (
                     <div key={u.id} className="flex items-center justify-between p-2 hover:bg-slate-800 rounded-lg cursor-pointer border border-transparent hover:border-slate-700" onClick={async () => {
                        const targetChatId = u.id > user!.uid ? `${user!.uid}_${u.id}` : `${u.id}_${user!.uid}`;
                        try {
                           const targetDoc = await getDoc(doc(db, "chats", targetChatId));
                           if (!targetDoc.exists()) {
                              await setDoc(doc(db, "chats", targetChatId), {
                                 participants: [user!.uid, u.id], updatedAt: Date.now(), isGroup: false
                              });
                           }
                           const msgRef = doc(collection(db, `chats/${targetChatId}/messages`));
                           await setDoc(msgRef, {
                              text: showForwardModal.message.text || "",
                              mediaUrl: showForwardModal.message.mediaUrl || null,
                              fileType: showForwardModal.message.fileType || null,
                              fileName: showForwardModal.message.fileName || null,
                              senderId: user!.uid,
                              createdAt: Date.now(),
                              status: 'sent',
                              isEdited: false,
                              forwarded: true
                           });
                           await updateDoc(doc(db, "chats", targetChatId), {
                              lastMessageText: "Forwarded message",
                              lastMessageId: msgRef.id,
                              updatedAt: Date.now(),
                           });
                           setShowForwardModal(null);
                        } catch(e) { handleFirestoreError(e, OperationType.WRITE, `chats/${targetChatId}`); }
                     }}>
                        <div className="flex items-center gap-3">
                           <Avatar src={u.privacyPhoto === 'nobody' ? undefined : u.photoURL} fallback={u.displayName} size="sm" />
                           <span className="text-sm font-medium text-slate-200">{u.displayName}</span>
                        </div>
                        <Forward size={16} className="text-slate-500" />
                     </div>
                  ))}
               </div>
               <Button variant="ghost" className="w-full justify-center text-slate-400 mt-4" onClick={() => setShowForwardModal(null)}>
                 Cancel
               </Button>
             </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGroupSettings && chatMeta?.isGroup && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
             <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl flex flex-col">
               <h3 className="text-lg font-semibold text-white mb-1">Group Settings</h3>
               <p className="text-xs text-slate-400 mb-6">Manage who can do what in this group.</p>
               
               <div className="space-y-4 mb-6">
                 <div className="flex items-center justify-between">
                    <div>
                       <p className="text-sm font-medium text-slate-200">Only Admins can send messages</p>
                       <p className="text-xs text-slate-500">Regular members will be muted.</p>
                    </div>
                    <input 
                       type="checkbox" 
                       className="w-4 h-4 bg-slate-800 border-slate-700 rounded text-indigo-500 focus:ring-indigo-500"
                       checked={chatMeta.adminsOnlySend || false}
                       onChange={async (e) => {
                          try {
                             await updateDoc(doc(db, "chats", userId!), { adminsOnlySend: e.target.checked });
                          } catch(err) { handleFirestoreError(err, OperationType.WRITE, `chats/${userId}`); }
                       }}
                       disabled={!chatMeta.groupAdmins?.includes(user?.uid)}
                    />
                 </div>
                 <div className="flex items-center justify-between">
                    <div>
                       <p className="text-sm font-medium text-slate-200">Only Admins can edit group info</p>
                       <p className="text-xs text-slate-500">Group name, image, description.</p>
                    </div>
                    <input 
                       type="checkbox" 
                       className="w-4 h-4 bg-slate-800 border-slate-700 rounded text-indigo-500 focus:ring-indigo-500"
                       checked={chatMeta.adminsOnlyInfo || false}
                       onChange={async (e) => {
                          try {
                             await updateDoc(doc(db, "chats", userId!), { adminsOnlyInfo: e.target.checked });
                          } catch(err) { handleFirestoreError(err, OperationType.WRITE, `chats/${userId}`); }
                       }}
                       disabled={!chatMeta.groupAdmins?.includes(user?.uid)}
                    />
                 </div>
                 
                 <div className="pt-4 border-t border-slate-800">
                    <p className="text-sm font-medium text-slate-200 mb-2">Group Admins ({chatMeta.groupAdmins?.length})</p>
                    <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
                       {chatMeta.groupAdmins?.map((adminId: string) => {
                          const a = users.find(u => u.id === adminId);
                          return (
                             <div key={adminId} className="flex items-center gap-2">
                                <Avatar src={a?.photoURL} fallback={a?.displayName || "Admin"} size="sm" />
                                <span className="text-xs text-slate-300">{a?.displayName || "Unknown User"} {adminId === user?.uid ? "(You)" : ""}</span>
                             </div>
                          );
                       })}
                    </div>
                 </div>
               </div>
               
               <Button variant="outline" className="w-full justify-center border-slate-700 text-slate-300 hover:text-white" onClick={() => setShowGroupSettings(false)}>
                 Close
               </Button>
             </motion.div>
           </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

