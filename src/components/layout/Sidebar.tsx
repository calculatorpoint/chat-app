import { cn } from "@/lib/utils";
import { MessageSquare, Phone, Shield, User } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { useAuthStore } from "@/store/useAuthStore";
import { Avatar } from "@/components/ui/Avatar";

const NAV_ITEMS = [
  { icon: MessageSquare, label: "Chats", path: "/" },
  { icon: Phone, label: "Calls", path: "/calls" },
  { icon: User, label: "Profile", path: "/profile" },
  { icon: Shield, label: "Admin", path: "/admin" },
];

export function Sidebar() {
  const location = useLocation();
  const { user, isAdmin } = useAuthStore();
  
  const items = NAV_ITEMS.filter(item => 
    item.path !== '/admin' || isAdmin
  );

  return (
    <aside className="w-20 lg:w-64 border-r border-slate-800/80 bg-slate-950/80 hidden md:flex flex-col p-4 backdrop-blur-xl relative z-20">
      <div className="flex items-center justify-center lg:justify-start mb-8 lg:px-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
          <span className="text-white font-bold text-xl">N</span>
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 hidden lg:block ml-3 truncate">
          NovaChat
        </h1>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {items.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex items-center gap-3 p-3 lg:px-4 rounded-xl transition-colors duration-200 group text-slate-400 hover:text-slate-100",
                isActive && "text-slate-100"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute inset-0 bg-indigo-500/10 rounded-xl border border-indigo-500/20"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon className="w-6 h-6 relative z-10 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
              <span className="font-medium hidden lg:block relative z-10 text-sm whitespace-nowrap">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {user && (
        <div className="mt-auto lg:px-2 flex items-center justify-center lg:justify-start gap-3">
          <Avatar src={user.photoURL || undefined} fallback={user.displayName || "User"} size="md" />
          <div className="hidden lg:block overflow-hidden">
            <p className="text-sm font-medium text-slate-200 truncate">{user.displayName || user.email}</p>
            <p className="text-xs text-emerald-400 font-medium truncate flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block"></span>
              Online
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
