import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Lock, User, AlertCircle, Loader, Eye, EyeOff, KeyRound } from "lucide-react";

export const Login = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || "Invalid username or password.");
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] rounded-full bg-purple-500/5 blur-[100px]"></div>

      {/* Login Card Wrapper */}
      <div className="w-full max-w-md relative z-10 group">
        {/* Glow backdrop behind card */}
        <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

        {/* The Card */}
        <div className="relative bg-[#0b0f19]/85 backdrop-blur-3xl border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden">
          {/* Subtle reflection border light */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

          {/* Logo and Header */}
          <div className="text-center mb-8 relative">
            <div className="relative inline-flex mb-4">
              {/* Outer pulsing glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-600 to-cyan-500 rounded-2xl blur-md opacity-75 animate-pulse"></div>
              {/* Main Badge */}
              <div className="relative bg-gradient-to-br from-[#1e1b4b] to-[#311042] border border-white/10 px-5 py-3 rounded-2xl text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-cyan-200 to-purple-200 font-extrabold text-3xl shadow-2xl">
                AI
              </div>
            </div>
            
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              AI Attendance System
            </h1>
            <p className="text-slate-400 text-xs mt-2 font-medium tracking-wide">
              ADMINISTRATOR PORTAL
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-center space-x-3 bg-red-950/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-xs mb-6 animate-[shake_0.5s_ease-in-out]">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Username
              </label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none border-r border-slate-800/80 pr-2.5">
                  <User className="text-slate-400 group-focus-within/input:text-indigo-400 w-4 h-4 transition-colors duration-200" />
                </div>
                <input
                  type="text"
                  placeholder="Enter admin username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-[#0d1321]/60 border border-slate-800/80 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-[#0d1321]/90 transition-all duration-200 text-white placeholder-slate-500"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Password
              </label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none border-r border-slate-800/80 pr-2.5">
                  <Lock className="text-slate-400 group-focus-within/input:text-indigo-400 w-4 h-4 transition-colors duration-200" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-[#0d1321]/60 border border-slate-800/80 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:bg-[#0d1321]/90 transition-all duration-200 text-white placeholder-slate-500"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] hover:bg-right hover:scale-[1.01] active:scale-[0.99] text-white py-3 rounded-xl font-semibold text-sm transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.25)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin text-white" />
                  <span className="font-semibold tracking-wide">Securing Session...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-indigo-200" />
                  <span className="tracking-wide">Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-8 pt-6 border-t border-slate-900/80 text-center relative z-10">
            <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
              Secure JWT Auth • OpenCV Recognition Engine
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
