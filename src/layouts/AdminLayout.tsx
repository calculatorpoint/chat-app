import { Outlet, NavLink } from "react-router-dom";
import { Users, Activity, Settings, ArrowLeft, Flag, History, Megaphone, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

export default function AdminLayout() {
  const { adminRole } = useAuthStore();

  const NAV_ITEMS = [
    { icon: Activity, label: "Analytics", path: "/admin" },
    { icon: Users, label: "Users & Roles", path: "/admin/users" },
    { icon: Flag, label: "Reports", path: "/admin/reports" },
    { icon: ShieldAlert, label: "Moderation", path: "/admin/moderation" },
    { icon: Megaphone, label: "Broadcasts", path: "/admin/broadcasts" },
    { icon: History, label: "Audit Logs", path: "/admin/logs" },
    ...(adminRole === 'super_admin' ? [{ icon: Settings, label: "Settings & Export", path: "/admin/settings" }] : []),
  ];
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex relative selection:bg-rose-500/30">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] rounded-full bg-rose-900/10 blur-[150px]" />
      </div>

      {/* Admin Sidebar */}
      <aside className="w-16 lg:w-64 border-r border-slate-800/80 bg-slate-950/80 flex flex-col p-4 z-10 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-3 mb-8 lg:px-2">
          <div className="w-8 h-8 rounded bg-rose-500/20 flex items-center justify-center border border-rose-500/30 text-rose-500 shrink-0">
            <Shield size={16} />
          </div>
          <h1 className="text-xs font-bold text-rose-500 uppercase tracking-widest hidden lg:block">Admin</h1>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/admin"}
              className={({ isActive }) => cn(
                "flex items-center gap-3 p-3 lg:px-4 rounded-xl transition-colors duration-200 text-slate-400 hover:text-slate-100 group",
                isActive && "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              )}
            >
              <item.icon size={20} className="shrink-0" />
              <span className="font-medium text-sm hidden lg:block">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto">
          <NavLink
            to="/"
            className="flex items-center gap-3 p-3 lg:px-4 rounded-xl text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft size={20} className="shrink-0" />
            <span className="font-medium text-sm hidden lg:block">Exit Admin</span>
          </NavLink>
        </div>
      </aside>
      
      {/* Admin Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full h-[100dvh] relative z-10 bg-slate-950/40">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// Quick component for shield icon since it's not imported at top
function Shield(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
}
