import { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType, auth } from "@/services/firebase";
import { Card, CardContent } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, Ban, Trash2, CheckCircle2, Download } from "lucide-react";
import { formatTimeIST } from "@/utils/date";
import { useAuthStore } from "@/store/useAuthStore";

import { motion } from "motion/react";

export default function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { adminRole } = useAuthStore();

  useEffect(() => {
    const q = query(collection(db, "reports"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const rep = { id: docSnap.id, ...docSnap.data() } as any;
        // Fetch reporter and reported user details if needed, but for simplicity let's assume we have names
        return rep;
      }));
      // Sort by createdAt desc
      data.sort((a, b) => b.createdAt - a.createdAt);
      setReports(data);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "reports");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleResolveReport = async (reportId: string) => {
    try {
      await updateDoc(doc(db, "reports", reportId), { status: "resolved" });
      await setDoc(doc(collection(db, "auditLogs")), {
        adminId: auth.currentUser?.uid,
        action: "RESOLVE_REPORT",
        target: reportId,
        timestamp: Date.now(),
        details: "Marked report as resolved"
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `reports/${reportId}`);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("Delete this report?")) return;
    try {
      await deleteDoc(doc(db, "reports", reportId));
      await setDoc(doc(collection(db, "auditLogs")), {
        adminId: auth.currentUser?.uid,
        action: "DELETE_REPORT",
        target: reportId,
        timestamp: Date.now(),
        details: "Deleted report entirely"
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `reports/${reportId}`);
    }
  };

  const handleBanUserFromReport = async (userId: string, reportId: string) => {
    if (!confirm("Are you sure you want to ban this user?")) return;
    try {
      await updateDoc(doc(db, "users", userId), { isBanned: true });
      await updateDoc(doc(db, "reports", reportId), { status: "resolved" });
      await setDoc(doc(collection(db, "auditLogs")), {
        adminId: auth.currentUser?.uid,
        action: "BAN_USER",
        target: userId,
        timestamp: Date.now(),
        details: `Banned user from report ${reportId}`
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${userId}`);
    }
  };

  const handleExportCSV = () => {
    const headers = "ID,MessageId,ReportedBy,ReportedUser,Reason,Status,Date\n";
    const csvContent = headers + reports.map(r => {
      return `${r.id},${r.messageId},${r.reporterId},${r.reportedUserId},"${r.reason}","${r.status}",${new Date(r.createdAt).toISOString()}`;
    }).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reports_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-orange-400">
            Content Moderation
          </h1>
          <p className="text-slate-400 text-sm mt-1">Review reported messages and take action</p>
        </div>
        <Button 
          onClick={handleExportCSV}
          variant="outline"
          className="rounded-full border-slate-700/50 bg-slate-900 hover:bg-slate-800 text-slate-300 gap-2 shrink-0"
        >
          <Download size={16} />
          Export Reports
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
           <div className="p-12 text-center">
             <div className="w-8 h-8 border-2 border-rose-500/30 border-t-rose-500 animate-spin rounded-full mx-auto" />
           </div>
        ) : reports.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/50 text-center py-12">
            <CheckCircle2 size={40} className="mx-auto text-emerald-500/50 mb-3" />
            <p className="text-slate-400">Hooray! No pending reports.</p>
          </Card>
        ) : reports.map(r => (
          <Card key={r.id} className={`border-slate-800 ${r.status === 'resolved' ? 'bg-slate-900/30 opacity-60' : 'bg-slate-900/80'} overflow-hidden`}>
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
               <div className="w-12 h-12 rounded-full border border-rose-500/30 bg-rose-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="text-rose-400" size={24} />
               </div>
               <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-2 mb-1">
                   <h3 className="font-semibold text-slate-200">Report Reason: <span className="text-rose-400">{r.reason}</span></h3>
                   {r.status === 'resolved' && <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Resolved</span>}
                 </div>
                 <p className="text-sm text-slate-400 mb-2">Message Content: <strong className="text-slate-300 font-normal italic">"{r.messageText}"</strong></p>
                 <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Reported User ID: {r.reportedUserId}</span>
                    <span>Date: {formatTimeIST(r.createdAt)}</span>
                 </div>
               </div>
               {r.status !== 'resolved' && (
                 <div className="flex items-center gap-2 shrink-0">
                   <Button title="Ban User" onClick={() => handleBanUserFromReport(r.reportedUserId, r.id)} variant="ghost" size="sm" className="text-rose-400 hover:text-white hover:bg-rose-500 border border-rose-500/30">
                     <Ban size={14} className="mr-1.5" /> Ban User
                   </Button>
                   <Button title="Mark as Resolved" onClick={() => handleResolveReport(r.id)} variant="ghost" size="sm" className="text-emerald-400 hover:text-white hover:bg-emerald-500 border border-emerald-500/30">
                     <CheckCircle2 size={14} className="mr-1.5" /> Resolve
                   </Button>
                   {adminRole === 'super_admin' && (
                     <Button title="Delete Report" onClick={() => handleDeleteReport(r.id)} variant="ghost" size="icon" className="text-slate-400 hover:text-rose-400 hover:bg-slate-800">
                       <Trash2 size={16} />
                     </Button>
                   )}
                 </div>
               )}
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
