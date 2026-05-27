import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, setDoc, query, collection, where, getDocs } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { db, handleFirestoreError, OperationType, auth } from "@/services/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Phone, Lock, User, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function SetupProfileModal() {
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);
  
  const [mobileNumber, setMobileNumber] = useState("");
  const [realName, setRealName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkUserDoc() {
      if (!user) {
        setLoadingCheck(false);
        return;
      }
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (!data.mobileNumber) {
            setRealName(user.displayName || "");
            setIsOpen(true);
          }
        } else {
          // If doc doesn't exist, they just signed in via Google for the first time
          setRealName(user.displayName || "");
          setIsOpen(true);
        }
      } catch (e) {
        console.error("Checking user doc failed", e);
      } finally {
        setLoadingCheck(false);
      }
    }
    checkUserDoc();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (mobileNumber.length !== 10 || !/^\d{10}$/.test(mobileNumber)) {
      setError("Mobile Number/Unique ID must be exactly 10 digits.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Check if mobile number is already taken
      const mobQuery = query(collection(db, "users"), where("mobileNumber", "==", mobileNumber));
      const mobSnap = await getDocs(mobQuery);
      if (!mobSnap.empty && mobSnap.docs[0].id !== user.uid) {
        throw new Error("This Mobile Number is already registered to another account.");
      }

      // Automatically set the new password on their Auth profile so they can login via mobile+pass next time
      await updatePassword(user, password);

      // Create or update the user document
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await updateDoc(docRef, {
          displayName: realName,
          mobileNumber,
          updatedAt: Date.now()
        });
      } else {
        await setDoc(docRef, {
          displayName: realName,
          email: user.email,
          photoURL: user.photoURL,
          mobileNumber,
          createdAt: Date.now(),
          status: "Hey there! I am using NovaChat."
        });
      }

      setIsOpen(false);
    } catch (err: any) {
      if (err.code === "auth/requires-recent-login") {
        setError("For security, please sign out and sign completely back in to set a password.");
      } else {
        setError(err.message || "An error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingCheck || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden"
      >
        <div className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Complete Profile</h2>
            <p className="text-sm text-slate-400">Please provide your real name, a unique mobile number, and create a password for subsequent logins.</p>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input 
              type="text" 
              placeholder="Real Name" 
              icon={<User size={18} />} 
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              required
            />
            <Input 
              type="tel" 
              placeholder="Mobile Number (10 digits)" 
              icon={<Phone size={18} />} 
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
              required
              maxLength={10}
              pattern="\d{10}"
            />
            <Input 
              type="password" 
              placeholder="Create Login Password" 
              icon={<Lock size={18} />} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Button 
              type="submit" 
              variant="primary" 
              className="w-full"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save & Continue"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-slate-400 hover:text-slate-300"
              onClick={async () => {
                await logout();
                setIsOpen(false);
              }}
              disabled={loading}
            >
              Sign Out & Use Another Account
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
