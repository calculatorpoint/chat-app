import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import React from "react";
import { AlertTriangle, Wrench } from "lucide-react";
import AppLockWrapper from "./AppLockWrapper";

export default function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { user, loading, isAdmin, systemSettings } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 animate-spin rounded-full relative z-10" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Maintenance mode check
  if (systemSettings?.maintenanceMode && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
         <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mb-6">
           <Wrench size={40} className="text-rose-500" />
         </div>
         <h1 className="text-3xl font-bold text-slate-100 mb-4">We are under maintenance</h1>
         <p className="text-slate-400 max-w-md">
           NovaChat is currently undergoing scheduled maintenance. We'll be back online shortly!
         </p>
         <button onClick={() => useAuthStore.getState().logout()} className="mt-8 text-sm text-indigo-400 hover:underline">
            Logout
         </button>
      </div>
    );
  }

  return (
    <AppLockWrapper userId={user.uid}>
       {children}
    </AppLockWrapper>
  );
}
