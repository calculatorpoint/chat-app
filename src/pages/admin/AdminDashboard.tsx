import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Users, PhoneCall, MessageSquare, Activity, ShieldAlert } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "motion/react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/services/firebase";

export default function AdminDashboard() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [totalCalls, setTotalCalls] = useState(0);
  const [totalChats, setTotalChats] = useState(0);
  
  const [usersList, setUsersList] = useState<any[]>([]);
  const [callsList, setCallsList] = useState<any[]>([]);
  const [chatsList, setChatsList] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubUsers: any;
    let unsubCalls: any;
    let unsubChats: any;

    try {
      unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
        setTotalUsers(snap.size);
        setActiveUsers(snap.docs.filter(d => d.data().isOnline).length);
        setUsersList(snap.docs.map(d => d.data()));
      });
      unsubCalls = onSnapshot(collection(db, "calls"), (snap) => {
        setTotalCalls(snap.size);
        setCallsList(snap.docs.map(d => d.data()));
      });
      unsubChats = onSnapshot(collection(db, "chats"), (snap) => {
        setTotalChats(snap.size);
        setChatsList(snap.docs.map(d => d.data()));
        setLoading(false);
      });
    } catch (err) {
      console.error(err);
      setLoading(false);
    }

    return () => {
      if (unsubUsers) unsubUsers();
      if (unsubCalls) unsubCalls();
      if (unsubChats) unsubChats();
    }
  }, []);

  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);
      
      const dayUsers = usersList.filter(u => u.createdAt >= startOfDay.getTime() && u.createdAt <= endOfDay.getTime()).length;
      const dayCalls = callsList.filter(c => c.createdAt >= startOfDay.getTime() && c.createdAt <= endOfDay.getTime()).length;
      const dayChats = chatsList.filter(c => c.updatedAt >= startOfDay.getTime() && c.updatedAt <= endOfDay.getTime()).length;
      
      data.push({
        name: startOfDay.toLocaleDateString('en-US', { weekday: 'short' }),
        users: dayUsers,
        calls: dayCalls,
        chats: dayChats,
      });
    }
    return data;
  }, [usersList, callsList, chatsList]);

  const stats = [
    { label: "Active Users / Total", value: `${activeUsers} / ${totalUsers}`, icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
    { label: "Total Calls Initiated", value: loading ? "..." : totalCalls.toString(), icon: PhoneCall, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
    { label: "Total Chat Sessions", value: loading ? "..." : totalChats.toString(), icon: MessageSquare, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
    { label: "System Status", value: "Healthy", icon: ShieldAlert, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  ];

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-orange-400">
          Dashboard Overview
        </h1>
        <p className="text-slate-400 text-sm mt-1">Real-time dynamic metrics from Firestore</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
             <Card className="border-slate-800 relative overflow-hidden group">
              <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full ${stat.bg} -mr-10 -mt-10 transition-transform group-hover:scale-150`} />
              <CardContent className="p-6 relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 border ${stat.border} ${stat.bg}`}>
                  <stat.icon className={stat.color} size={24} />
                </div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl lg:text-3xl font-bold text-slate-100 mt-1 truncate">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-slate-800 h-full">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-6 flex items-center gap-2">
                 <Activity size={18} className="text-indigo-400" />
                 Weekly Activity Overview
              </h2>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fb7185" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#fb7185" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#f1f5f9' }}
                      itemStyle={{ color: '#f1f5f9' }}
                    />
                    <Area type="monotone" dataKey="users" name="New Users" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                    <Area type="monotone" dataKey="calls" name="Calls Made" stroke="#fb7185" strokeWidth={3} fillOpacity={1} fill="url(#colorCalls)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* System Health / Storage */}
        <motion.div
          className="lg:col-span-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-slate-800 overflow-hidden h-full">
            <CardContent className="p-0">
               <div className="p-6 border-b border-slate-800 bg-slate-900/50">
                  <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                     <ShieldAlert size={18} className="text-emerald-400" />
                     System Health
                  </h2>
               </div>
               
               <div className="p-6 space-y-6">
                 {/* CPU Usage Simulation */}
                 <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                       <span className="text-slate-400 font-medium">Server CPU</span>
                       <span className="text-emerald-400">12%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }} 
                         animate={{ width: "12%" }} 
                         transition={{ duration: 1, ease: "easeOut" }}
                         className="h-full bg-emerald-500 rounded-full" 
                       />
                    </div>
                 </div>

                 {/* DB Storage Simulation */}
                 <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                       <span className="text-slate-400 font-medium">Database Storage</span>
                       <span className="text-amber-400">68%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }} 
                         animate={{ width: "68%" }} 
                         transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                         className="h-full bg-amber-500 rounded-full" 
                       />
                    </div>
                    <p className="text-xs text-slate-500 text-right mt-1">3.4 GB / 5.0 GB</p>
                 </div>

                 {/* Bandwidth */}
                 <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                       <span className="text-slate-400 font-medium">Bandwidth (Monthly)</span>
                       <span className="text-indigo-400">42%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }} 
                         animate={{ width: "42%" }} 
                         transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                         className="h-full bg-indigo-500 rounded-full" 
                       />
                    </div>
                    <p className="text-xs text-slate-500 text-right mt-1">420 GB / 1 TB</p>
                 </div>

                 <div className="pt-4 border-t border-slate-800">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                       <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500">All Systems Operational</span>
                    </div>
                 </div>
               </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
