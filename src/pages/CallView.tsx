import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useWebRTC } from "@/hooks/useWebRTC";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Phone, MonitorUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "motion/react";
import { Avatar } from "@/components/ui/Avatar";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { RingtonePlayer } from '@/utils/ringtone';

function VideoPlayer({ stream, muted = false, className }: { stream: MediaStream | null, muted?: boolean, className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  return <video ref={videoRef} autoPlay playsInline muted={muted} className={`object-cover bg-slate-900 ${className || ''}`} />;
}

export default function CallView() {
  const { callId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const isCaller = searchParams.get("isCaller") === "true";
  const targetId = searchParams.get("target");
  const withVideo = searchParams.get("video") === "true";
  
  const { localStream, remoteStream, error, status, handleEndCall, toggleMute, toggleVideoFn, toggleScreenShare } = useWebRTC(
    callId as string, 
    isCaller, 
    targetId, 
    withVideo
  );

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!withVideo);
  const [targetUser, setTargetUser] = useState<any>(null);
  const ringtonePlayerRef = useRef<RingtonePlayer | null>(null);

  useEffect(() => {
    if (!ringtonePlayerRef.current) {
      ringtonePlayerRef.current = new RingtonePlayer();
    }
    return () => {
      ringtonePlayerRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (isCaller && (status === 'connecting' || status === 'calling' || status === 'ringing')) {
       ringtonePlayerRef.current?.start('outgoing');
    } else {
       ringtonePlayerRef.current?.stop();
    }
  }, [status, isCaller]);

  useEffect(() => {
    if (targetId) {
      getDoc(doc(db, "users", targetId)).then(d => {
        if (d.exists()) setTargetUser(d.data());
      });
    }
  }, [targetId]);

  const onToggleMute = () => {
    setIsMuted(toggleMute());
  };

  const onToggleVideo = () => {
    setIsVideoOff(toggleVideoFn());
  };

  if (error) {
    return (
      <div className="flex-1 bg-black flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-rose-500/10 text-rose-500 p-8 rounded-3xl border border-rose-500/20 text-center max-w-md backdrop-blur-md"
        >
          <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-4">
             <VideoOff size={32} />
          </div>
          <p className="font-semibold text-lg mb-2">Device Access Failed</p>
          <p className="text-sm text-rose-400/80">{error}</p>
          <Button onClick={() => navigate(-1)} className="mt-8 rounded-full bg-slate-800 hover:bg-slate-700 text-white border-0" variant="secondary">Go Back</Button>
        </motion.div>
      </div>
    );
  }

  // Animation variants
  const pulseVariant = {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [0.5, 0.8, 0.5],
      transition: { repeat: Infinity, duration: 2, ease: "easeInOut" }
    }
  };

  return (
    <div className="flex-1 bg-slate-950 flex flex-col relative overflow-hidden h-full z-50 selection:bg-indigo-500/30">
      
      {/* Dynamic Background during connecting/ringing */}
      {!remoteStream && (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <motion.div variants={pulseVariant} animate="animate" className="absolute w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] bg-indigo-500/20 rounded-full blur-[100px]" />
          <motion.div variants={pulseVariant} animate="animate" style={{ animationDelay: '0.5s' }} className="absolute w-[40vw] h-[40vw] max-w-[400px] max-h-[400px] bg-rose-500/10 rounded-full blur-[80px]" />
        </div>
      )}

      {/* Main Remote Video */}
      <AnimatePresence mode="popLayout">
        {remoteStream ? (
           <motion.div 
             key="remote-stream"
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="absolute inset-0 pointer-events-none"
           >
             <VideoPlayer stream={remoteStream} className="w-full h-full" />
           </motion.div>
        ) : (
           <motion.div 
             key="remote-placeholder"
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="absolute inset-0 flex flex-col items-center justify-center z-10"
           >
             <div className="relative mb-8">
               <motion.div variants={pulseVariant} animate="animate" className="absolute inset-0 bg-indigo-500/20 rounded-full scale-150" />
               <Avatar 
                 src={targetUser?.photoURL} 
                 fallback={targetUser?.displayName} 
                 size="xl" 
                 className="w-32 h-32 border-4 border-slate-900 shadow-2xl relative z-10"
               />
             </div>
             <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-md">{targetUser?.displayName || "Unknown User"}</h2>
             <p className="text-indigo-400 font-medium text-lg tracking-widest uppercase drop-shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                {status}
             </p>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Local Video Mini-Window (Draggable) */}
      <motion.div 
         drag
         dragConstraints={{ left: 16, right: window.innerWidth - 110, top: 16, bottom: window.innerHeight - 200 }}
         dragElastic={0.1}
         initial={{ opacity: 0, scale: 0.8, x: window.innerWidth - 140, y: 32 }}
         animate={{ opacity: 1, scale: 1 }}
         whileDrag={{ scale: 1.05, cursor: "grabbing" }}
         className="absolute w-28 h-40 md:w-48 md:h-72 bg-slate-900 rounded-3xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-slate-700/50 z-30 cursor-grab"
      >
         {localStream && !isVideoOff ? (
            <VideoPlayer stream={localStream} muted={true} className="w-full h-full transform -scale-x-100" />
         ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 border border-slate-800">
               <VideoOff className="text-slate-600 mb-2" size={28} />
               <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Video Off</p>
            </div>
         )}
      </motion.div>
      
      {/* Top Header Gradient */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-20 flex px-6 py-8 pointer-events-none transition-opacity duration-500">
         <div className="flex flex-col">
            <h2 className="text-white text-xl font-semibold drop-shadow-md flex items-center gap-2">
              <Phone size={18} className="text-indigo-400" /> End-to-End Encrypted
            </h2>
            <p className="text-slate-300/80 text-sm font-medium drop-shadow-md">NovaChat Secure Call</p>
         </div>
      </div>

      {/* Modern Call Controls */}
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="absolute bottom-10 inset-x-0 flex justify-center z-30 pointer-events-none"
      >
        <div className="flex items-center gap-4 p-4 rounded-[2rem] bg-slate-950/60 backdrop-blur-2xl border border-slate-800/60 shadow-[0_20px_40px_rgba(0,0,0,0.4)] pointer-events-auto">
          <Button 
            onClick={onToggleMute} 
            variant="ghost"
            className={`rounded-full w-14 h-14 p-0 shrink-0 border border-transparent transition-all duration-300 ${
              isMuted ? 'bg-slate-800/80 text-rose-400 border-rose-500/20' : 'bg-slate-800/50 text-white hover:bg-slate-700'
            }`}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </Button>
          
          <Button 
            onClick={handleEndCall} 
            variant="danger" 
            className="rounded-full w-16 h-16 p-0 shrink-0 flex items-center justify-center mx-2 shadow-lg shadow-rose-500/20 hover:scale-105 transition-transform"
          >
            <PhoneOff size={28} />
          </Button>

          <Button 
            onClick={onToggleVideo} 
            variant="ghost"
            className={`rounded-full w-14 h-14 p-0 shrink-0 border border-transparent transition-all duration-300 ${
              isVideoOff ? 'bg-slate-800/80 text-rose-400 border-rose-500/20' : 'bg-slate-800/50 text-white hover:bg-slate-700'
            }`}
          >
            {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
          </Button>
          <Button 
            onClick={toggleScreenShare} 
            variant="ghost"
            title="Share Screen"
            className="rounded-full w-14 h-14 p-0 shrink-0 border border-transparent transition-all duration-300 bg-slate-800/50 text-white hover:bg-slate-700"
          >
            <MonitorUp size={24} />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
