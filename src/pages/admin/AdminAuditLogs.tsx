import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/services/firebase";
import { Card, CardContent } from "@/components/ui/Card";
import { History, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { motion } from "motion/react";

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "auditLogs"), orderBy("timestamp", "desc"), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setLogs(data);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "auditLogs");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleExportCSV = () => {
    const headers = "ID,AdminId,Action,Target,Timestamp,Details\n";
    const csvContent = headers + logs.map(l => {
      return `${l.id},${l.adminId},"${l.action}","${l.target}","${new Date(l.timestamp).toISOString()}","${l.details || ''}"`;
    }).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-orange-400">
            Audit Logs
          </h1>
          <p className="text-slate-400 text-sm mt-1">Track admin activity and system changes</p>
        </div>
        <Button 
          onClick={handleExportCSV}
          variant="outline"
          className="rounded-full border-slate-700/50 bg-slate-900 hover:bg-slate-800 text-slate-300 gap-2 shrink-0"
        >
          <Download size={16} />
          Export Logs
        </Button>
      </header>

      <Card className="border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-400">
            <thead className="text-xs text-slate-500 uppercase bg-slate-900/80 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-300">Timestamp</th>
                <th className="px-6 py-4 font-semibold text-slate-300">Admin ID</th>
                <th className="px-6 py-4 font-semibold text-slate-300">Action</th>
                <th className="px-6 py-4 font-semibold text-slate-300">Target</th>
                <th className="px-6 py-4 font-semibold text-slate-300">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <History size={32} className="mx-auto mb-3 opacity-50" />
                    No audit logs available.
                  </td>
                </tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-3 whitespace-nowrap text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-3 whitespace-nowrap font-mono text-xs">{log.adminId}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-indigo-400 font-medium">{log.action}</td>
                  <td className="px-6 py-3">{log.target}</td>
                  <td className="px-6 py-3 text-slate-500 text-xs truncate max-w-xs">{log.details || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}
