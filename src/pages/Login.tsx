import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/services/firebase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Mail, Lock, LogIn, AlertCircle, Phone, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Login() {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let finalEmail = loginId;
      
      // If doesn't contain @, treat as mobile number and lookup email
      if (!loginId.includes('@')) {
        if (!/^\d{10}$/.test(loginId)) {
          throw new Error("Please enter a valid Email or a 10-digit Mobile Number.");
        }
        const q = query(collection(db, "users"), where("mobileNumber", "==", loginId));
        const snap = await getDocs(q);
        if (snap.empty) {
          throw new Error("Mobile number is not registered.");
        }
        finalEmail = snap.docs[0].data().email;
      }

      await signInWithEmailAndPassword(auth, finalEmail, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      // NOTE: SetupProfileModal will catch them if mobileNumber is missing
      await signInWithPopup(auth, googleProvider);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to login with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResetSuccess("");
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess("Password reset email sent! Check your inbox.");
    } catch (err: any) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  if (isResetMode) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <button 
          onClick={() => { setIsResetMode(false); setError(""); setResetSuccess(""); }}
          className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} className="mr-1.5" /> Back to login
        </button>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Reset Password</h2>
        <p className="text-sm text-slate-400 mb-6">Enter your email address and we'll send you a link to reset your password.</p>
        
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400 text-sm">
                <AlertCircle size={16} className="shrink-0" />
                <p className="break-words">{error}</p>
              </div>
            </motion.div>
          )}
          {resetSuccess && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-400 text-sm">
                <CheckCircle2 size={16} className="shrink-0" />
                <p className="break-words">{resetSuccess}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <Input 
            type="email" 
            placeholder="Email address" 
            icon={<Mail size={18} />} 
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" isLoading={loading}>
            Send Reset Link
          </Button>
        </form>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <span className="text-white font-bold text-2xl">N</span>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-slate-100 mb-2 text-center">Welcome Back</h2>
      <p className="text-sm text-slate-400 mb-6 text-center">Enter your email or unique 10-digit mobile number.</p>
      
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4">
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <p className="break-words">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <Input 
            type="text" 
            placeholder="Email or Mobile Number" 
            icon={<Mail size={18} />} 
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            required
          />
        </div>
        <div>
          <Input 
            type="password" 
            placeholder="Password" 
            icon={<Lock size={18} />} 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <div className="flex justify-end mt-2">
            <button 
              type="button" 
              onClick={() => setIsResetMode(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Forgot password?
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full" isLoading={loading}>
          <LogIn size={18} className="mr-2" />
          Sign In
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-800" />
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Or continue with</span>
        <div className="flex-1 h-px bg-slate-800" />
      </div>

      <Button type="button" variant="secondary" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          <path d="M1 1h22v22H1z" fill="none" />
        </svg>
        Google
      </Button>

      <p className="mt-6 text-center text-sm text-slate-400">
        Don't have an account?{" "}
        <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
          Sign up
        </Link>
      </p>
    </motion.div>
  );
}
