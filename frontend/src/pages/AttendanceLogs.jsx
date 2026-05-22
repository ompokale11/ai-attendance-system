import React, { useState, useEffect } from "react";
import { useAuth, API_BASE_URL } from "../hooks/useAuth";
import { 
  Search, 
  Calendar, 
  FileText, 
  Download, 
  AlertCircle, 
  Loader, 
  RefreshCw,
  SlidersHorizontal
} from "lucide-react";

export const AttendanceLogs = () => {
  const { token } = useAuth();
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportLoading, setExportLoading] = useState(null); // 'csv' or 'excel' or null
  
  // Filters State
  const [searchId, setSearchId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      // Build query string
      const params = new URLSearchParams();
      if (searchId) params.append("student_id", searchId);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      
      const response = await fetch(`${API_BASE_URL}/attendance?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to load attendance logs.");
      }
      
      const data = await response.json();
      setLogs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format) => {
    setExportLoading(format);
    setError("");
    try {
      const params = new URLSearchParams();
      if (searchId) params.append("student_id", searchId);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      params.append("format", format);

      const response = await fetch(`${API_BASE_URL}/attendance/export?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to generate export file.");
      }

      // Convert to blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      const ext = format === "csv" ? "csv" : "xlsx";
      link.setAttribute("download", `attendance_export_${new Date().toISOString().slice(0,10)}.${ext}`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExportLoading(null);
    }
  };

  const handleResetFilters = () => {
    setSearchId("");
    setStartDate("");
    setEndDate("");
    // Let state update then fetch
    setTimeout(fetchLogs, 50);
  };

  // Format SQLite timestamp (20:29:14.231255 -> 08:29 PM)
  const formatTime = (timeStr) => {
    if (!timeStr) return "—";
    try {
      const parts = timeStr.split(":");
      if (parts.length >= 2) {
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1];
        let seconds = "00";
        if (parts[2]) {
          seconds = parts[2].split(".")[0];
        }
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const strHours = hours < 10 ? `0${hours}` : hours;
        return `${strHours}:${minutes} ${ampm}`;
      }
    } catch (e) {
      console.error("Error formatting time:", e);
    }
    return timeStr;
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-[#0a0f24] to-slate-950 p-6 rounded-2xl border border-white/5 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,rgba(99,102,241,0.12),transparent_50%)]"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Attendance Logs
            </h1>
            <p className="text-slate-400 text-xs mt-1.5 font-medium tracking-wide">
              Filter, analyze, and export historical student attendance records
            </p>
          </div>
          <div className="flex space-x-3 w-full md:w-auto">
            <button
              onClick={() => handleDownload("csv")}
              disabled={exportLoading !== null}
              className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-white/5 shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              {exportLoading === "csv" ? (
                <Loader className="w-4 h-4 animate-spin text-indigo-400" />
              ) : (
                <Download className="w-4 h-4 text-indigo-400" />
              )}
              <span>Export CSV</span>
            </button>
            
            <button
              onClick={() => handleDownload("excel")}
              disabled={exportLoading !== null}
              className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-semibold rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.25)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              {exportLoading === "excel" ? (
                <Loader className="w-4 h-4 animate-spin text-white" />
              ) : (
                <FileText className="w-4 h-4 text-indigo-200" />
              )}
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-[#0b0f19]/70 backdrop-blur-xl border border-white/5 p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-3">
          <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Filter Engine</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
          {/* Search ID */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">Search Student ID</label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none pr-2.5 border-r border-slate-800/80">
                <Search className="text-slate-500 group-focus-within/input:text-indigo-400 w-3.5 h-3.5 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="e.g. S1001"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-[#0d1321]/60 border border-slate-800/80 rounded-xl text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-white placeholder-slate-650"
              />
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">Start Date</label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none pr-2.5 border-r border-slate-800/80">
                <Calendar className="text-slate-500 group-focus-within/input:text-indigo-400 w-3.5 h-3.5 transition-colors" />
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-[#0d1321]/60 border border-slate-800/80 rounded-xl text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-white placeholder-slate-650 scheme-dark"
              />
            </div>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">End Date</label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none pr-2.5 border-r border-slate-800/80">
                <Calendar className="text-slate-500 group-focus-within/input:text-indigo-400 w-3.5 h-3.5 transition-colors" />
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-[#0d1321]/60 border border-slate-800/80 rounded-xl text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all text-white placeholder-slate-655 scheme-dark"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={fetchLogs}
              className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-[0_2px_10px_rgba(99,102,241,0.2)] hover:shadow-[0_2px_15px_rgba(99,102,241,0.3)] active:scale-[0.98] transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Apply</span>
            </button>
            <button
              onClick={handleResetFilters}
              className="flex-1 py-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold border border-white/5 transition-all active:scale-[0.98] cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center space-x-3 bg-red-950/20 border border-red-500/30 text-red-300 p-4 rounded-xl text-xs animate-[shake_0.5s_ease-in-out]">
          <AlertCircle className="w-4 text-red-400" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-[#0b0f19]/70 backdrop-blur-xl border border-white/5 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <Loader className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
            <p className="text-slate-400 text-xs font-medium tracking-wider">Querying database logs...</p>
          </div>
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider bg-slate-950/20">
                  <th className="py-4 px-6 font-bold">Student ID</th>
                  <th className="py-4 px-6 font-bold">Name</th>
                  <th className="py-4 px-6 font-bold">Dept & Year</th>
                  <th className="py-4 px-6 font-bold">Date</th>
                  <th className="py-4 px-6 font-bold">Time</th>
                  <th className="py-4 px-6 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40">
                {logs.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/10 hover:shadow-inner transition-colors duration-150">
                    <td className="py-4 px-6 font-mono font-bold text-indigo-400 tracking-wide">{row.student_id}</td>
                    <td className="py-4 px-6 text-white font-semibold">{row.student?.name || row.name}</td>
                    <td className="py-4 px-6">
                      {row.student?.department ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#0d1321] border border-slate-800/60 text-slate-300">
                          {row.student.department} • {row.student.year || "N/A"}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium italic">N/A</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-300 font-medium">
                      {new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="py-4 px-6 text-slate-400 font-mono font-medium">{formatTime(row.time)}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border ${
                        row.status === "Present" 
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.05)]"
                          : "bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.05)]"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                          row.status === "Present" ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-pulse"
                        }`}></span>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="relative p-4 bg-slate-900/60 border border-white/5 rounded-2xl mb-4">
              <FileText className="w-10 h-10 text-slate-500" />
            </div>
            <h5 className="font-bold text-slate-300 text-sm tracking-wide">No Logs Found</h5>
            <p className="text-slate-500 text-xs mt-1.5 max-w-xs mx-auto">
              No attendance records match your active filter criteria. Try expanding the search scope.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceLogs;
