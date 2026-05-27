import React, { useState, useEffect } from "react";
import { Lock, ShieldCheck, Fingerprint, Delete } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AppLockWrapper({ children, userId }: { children: React.ReactNode, userId: string }) {
  const [isLocked, setIsLocked] = useState(false);
  const [pinState, setPinState] = useState("");
  const [error, setError] = useState(false);
  
  const savedPin = localStorage.getItem(`nova_chat_pin_${userId}`);

  useEffect(() => {
    if (savedPin) {
      setIsLocked(true);
    }
  }, [savedPin]);

  const handleKeyPress = (num: number) => {
    if (pinState.length < 4) {
      const newPin = pinState + num;
      setPinState(newPin);
      
      if (newPin.length === 4) {
        if (newPin === savedPin) {
          setIsLocked(false);
        } else {
          setError(true);
          setTimeout(() => {
            setPinState("");
            setError(false);
          }, 500);
        }
      }
    }
  };

  const handleDelete = () => {
    setPinState(p => p.slice(0, -1));
  };

  if (!isLocked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col items-center justify-center">
       <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[100px]" />
          <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-rose-500/10 rounded-full blur-[100px]" />
       </div>

       <motion.div 
         initial={{ opacity: 0, scale: 0.9 }}
         animate={{ opacity: 1, scale: 1 }}
         className="relative z-10 w-full max-w-sm px-6 flex flex-col items-center"
       >
          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-8 border border-slate-800 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
             <ShieldCheck size={32} className="text-indigo-400" />
          </div>
          
          <h2 className="text-2xl font-semibold mb-2">App Locked</h2>
          <p className="text-slate-400 text-sm mb-10">Enter your 4-digit PIN to continue</p>

          <AnimatePresence>
            <motion.div 
               animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
               transition={{ duration: 0.3 }}
               className="flex gap-4 mb-12"
            >
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`w-4 h-4 rounded-full transition-all ${pinState.length > i ? 'bg-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-slate-800'}`}></div>
              ))}
            </motion.div>
          </AnimatePresence>

          <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
             {[1,2,3,4,5,6,7,8,9].map(num => (
                <button 
                  key={num} 
                  onClick={() => handleKeyPress(num)}
                  className="w-16 h-16 rounded-full bg-slate-900 hover:bg-slate-800 border-none transition-colors text-2xl font-light mx-auto flex items-center justify-center"
                >
                  {num}
                </button>
             ))}
             <div className="w-16 h-16" /> {/* Empty spot */}
             <button 
                onClick={() => handleKeyPress(0)}
                className="w-16 h-16 rounded-full bg-slate-900 hover:bg-slate-800 border-none transition-colors text-2xl font-light mx-auto flex items-center justify-center"
             >
                0
             </button>
             <button 
                onClick={handleDelete}
                className="w-16 h-16 rounded-full hover:bg-slate-900/50 border-none transition-colors text-slate-400 mx-auto flex items-center justify-center"
             >
                <Delete size={24} />
             </button>
          </div>
       </motion.div>
    </div>
  );
}
