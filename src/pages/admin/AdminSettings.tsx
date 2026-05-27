import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Settings2, Bell, AlertTriangle, ShieldCheck, CheckCircle2, Database, Download, FileJson } from "lucide-react";
import { doc, onSnapshot, setDoc, updateDoc, collection, writeBatch, getDocs } from "firebase/firestore";
import { db, handleFirestoreError, OperationType, auth } from "@/services/firebase";
import { motion, AnimatePresence } from "motion/react";

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [registration, setRegistration] = useState(true);
  const [fileUploads, setFileUploads] = useState(true);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "system"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMaintenance(!!data.maintenanceMode);
        setRegistration(data.allowRegistration !== false); // default true
        setFileUploads(data.allowFileUploads !== false);
      } else {
        // initialize if not exists
        setDoc(doc(db, "settings", "system"), {
          maintenanceMode: false,
          allowRegistration: true,
          allowFileUploads: true
        });
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const updateSetting = async (key: string, value: boolean) => {
    try {
      await updateDoc(doc(db, "settings", "system"), {
        [key]: value
      });
      showSuccess("Settings updated successfully");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "settings/system");
    }
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleExportDatabase = async () => {
    try {
      showSuccess("Compiling database export...");
      const usersSnap = await getDocs(collection(db, "users"));
      const chatsSnap = await getDocs(collection(db, "chats"));
      
      const dbDump = {
        exportedAt: new Date().toISOString(),
        users: usersSnap.docs.map(d => ({id: d.id, ...d.data()})),
        chats: chatsSnap.docs.map(d => ({id: d.id, ...d.data()}))
      };

      const blob = new Blob([JSON.stringify(dbDump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `nova_chat_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess("Database exported successfully!");
    } catch(err) {
      console.error(err);
      showSuccess("Export failed");
    }
  };

  return (
    <div className="space-y-6 relative h-full">
      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-0 right-0 z-50 flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg border border-emerald-500/20 shadow-lg"
          >
            <CheckCircle2 size={16} />
            <span className="text-sm font-medium">{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-orange-400">
          System Settings
        </h1>
        <p className="text-slate-400 text-sm mt-1">Configure global application parameters</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-rose-500/30 border-t-rose-500 animate-spin rounded-full shadow-lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <AlertTriangle size={18} className="text-orange-400" />
                Maintenance Mode
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-400">
                When enabled, only administrators can access the application. Active sessions for regular users will be terminated.
              </p>
              <div className="flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800/80 rounded-xl">
                <span className="font-medium text-slate-300">Enable Maintenance</span>
                <button 
                  onClick={() => updateSetting("maintenanceMode", !maintenance)}
                  className={`w-12 h-6 rounded-full cursor-pointer relative border transition-colors ${maintenance ? 'bg-rose-500/20 border-rose-500/50' : 'bg-slate-800 border-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${maintenance ? 'left-7 bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'left-1 bg-slate-500'}`} />
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <Database size={18} className="text-indigo-400" />
                Data Export & Backups
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-400">
                Download a complete JSON snapshot of all Users and Chats for backup purposes.
              </p>
              
              <Button 
                onClick={handleExportDatabase}
                className="w-full bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 border border-indigo-500/20 transition-all font-medium flex gap-2 items-center justify-center"
              >
                <FileJson size={16} /> Export Latest JSON
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-800 md:col-span-2 bg-slate-900/50 backdrop-blur-sm">
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                Security Policies
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-xl space-y-2">
                  <span className="font-medium text-slate-300 block text-sm">New User Registration</span>
                  <p className="text-xs text-slate-500 mb-3">Allow new users to create accounts on the platform.</p>
                  <div className="flex gap-2 bg-slate-900 p-1 rounded-lg">
                    <Button 
                      onClick={() => updateSetting("allowRegistration", true)}
                      size="sm" 
                      variant="ghost" 
                      className={`flex-1 transition-all ${registration ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Enabled
                    </Button>
                    <Button 
                      onClick={() => updateSetting("allowRegistration", false)}
                      size="sm" 
                      variant="ghost" 
                      className={`flex-1 transition-all ${!registration ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Disabled
                    </Button>
                  </div>
                </div>
                <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-xl space-y-2">
                  <span className="font-medium text-slate-300 block text-sm">File Uploads</span>
                  <p className="text-xs text-slate-500 mb-3">Allow users to share images and files in chats.</p>
                  <div className="flex gap-2 bg-slate-900 p-1 rounded-lg">
                    <Button 
                      onClick={() => updateSetting("allowFileUploads", true)}
                      size="sm" 
                      variant="ghost" 
                      className={`flex-1 transition-all ${fileUploads ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Enabled
                    </Button>
                    <Button 
                      onClick={() => updateSetting("allowFileUploads", false)}
                      size="sm" 
                      variant="ghost" 
                      className={`flex-1 transition-all ${!fileUploads ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Disabled
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
