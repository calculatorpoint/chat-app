import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { auth, db, handleFirestoreError, OperationType } from "@/services/firebase";
import { updateProfile, sendPasswordResetEmail, updatePassword } from "firebase/auth";
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { LogOut, Save, Camera, User, Quote, CheckCircle2, Phone, AlertCircle, Lock, Mail, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Profile() {
  const { user, logout } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [statusText, setStatusText] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [privacyLastSeen, setPrivacyLastSeen] = useState("everyone");
  const [privacyPhoto, setPrivacyPhoto] = useState("everyone");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [pinInput, setPinInput] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setStatusText(data.status || "");
          setMobileNumber(data.mobileNumber || "");
          setPrivacyLastSeen(data.privacyLastSeen || "everyone");
          setPrivacyPhoto(data.privacyPhoto || "everyone");
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }
    }
    loadProfile();
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (mobileNumber && (mobileNumber.length !== 10 || !/^\d{10}$/.test(mobileNumber))) {
      setError("Mobile Number must be exactly 10 digits.");
      return;
    }

    setLoading(true);
    setSuccess(false);
    setError("");

    try {
      if (mobileNumber) {
        const mobQuery = query(collection(db, "users"), where("mobileNumber", "==", mobileNumber));
        const mobSnap = await getDocs(mobQuery);
        if (!mobSnap.empty && mobSnap.docs[0].id !== user.uid) {
           setError("This Mobile Number is already in use by another account.");
           setLoading(false);
           return;
        }
      }

      await updateProfile(user, { displayName });
      await updateDoc(doc(db, "users", user.uid), {
        displayName,
        status: statusText,
        mobileNumber,
        privacyLastSeen,
        privacyPhoto,
        updatedAt: Date.now(),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      setError("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || newPassword.length < 6) {
      setPwError("Password must be at least 6 characters.");
      return;
    }

    setPwLoading(true);
    setPwError("");
    setPwMsg("");

    try {
      await updatePassword(user, newPassword);
      setNewPassword("");
      setPwMsg("Password updated successfully!");
      setTimeout(() => setPwMsg(""), 4000);
    } catch (err: any) {
      if (err.code === "auth/requires-recent-login") {
        setPwError("Security requirement: Please sign out and sign back in to change your password directly.");
      } else {
        setPwError(err.message || "Failed to update password.");
      }
    } finally {
      setPwLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!user?.email) return;
    setPwLoading(true);
    setPwError("");
    setPwMsg("");
    try {
      await sendPasswordResetEmail(auth, user.email);
      setPwMsg("Password reset email sent to " + user.email);
    } catch (err: any) {
      setPwError(err.message || "Failed to send reset email.");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-6">
        
        <header className="mb-8">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
            Profile Settings
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage your account details and status</p>
        </header>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <User size={18} className="text-indigo-400" />
              Personal Information
            </h2>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
              <div className="relative group">
                <Avatar src={user?.photoURL || undefined} fallback={user?.displayName || "User"} size="xl" className="w-24 h-24 shadow-2xl" />
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="text-white" size={24} />
                </div>
              </div>
              <div className="text-center sm:text-left flex-1">
                <h3 className="text-xl font-bold text-slate-100">{user?.displayName || "User"}</h3>
                <p className="text-sm text-slate-400">{user?.email}</p>
                {mobileNumber && <p className="text-xs text-slate-500 mt-0.5">📞 {mobileNumber}</p>}
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Online
                </div>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4">
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400 text-sm">
                    <AlertCircle size={16} className="shrink-0" />
                    <p>{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300 ml-1">Display Name</label>
                <Input 
                  icon={<User size={16} />}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300 ml-1">Mobile Number (Unique ID)</label>
                <Input 
                  type="tel"
                  icon={<Phone size={16} />}
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="10 digit unique ID"
                  maxLength={10}
                  pattern="\d{10}"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300 ml-1">Status Message</label>
                <Input 
                  icon={<Quote size={16} />}
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="Hey there! I am using NovaChat."
                />
              </div>

              <div className="space-y-1.5 pt-4 border-t border-slate-800">
                <h3 className="text-sm font-medium text-slate-100 flex items-center gap-2 mb-3">
                  <Eye size={16} className="text-indigo-400" /> Privacy Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400 ml-1">Who can see my Last Seen</label>
                    <select 
                      value={privacyLastSeen} 
                      onChange={(e) => setPrivacyLastSeen(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="contacts">Contacts Only</option>
                      <option value="nobody">Nobody</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400 ml-1">Who can see my Profile Photo</label>
                    <select 
                      value={privacyPhoto} 
                      onChange={(e) => setPrivacyPhoto(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="contacts">Contacts Only</option>
                      <option value="nobody">Nobody</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <Button type="submit" isLoading={loading} className="flex-1 sm:flex-none">
                  <Save size={16} className="mr-2" />
                  Save Changes
                </Button>
                
                {success && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                    <CheckCircle2 size={16} /> Saved
                  </motion.div>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <Lock size={18} className="text-indigo-400" />
              Security & Login
            </h2>
          </CardHeader>
          <CardContent>
            <AnimatePresence>
              {pwError && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4">
                  <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center gap-3 text-orange-400 text-sm">
                    <AlertCircle size={16} className="shrink-0" />
                    <p>{pwError}</p>
                  </div>
                </motion.div>
              )}
              {pwMsg && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-400 text-sm">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <p>{pwMsg}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <form onSubmit={handleUpdatePassword} className="space-y-4 mb-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300 ml-1">Change Password</label>
                <Input 
                  type="password"
                  icon={<Lock size={16} />}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 chars)"
                  minLength={6}
                />
              </div>
              <Button type="submit" variant="secondary" isLoading={pwLoading} className="w-full sm:w-auto">
                Update Password Directly
              </Button>
            </form>

            <div className="pt-4 border-t border-slate-800/80">
              <p className="text-sm text-slate-400 mb-3">Or, you can reset your password via an email link.</p>
              <Button type="button" variant="outline" onClick={handleSendResetEmail} disabled={pwLoading} className="w-full sm:w-auto">
                <Mail size={16} className="mr-2" />
                Send Reset Email
              </Button>
            </div>
            
            <div className="pt-6 mt-6 border-t border-slate-800/80">
               <h3 className="text-sm font-medium text-slate-100 flex items-center gap-2 mb-3">
                 <ShieldCheck size={16} className="text-indigo-400" /> App Lock PIN
               </h3>
               <p className="text-xs text-slate-400 mb-4">Set a 4-digit PIN to lock the app on this device. This provides an extra layer of privacy.</p>
               
               {localStorage.getItem(`nova_chat_pin_${user?.uid}`) ? (
                 <Button variant="danger" onClick={() => {
                   localStorage.removeItem(`nova_chat_pin_${user?.uid}`);
                   setPwMsg("App Lock PIN removed successfully.");
                   setTimeout(() => setPwMsg(""), 3000);
                 }}>
                   Remove PIN Lock
                 </Button>
               ) : (
                 <div className="flex gap-2">
                   <Input 
                     type="password"
                     placeholder="Enter 4-digit PIN"
                     value={pinInput}
                     onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                     className="w-40"
                     maxLength={4}
                     icon={<Lock size={16} />}
                   />
                   <Button 
                     onClick={() => {
                       if (pinInput.length === 4) {
                         localStorage.setItem(`nova_chat_pin_${user?.uid}`, pinInput);
                         setPinInput("");
                         setPwMsg("App Lock PIN set successfully.");
                         setTimeout(() => setPwMsg(""), 3000);
                       } else {
                         setPwError("PIN must be exactly 4 digits.");
                         setTimeout(() => setPwError(""), 3000);
                       }
                     }}
                   >
                     Set PIN
                   </Button>
                 </div>
               )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-500/20 bg-rose-500/5">
          <CardHeader className="border-rose-500/10">
            <h2 className="text-lg font-semibold text-rose-400">Session Actions</h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400 mb-4">
              Sign out from this device to end your current session.
            </p>
            <Button variant="danger" onClick={logout}>
              <LogOut size={16} className="mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
