import React, { useState, useEffect } from "react";
import { useAuth, API_BASE_URL } from "../hooks/useAuth";
import { 
  Users, 
  CheckCircle, 
  Clock, 
  Activity, 
  Calendar,
  AlertCircle,
  Loader
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";

export const Dashboard = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899"];

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/dashboard-stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to load statistics.");
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <Loader className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-400 text-sm">Loading dashboard analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="bg-red-950/20 border border-red-500/30 text-red-300 p-4 rounded-xl max-w-md text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="font-semibold">{error}</p>
          <button 
            onClick={fetchStats}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Dashboard</h1>
          <p className="text-slate-400 text-sm">Real-time attendance logs and analytics overview</p>
        </div>
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-sm text-slate-300">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="glass-panel p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Students</p>
            <h3 className="text-3xl font-bold text-white mt-2">{stats.total_students}</h3>
          </div>
          <div className="bg-indigo-950/40 p-4 rounded-xl text-indigo-400 border border-indigo-500/10">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Present Today</p>
            <h3 className="text-3xl font-bold text-emerald-400 mt-2">{stats.today_present}</h3>
          </div>
          <div className="bg-emerald-950/40 p-4 rounded-xl text-emerald-400 border border-emerald-500/10">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Late Entries</p>
            <h3 className="text-3xl font-bold text-amber-500 mt-2">{stats.today_late}</h3>
          </div>
          <div className="bg-amber-950/40 p-4 rounded-xl text-amber-500 border border-amber-500/10">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Attendance Rate</p>
            <h3 className="text-3xl font-bold text-cyan-400 mt-2">{stats.attendance_rate}%</h3>
          </div>
          <div className="bg-cyan-950/40 p-4 rounded-xl text-cyan-400 border border-cyan-500/10">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Attendance Trend */}
        <div className="glass-panel p-5 lg:col-span-2 flex flex-col h-[350px]">
          <h4 className="text-sm font-semibold text-slate-300 mb-4">7-Day Attendance Trend</h4>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.daily_stats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                />
                <Legend />
                <Area type="monotone" dataKey="present" name="Present" stroke="#10b981" fillOpacity={1} fill="url(#colorPresent)" strokeWidth={2} />
                <Area type="monotone" dataKey="late" name="Late" stroke="#f59e0b" fillOpacity={1} fill="url(#colorLate)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Distribution */}
        <div className="glass-panel p-5 flex flex-col h-[350px]">
          <h4 className="text-sm font-semibold text-slate-300 mb-4">Department Distribution</h4>
          <div className="flex-1 w-full flex items-center justify-center">
            {stats.department_stats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.department_stats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="department"
                  >
                    {stats.department_stats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                  />
                  <Legend layout="horizontal" align="center" verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-xs">No department data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="glass-panel p-5">
        <h4 className="text-sm font-semibold text-slate-300 mb-4">Recent Scan Activity</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-3 px-4 font-semibold">Student ID</th>
                <th className="py-3 px-4 font-semibold">Name</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Time</th>
                <th className="py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {stats.recent_activity.length > 0 ? (
                stats.recent_activity.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-indigo-400">{row.student_id}</td>
                    <td className="py-3.5 px-4 text-white font-medium">{row.student?.name || row.name}</td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {row.time}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        row.status === "Present" 
                          ? "bg-emerald-950/50 border border-emerald-500/20 text-emerald-400"
                          : "bg-amber-950/50 border border-amber-500/20 text-amber-400"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500 text-xs">
                    No scanning activity recorded today
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
