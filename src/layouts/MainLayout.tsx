import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar";
import { BottomNav } from "../components/layout/BottomNav";
import { CallManager } from "../components/call/CallManager";
import { SetupProfileModal } from "../components/auth/SetupProfileModal";
import { NotificationBanner } from "../components/layout/NotificationBanner";

export default function MainLayout() {
  return (
    <div className="h-[100dvh] bg-slate-950 text-slate-100 flex flex-col md:flex-row relative selection:bg-indigo-500/30">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/20 blur-[120px]" />
      </div>

      <NotificationBanner />
      <CallManager />
      <SetupProfileModal />
      <Sidebar />
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative z-10 bg-slate-950/40 pb-16 md:pb-0">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
