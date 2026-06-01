import React, { useState, useEffect } from "react";
import { useAuth, API_BASE_URL } from "../hooks/useAuth";
import { 
  Calendar, 
  BookOpen, 
  Activity, 
  Loader, 
  AlertCircle, 
  CheckCircle2, 
  Clock 
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

export const StudentDashboard = () => {
  const { token } = useAuth();
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/students/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      } else {
        throw new Error("Failed to load attendance logs.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
        <p className="text-slate-500 text-xs">Loading attendance analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="bg-red-950/20 border border-red-500/30 text-red-300 p-4 rounded-xl max-w-sm text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="font-semibold text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Find any subject with attendance rate under 75%
  const lowAttendanceAlerts = history.subject_stats.filter((sub) => sub.rate < 75.0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Student Dashboard</h1>
          <p className="text-slate-400 text-sm">Your attendance statistics and lecture calendar logs</p>
        </div>
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-sm text-slate-300">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
        </div>
      </div>

      {/* Low Attendance Warnings */}
      {lowAttendanceAlerts.map((sub) => (
        <div 
          key={sub.subject} 
          className="p-4 bg-amber-950/20 border border-amber-500/30 text-amber-300 rounded-xl text-xs flex items-center gap-3 animate-pulse"
        >
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <span className="font-bold uppercase tracking-wider">Attendance Warning:</span> Your attendance for{" "}
            <span className="font-bold text-white">{sub.subject}</span> is currently{" "}
            <span className="font-extrabold text-amber-400">{sub.rate}%</span> (below the 75.0% threshold). Please attend subsequent classes.
          </div>
        </div>
      ))}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-panel p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Attended Lectures</p>
            <h3 className="text-3xl font-bold text-white mt-1">{history.attended_classes}</h3>
          </div>
          <div className="bg-indigo-950/40 p-4 rounded-xl text-indigo-400 border border-indigo-500/10">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Lectures Held</p>
            <h3 className="text-3xl font-bold text-slate-200 mt-1">{history.total_classes}</h3>
          </div>
          <div className="bg-slate-900 p-4 rounded-xl text-slate-400 border border-slate-800">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Overall Attendance Rate</p>
            <h3 className={`text-3xl font-bold mt-1 ${history.attendance_rate >= 75.0 ? "text-emerald-400" : "text-amber-400"}`}>
              {history.attendance_rate}%
            </h3>
          </div>
          <div className={`p-4 rounded-xl border ${
            history.attendance_rate >= 75.0 
              ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/10" 
              : "bg-amber-950/40 text-amber-500 border-amber-500/10"
          }`}>
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="glass-panel p-5 h-[320px] flex flex-col">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4">Subject Attendance Breakdown</h2>
        <div className="flex-1 w-full">
          {history.subject_stats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history.subject_stats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="subject" stroke="#64748b" />
                <YAxis stroke="#64748b" domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                  formatter={(value) => [`${value}%`, "Attendance Rate"]}
                />
                <Bar dataKey="rate" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {history.subject_stats.map((entry, index) => (
                    <span key={index} className={entry.rate >= 75.0 ? "fill-indigo-500" : "fill-amber-500"}></span>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              No subject statistics recorded yet
            </div>
          )}
        </div>
      </div>

      {/* Calendar History Logs */}
      <div className="glass-panel p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          Your Attendance Logs Registry
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs">
                <th className="py-3 px-4 font-semibold">Subject</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Time</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Verification Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-xs">
              {history.calendar_logs.length > 0 ? (
                history.calendar_logs.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="py-3 px-4 text-white font-semibold">{row.subject}</td>
                    <td className="py-3 px-4 text-slate-300">
                      {new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{row.time}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold ${
                        row.status === "Present" 
                          ? "bg-emerald-950/50 border border-emerald-500/20 text-emerald-400"
                          : "bg-amber-950/50 border border-amber-500/20 text-amber-400"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-indigo-400">{row.face_confidence}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500 text-xs">
                    No attendance scan sessions logged yet
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

export default StudentDashboard;
