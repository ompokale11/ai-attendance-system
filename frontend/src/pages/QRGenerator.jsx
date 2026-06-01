import React, { useState, useEffect } from "react";
import { useAuth, API_BASE_URL } from "../hooks/useAuth";
import { 
  QrCode, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Loader, 
  BookOpen, 
  Sparkles,
  Calendar
} from "lucide-react";

export const QRGenerator = () => {
  const { token } = useAuth();
  
  // Form input states
  const [subject, setSubject] = useState("");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");
  const [division, setDivision] = useState("");
  const [lectureNumber, setLectureNumber] = useState(1);
  
  const [qrCodeData, setQrCodeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Timer countdown state
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    let interval = null;
    if (timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && qrCodeData) {
      setQrCodeData(null);
      setSuccessMsg("");
      setError("The generated QR code has expired.");
    }
    return () => clearInterval(interval);
  }, [timeLeft, qrCodeData]);

  const handleGenerateQR = async (e) => {
    e.preventDefault();
    if (!subject || !course || !year || !division || !lectureNumber) {
      setError("Please fill in all details");
      return;
    }
    
    setLoading(true);
    setError("");
    setSuccessMsg("");
    setQrCodeData(null);
    
    try {
      const today = new Date().toISOString().split("T")[0];
      const nowTime = new Date().toLocaleTimeString("en-US", { hour12: false });
      
      // End time is lecture end time. Standard class is 1 hour, let's add 1 hour
      const current = new Date();
      const end = new Date(current.getTime() + 60 * 60 * 1000);
      const endTime = end.toLocaleTimeString("en-US", { hour12: false });
      
      const payload = {
        subject,
        course,
        year,
        division,
        lecture_number: parseInt(lectureNumber),
        date: today,
        start_time: nowTime,
        end_time: endTime
      };

      const response = await fetch(`${API_BASE_URL}/qr/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        setQrCodeData(data);
        setSuccessMsg("Attendance QR generated successfully! Expiring in 30 minutes.");
        // For simplicity, we set it to 1800 seconds (30 minutes)
        setTimeLeft(1800);
      } else {
        const data = await response.json();
        throw new Error(data.detail || "Failed to generate QR Code. Make sure you haven't exceeded the daily limit of 2 QRs.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <QrCode className="w-6 h-6 text-indigo-400" />
          QR Attendance Generator
        </h1>
        <p className="text-slate-400 text-sm">
          Initialize a secure, short-lived (30 minutes) attendance session QR code for a subject lecture.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-500/30 text-red-300 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Generator Form */}
        <div className="glass-panel p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            Class Lecture Details
          </h2>
          <form onSubmit={handleGenerateQR} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Subject Name</label>
              <input
                type="text"
                placeholder="e.g. Artificial Intelligence"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0d1321]/60 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Course / Branch</label>
              <input
                type="text"
                placeholder="e.g. Computer Science"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0d1321]/60 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0d1321]/60 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-300"
                  required
                >
                  <option value="">Select Year</option>
                  <option value="FY">FY</option>
                  <option value="SY">SY</option>
                  <option value="TY">TY</option>
                  <option value="BE">BE</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Division</label>
                <input
                  type="text"
                  placeholder="e.g. A"
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0d1321]/60 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Lecture Number</label>
              <input
                type="number"
                min="1"
                max="8"
                value={lectureNumber}
                onChange={(e) => setLectureNumber(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0d1321]/60 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/35"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
              Generate Attendance QR
            </button>
          </form>
        </div>

        {/* Display QR Code */}
        <div className="glass-panel p-6 flex flex-col items-center justify-center space-y-4 min-h-[350px]">
          {qrCodeData ? (
            <div className="text-center space-y-4">
              <div className="relative p-4 bg-white rounded-2xl inline-block shadow-2xl">
                <img 
                  src={qrCodeData.qr_base64} 
                  alt="Attendance QR Code"
                  className="w-56 h-56"
                />
                <div className="absolute inset-0 border-4 border-indigo-600/20 rounded-2xl pointer-events-none"></div>
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <Clock className="w-4 h-4 animate-pulse" />
                  Time Left: {formatTime(timeLeft)}
                </p>
                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-white">{qrCodeData.subject}</span> • Lecture {qrCodeData.lecture_number}
                  <br />
                  Target: {qrCodeData.course} ({qrCodeData.year}) - Div {qrCodeData.division}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 space-y-2 p-6">
              <QrCode className="w-16 h-16 mx-auto opacity-20 text-slate-400" />
              <p className="text-xs font-semibold uppercase tracking-wider">No Active QR Session</p>
              <p className="text-[11px] max-w-xs mx-auto">
                Fill in the details and generate a session code. It will be valid for 30 minutes only.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default QRGenerator;
