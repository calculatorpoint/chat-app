import { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType, auth } from "@/services/firebase";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Search, Ban, Trash2, Edit2, ShieldAlert, CheckCircle2, UserX, Download } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { motion } from "motion/react";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { adminRole } = useAuthStore();

  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "users");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleRole = async (userId: string, newRole: 'user' | 'moderator' | 'admin') => {
    try {
      await updateDoc(doc(db, "users", userId), { 
        isAdmin: newRole === 'admin' || newRole === 'moderator',
        isModerator: newRole === 'moderator',
        adminRole: newRole === 'admin' ? 'super_admin' : newRole === 'moderator' ? 'moderator' : null
      });
      // Create Audit Log
      await setDoc(doc(collection(db, "auditLogs")), {
        adminId: auth.currentUser?.uid,
        action: "UPDATE_ROLE",
        target: userId,
        timestamp: Date.now(),
        details: `Updated role to ${newRole}`
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${userId}`);
    }
  };

  const handleToggleBan = async (userId: string, currentStatus: boolean, advanced: boolean = false) => {
    try {
      await updateDoc(doc(db, "users", userId), { 
        isBanned: !currentStatus,
        banReason: advanced ? "advanced_ip_mac_ban" : null 
      });
      // Create Audit Log
      await setDoc(doc(collection(db, "auditLogs")), {
        adminId: auth.currentUser?.uid,
        action: !currentStatus ? "BAN_USER" : "UNBAN_USER",
        target: userId,
        timestamp: Date.now(),
        details: advanced ? `Advanced globally banned user` : `Updated ban status to ${!currentStatus}`
      });
      
      if (advanced && !currentStatus) {
         // Optionally, add to a global blacklist collection
         await setDoc(doc(db, "settings", `blacklist_${userId}`), {
            userId: userId,
            bannedAt: Date.now(),
            reason: "Advanced IP / Mac Ban"
         });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${userId}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      // Create Audit Log
      await setDoc(doc(collection(db, "auditLogs")), {
        adminId: auth.currentUser?.uid,
        action: "DELETE_USER",
        target: userId,
        timestamp: Date.now(),
        details: `Deleted user completely`
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${userId}`);
    }
  };

  const handleExportCSV = () => {
    const headers = "ID,Name,Email,Mobile,Status,Role,Joined\n";
    const csvContent = headers + users.map(u => {
      return `${u.id},"${u.displayName || ''}","${u.email || ''}","${u.mobileNumber || ''}",${u.isBanned ? 'Banned' : 'Active'},${u.isAdmin ? 'Admin' : 'User'},"${new Date(u.createdAt).toISOString()}"`;
    }).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `users_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = users.filter(
    (u) =>
      u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-orange-400">
            User Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage and moderate platform users</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Input
            icon={<Search size={18} />}
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-full bg-slate-900 border-slate-700/50 focus:border-rose-500/50 focus:ring-rose-500/20 w-full sm:w-64"
          />
          <Button 
            onClick={handleExportCSV}
            variant="outline"
            className="rounded-full border-slate-700/50 bg-slate-900 hover:bg-slate-800 text-slate-300 gap-2 shrink-0"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </header>

      <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-400">
            <thead className="text-xs text-slate-500 uppercase bg-slate-900/80 border-b border-slate-800">
              <tr>
                <th className="px-6 py-5 font-semibold text-slate-300">User</th>
                <th className="px-6 py-5 font-semibold text-slate-300">Status</th>
                <th className="px-6 py-5 font-semibold text-slate-300">Role</th>
                <th className="px-6 py-5 font-semibold text-slate-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="w-8 h-8 border-2 border-rose-500/30 border-t-rose-500 animate-spin rounded-full mx-auto shadow-lg shadow-rose-500/20" />
                    <p className="mt-4 text-sm text-slate-500">Loading users...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex justify-center mb-3">
                      <UserX size={32} className="text-slate-600" />
                    </div>
                    No users found matching "{search}"
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="border-b border-slate-800/30 hover:bg-slate-800/40 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <Avatar src={u.photoURL} fallback={u.displayName} size="md" className="ring-2 ring-slate-800 group-hover:ring-slate-700 transition-all" />
                        <div>
                          <p className="font-semibold text-slate-200 group-hover:text-white transition-colors">{u.displayName}</p>
                          <div className="text-xs text-slate-500 flex flex-col gap-0.5 mt-0.5">
                            <span>{u.email}</span>
                            {u.mobileNumber && <span className="text-indigo-400">📞 {u.mobileNumber}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.isBanned ? (
                         <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-semibold border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]">
                          <Ban size={12} /> Banned
                        </span>
                      ) : u.isOnline ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-semibold border border-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          Offline
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {u.isAdmin ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold uppercase tracking-wider border border-rose-500/20">
                          <ShieldAlert size={12} /> Admin
                        </span>
                      ) : u.isModerator ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/20">
                          <ShieldAlert size={12} /> Mod
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider border border-slate-700">
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-60 group-hover:opacity-100 transition-opacity flex-wrap justify-end">
                        {adminRole === 'super_admin' && (
                           <div className="relative group/menu">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-300"
                              >
                                Change Role
                              </Button>
                              <div className="absolute right-0 top-full mt-1 w-32 bg-slate-800 border border-slate-700 rounded-xl shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-50 flex flex-col p-1">
                                 <button onClick={() => handleToggleRole(u.id, 'user')} className="text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 rounded-md">User</button>
                                 <button onClick={() => handleToggleRole(u.id, 'moderator')} className="text-left px-3 py-2 text-xs text-indigo-400 hover:bg-slate-700 rounded-md">Moderator</button>
                                 <button onClick={() => handleToggleRole(u.id, 'admin')} className="text-left px-3 py-2 text-xs text-rose-400 hover:bg-slate-700 rounded-md">Admin</button>
                              </div>
                           </div>
                        )}
                        {adminRole === 'super_admin' ? (
                          <div className="relative group/banmenu">
                             <Button 
                               onClick={() => handleToggleBan(u.id, !!u.isBanned)}
                               size="icon" 
                               variant="ghost" 
                               className="h-8 w-8 text-slate-400 hover:text-orange-400 hover:bg-orange-500/10"
                               title={u.isBanned ? "Unban" : "Ban"}
                             >
                               {u.isBanned ? <CheckCircle2 size={15} /> : <Ban size={15} />}
                             </Button>
                             {!u.isBanned && (
                               <div className="absolute right-0 top-full mt-1 w-36 bg-slate-800 border border-slate-700 rounded-xl shadow-xl opacity-0 invisible group-hover/banmenu:opacity-100 group-hover/banmenu:visible transition-all z-50 flex flex-col p-1">
                                  <button onClick={() => handleToggleBan(u.id, false, true)} className="text-left px-3 py-2 text-xs text-rose-400 hover:bg-slate-700 rounded-md">Advanced Ban (IP/Mac)</button>
                               </div>
                             )}
                          </div>
                        ) : (
                          <Button 
                            onClick={() => handleToggleBan(u.id, !!u.isBanned)}
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-slate-400 hover:text-orange-400 hover:bg-orange-500/10"
                            title={u.isBanned ? "Unban" : "Ban"}
                          >
                            {u.isBanned ? <CheckCircle2 size={15} /> : <Ban size={15} />}
                          </Button>
                        )}
                        {adminRole === 'super_admin' && (
                          <Button 
                            onClick={() => handleDeleteUser(u.id)}
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                            title="Delete User"
                          >
                            <Trash2 size={15} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}
