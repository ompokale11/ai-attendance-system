import React, { useState } from "react";
import { useAuth, API_BASE_URL } from "../hooks/useAuth";
import { 
  Lock, 
  User, 
  AlertCircle, 
  Loader, 
  Eye, 
  EyeOff, 
  KeyRound, 
  UserPlus, 
  Sparkles,
  BookOpen
} from "lucide-react";

export const Login = ({ onRegisterSuccess }) => {
  const { login } = useAuth();
  
  // Tab control: "signin" or "register"
  const [tab, setTab] = useState("signin");

  // Sign In states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  // Registration states
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");
  const [division, setDivision] = useState("");
  const [rollNumber, setRollNumber] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || "Invalid username or password.");
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regUsername || !regPassword || !studentId || !name || !course || !year || !division || !rollNumber) {
      setError("Please fill in all registration fields.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/student-register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
          student_id: studentId,
          name,
          course,
          year,
          division,
          roll_number: rollNumber
        }),
      });

      if (response.ok) {
        setSuccess("Registration verified and complete! Signing you in...");
        // Auto-login after successful registration
        setTimeout(async () => {
          try {
            await login(regUsername, regPassword);
            if (onRegisterSuccess) onRegisterSuccess();
          } catch (err) {
            setTab("signin");
            setUsername(regUsername);
            setError("Account created, please sign in manually.");
            setLoading(false);
          }
        }, 1500);
      } else {
        const data = await response.json();
        throw new Error(data.detail || "Verification failed. Check details or ID status.");
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 relative overflow-hidden text-slate-200">
      {/* Dynamic tech-grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

      {/* Floating Neon Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-cyan-500/10 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }}></div>

      {/* Card Wrapper */}
      <div className="w-full max-w-lg relative z-10 group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>

        {/* The Card */}
        <div className="relative bg-[#0b0f19]/90 backdrop-blur-3xl border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden">
          
          {/* Logo and Header */}
          <div className="text-center mb-6 relative">
            <div className="relative inline-flex mb-3.5">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-600 to-cyan-500 rounded-2xl blur-md opacity-75 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-[#1e1b4b] to-[#311042] border border-white/10 px-5 py-2.5 rounded-2xl text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-cyan-200 to-purple-200 font-extrabold text-2xl shadow-2xl">
                AI
              </div>
            </div>
            
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              AI Attendance System
            </h1>
            <p className="text-slate-400 text-[10px] mt-1 font-semibold tracking-widest uppercase">
              Enterprise Attendance SaaS
            </p>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-slate-800 mb-6">
            <button
              onClick={() => { setTab("signin"); setError(""); setSuccess(""); }}
              className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                tab === "signin" 
                  ? "border-b-2 border-indigo-500 text-white" 
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab("register"); setError(""); setSuccess(""); }}
              className={`flex-1 pb-3 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                tab === "register" 
                  ? "border-b-2 border-indigo-500 text-white" 
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Student Register
            </button>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="flex items-center space-x-3 bg-red-950/20 border border-red-500/30 text-red-300 px-4 py-2.5 rounded-xl text-xs mb-5 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-3 bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 px-4 py-2.5 rounded-xl text-xs mb-5">
              <Sparkles className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span className="font-medium">{success}</span>
            </div>
          )}

          {/* Sign In Form */}
          {tab === "signin" ? (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400">Username</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0d1321]/60 border border-slate-800/80 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-[#0d1321]/60 border border-slate-800/80 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-600"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.35)] flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin text-white" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            
            // Student Registration Form
            <form onSubmit={handleRegisterSubmit} className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400">Username</label>
                  <input
                    type="text"
                    placeholder="Desired username"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d1321]/60 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400">Password</label>
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d1321]/60 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400">Student ID / Roll (Registry ID)</label>
                <input
                  type="text"
                  placeholder="e.g. STU1001"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d1321]/60 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400">Full Name (Matches Registry)</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d1321]/60 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400">Course / Department</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d1321]/60 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400">Year</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d1321]/60 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-300"
                    required
                  >
                    <option value="">Year</option>
                    <option value="FY">FY</option>
                    <option value="SY">SY</option>
                    <option value="TY">TY</option>
                    <option value="BE">BE</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400">Division</label>
                  <input
                    type="text"
                    placeholder="e.g. A"
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d1321]/60 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-white"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-slate-400">Roll No</label>
                  <input
                    type="text"
                    placeholder="e.g. 42"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0d1321]/60 border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-white"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.35)] flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying details...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Verify & Register Account</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Info */}
          <div className="mt-6 pt-5 border-t border-slate-900/80 text-center relative z-10">
            <p className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase">
              Role-Based JWT Auth • SQLite Database Engine
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
