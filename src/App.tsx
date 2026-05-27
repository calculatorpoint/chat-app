/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthLayout from "./layouts/AuthLayout";
import MainLayout from "./layouts/MainLayout";
import AdminLayout from "./layouts/AdminLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ChatView from "./pages/ChatView";
import CallView from "./pages/CallView";
import CallHistoryView from "./pages/CallHistoryView";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminReports from "./pages/admin/AdminReports";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminBroadcasts from "./pages/admin/AdminBroadcasts";
import AdminModeration from "./pages/admin/AdminModeration";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuthInit } from "./hooks/useAuthInit";
import { useNotifications } from "./hooks/useNotifications";

function AppContent() {
  useAuthInit();
  useNotifications();

  return (
    <Routes>
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Main App Routes */}
      <Route element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route path="/" element={<Dashboard />} />
        <Route path="/chat/:userId" element={<ChatView />} />
        <Route path="/call/:callId" element={<CallView />} />
        <Route path="/calls" element={<CallHistoryView />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute requireAdmin={true}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="logs" element={<AdminAuditLogs />} />
        <Route path="analytics" element={<Navigate to="/admin" replace />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="broadcasts" element={<AdminBroadcasts />} />
        <Route path="moderation" element={<AdminModeration />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

