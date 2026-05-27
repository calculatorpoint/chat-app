import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function NotificationBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const isDismissed = localStorage.getItem('nova_chat_notif_dismissed');
      if (!isDismissed) {
         setShow(true);
      }
    }
  }, []);

  const handleEnable = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setShow(false);
      }
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('nova_chat_notif_dismissed', 'true');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-2 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-md bg-indigo-500/90 backdrop-blur-lg border border-indigo-400 rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
             <div className="bg-indigo-900/50 p-2 rounded-full">
                <Bell size={20} className="text-indigo-100" />
             </div>
             <div>
                <p className="text-sm font-semibold text-white">Enable Notifications</p>
                <p className="text-xs text-indigo-100">Get alerted for new messages and calls.</p>
             </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
             <button
               onClick={handleEnable}
               className="text-xs font-bold bg-white text-indigo-600 hover:bg-slate-100 py-1.5 px-3 rounded-full transition-colors"
             >
               Allow
             </button>
             <button
               onClick={handleDismiss}
               className="text-indigo-100 hover:text-white p-1 rounded-full hover:bg-indigo-600/50 transition-colors"
             >
               <X size={16} />
             </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
