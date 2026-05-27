import { cn } from "@/lib/utils";
import { MessageSquare, Phone, User, Shield } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { useAuthStore } from "@/store/useAuthStore";

const NAV_ITEMS = [
  { icon: MessageSquare, label: "Chats", path: "/" },
  { icon: Phone, label: "Calls", path: "/calls" },
  { icon: User, label: "Profile", path: "/profile" },
  { icon: Shield, label: "Admin", path: "/admin" },
];

export function BottomNav() {
  const location = useLocation();
  
  const { isAdmin } = useAuthStore();
  
  const items = NAV_ITEMS.filter(item => 
    item.path !== '/admin' || isAdmin
  );

  const isChatRoute = location.pathname.startsWith('/chat/');
  if (isChatRoute) return null;

  return (
    <nav className="md:hidden border-t border-slate-800 bg-slate-950/80 backdrop-blur-xl p-2 pb-safe flex justify-around items-center z-50 rounded-t-2xl shadow-[0_-10px_40px_-5px_rgba(0,0,0,0.5)] fixed bottom-0 left-0 right-0">
      {items.map((item) => {
        const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              "relative flex flex-col items-center p-2 rounded-xl transition-colors duration-200 text-slate-500 hover:text-slate-300 w-16",
              isActive && "text-indigo-400"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="active-bottom-nav"
                className="absolute inset-x-0 -top-2 flex justify-center"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                <div className="w-10 h-1 bg-indigo-500 rounded-b-full shadow-[0_0_10px_#6366f1]" />
              </motion.div>
            )}
            <item.icon className="w-6 h-6 mb-1" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium truncate">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
