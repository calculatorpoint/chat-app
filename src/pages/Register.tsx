import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { setDoc, doc, collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "@/services/firebase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Mail, Lock, User, UserPlus, AlertCircle, Phone } from "lucide-react";
import { motion } from "motion/react";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileNumber.length !== 10 || !/^\d{10}$/.test(mobileNumber)) {
      setError("Mobile Number/Unique ID must be exactly 10 digits.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Check if mobile number is already taken before creating auth account
      const mobQuery = query(collection(db, "users"), where("mobileNumber", "==", mobileNumber));
      const mobSnap = await getDocs(mobQuery).catch(e => {
        throw new Error("GET_DOCS_FAILED: " + e.message);
      });
      if (!mobSnap.empty) {
        throw new Error("This Mobile Number is already registered.");
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password).catch(e => {
        throw new Error("AUTH_FAILED: " + e.message);
      });
      const user = userCredential.user;
      
      const photoURL = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`;
      await updateProfile(user, { displayName: name, photoURL }).catch(e => {
        throw new Error("UPDATE_PROFILE_FAILED: " + e.message);
      });
      
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        mobileNumber,
        displayName: name,
        photoURL,
        status: "Hey there! I am using NovaChat.",
        isOnline: true,
        lastSeen: Date.now(),
        isAdmin: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }).catch(e => {
         throw new Error("SET_DOC_FAILED: " + e.message);
      });

      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <UserPlus className="text-white" size={24} />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-slate-100 mb-2 text-center">Create Account</h2>
      <p className="text-sm text-slate-400 mb-6 text-center">Join NovaChat and start connecting.</p>
      
      {error && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          <p className="break-words">{error}</p>
        </motion.div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <Input 
            type="text" 
            placeholder="Full Name" 
            icon={<User size={18} />} 
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>
        <div>
          <Input 
            type="email" 
            placeholder="Email address" 
            icon={<Mail size={18} />} 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <Input 
            type="tel" 
            placeholder="Mobile Number (Unique 10-digit ID)" 
            icon={<Phone size={18} />} 
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
            required
            maxLength={10}
            pattern="\d{10}"
          />
        </div>
        <div>
          <Input 
            type="password" 
            placeholder="Password (min. 6 chars)" 
            icon={<Lock size={18} />} 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" className="w-full mt-2" isLoading={loading}>
          Create Account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
