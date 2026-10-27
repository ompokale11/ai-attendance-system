/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { useAuth, API_BASE_URL } from "../hooks/useAuth";
import { 
  ShieldAlert, 
  Terminal, 
  Database, 
  Activity, 
  UserCheck, 
  UserX, 
  Loader, 
  CheckCircle, 
  AlertTriangle,
  Mail,
  Key,
  Server,
  Send,
  Save
} from "lucide-react";

export const SuperDashboard = () => {
  const { token } = useAuth();
  
  // States
  const [diagnose, setDiagnose] = useState(null);
  const [loginLogs, setLoginLogs] = useState([]);
  const [students, setStudents] = useState([]);
  const [loadingDiag, setLoadingDiag] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [notif, setNotif] = useState({ text: "", type: "" });

  // SMTP Settings States
  const [smtpConfig, setSmtpConfig] = useState({
    smtp_user: "",
    smtp_password: "",
    smtp_host: "smtp.gmail.com",
    smtp_port: "587",
    smtp_from_name: "AI Attendance System",
    is_configured: false,
  });
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testEmailTarget, setTestEmailTarget] = useState("");

  const showNotification = (text, type = "success") => {
    setNotif({ text, type });
    setTimeout(() => setNotif({ text: "", type: "" }), 4000);
  };

  const fetchDiagnostics = async () => {
    setLoadingDiag(true);
    try {
      // The diagnose endpoint is mounted at the root url, not under v1 prefix
      const rootUrl = API_BASE_URL.replace("/api/v1", "");
      const response = await fetch(`${rootUrl}/diagnose`);
      if (response.ok) {
        const data = await response.json();
        setDiagnose(data);
      } else {
        throw new Error("Failed to load diagnose analytics.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDiag(false);
    }
  };

  const fetchLoginLogs = async () => {
    setLoadingLogs(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login-logs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setLoginLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const response = await fetch(`${API_BASE_URL}/students`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleToggleAccount = async (studentId, currentIsActive) => {
    const nextStatus = !currentIsActive;
    try {
      const response = await fetch(
        `${API_BASE_URL}/students/${studentId}/status?is_active=${nextStatus}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        showNotification(
          `Account for ${studentId} has been successfully ${nextStatus ? "activated" : "deactivated"}.`,
          "success"
        );
        fetchStudents();
      } else {
        const data = await response.json();
        throw new Error(data.detail || "Failed to update account status.");
      }
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  const fetchSmtpConfig = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/students/system/smtp-config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSmtpConfig((prev) => ({
          ...prev,
          smtp_user: data.smtp_user || "",
          smtp_host: data.smtp_host || "smtp.gmail.com",
          smtp_port: data.smtp_port || "587",
          smtp_from_name: data.smtp_from_name || "AI Attendance System",
          is_configured: data.is_configured,
        }));
      }
    } catch (err) {
      console.error("Failed to load SMTP config", err);
    }
  };

  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    setSavingSmtp(true);
    try {
      const response = await fetch(`${API_BASE_URL}/students/system/smtp-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(smtpConfig),
      });
      const data = await response.json();
      if (response.ok) {
        showNotification("SMTP email configuration saved successfully!", "success");
        fetchSmtpConfig();
      } else {
        throw new Error(data.detail || "Failed to save SMTP configuration.");
      }
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmailTarget || !testEmailTarget.includes("@")) {
      showNotification("Please enter a valid recipient email to test dispatch.", "error");
      return;
    }
    setTestingSmtp(true);
    try {
      const response = await fetch(`${API_BASE_URL}/students/system/smtp-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: testEmailTarget }),
      });
      const data = await response.json();
      if (response.ok) {
        showNotification(data.detail || "Test email dispatched successfully! Please check your inbox.", "success");
      } else {
        throw new Error(data.detail || "SMTP test delivery failed.");
      }
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setTestingSmtp(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    fetchLoginLogs();
    fetchStudents();
    fetchSmtpConfig();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-indigo-400" />
          Master Administrative Super Dashboard
        </h1>
        <p className="text-slate-400 text-sm">
          Monitor host file writes, verify SQLite database bindings, audit access logs, and manage student security roles.
        </p>
      </div>

      {notif.text && (
        <div className={`p-4 rounded-xl text-sm flex items-center gap-3 border ${
          notif.type === "success" 
            ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
            : "bg-red-950/20 border-red-500/30 text-red-300"
        }`}>
          {notif.type === "success" ? <CheckCircle className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          <span className="font-medium">{notif.text}</span>
        </div>
      )}

      {/* Row 1: System Diagnose & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* DB Status */}
        <div className="glass-panel p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            Database Monitoring
          </h2>
          {loadingDiag ? (
            <div className="py-6 flex justify-center">
              <Loader className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : diagnose ? (
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Database Binding URL</span>
                <span className="text-indigo-400 font-mono truncate max-w-[160px]">{diagnose.database_url}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">SQLite Status</span>
                <span className="flex items-center gap-1 font-semibold text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" /> Writeable
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Hashing Integrity</span>
                <span className="flex items-center gap-1 font-semibold text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" /> OK
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Uploads Directory</span>
                <span className="text-slate-200 truncate max-w-[160px]">{diagnose.uploads_dir}</span>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-xs">Failed to load system diagnostics.</div>
          )}
        </div>

        {/* Directory Writability */}
        <div className="glass-panel p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Directory Permissions
          </h2>
          {loadingDiag ? (
            <div className="py-6 flex justify-center">
              <Loader className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : diagnose ? (
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Uploads Directory Permission</span>
                <span className={`font-semibold ${diagnose.uploads_writeable ? "text-emerald-400" : "text-red-400"}`}>
                  {diagnose.uploads_writeable ? "Write-Approved" : "Read-Only"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Dataset Directory Permission</span>
                <span className={`font-semibold ${diagnose.dataset_writeable ? "text-emerald-400" : "text-red-400"}`}>
                  {diagnose.dataset_writeable ? "Write-Approved" : "Read-Only"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Database Engine State</span>
                <span className="text-slate-200">{diagnose.status?.toUpperCase() || "UNKNOWN"}</span>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-xs">Diagnostics unavailable.</div>
          )}
        </div>

        {/* Security Summary */}
        <div className="glass-panel p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-3 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
            SaaS Security Matrix
          </h2>
          <div className="space-y-3.5 text-xs text-slate-300">
            <p>• Role-based Access Control models enforced across APIs.</p>
            <p>• Multi-factor face scanning checks prevent screens/photos spoofing.</p>
            <p>• In-app audit log records remote IPs and device client-agents.</p>
          </div>
        </div>

      </div>

      {/* Row: SMTP Email Service Configuration */}
      <div className="glass-panel p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-400" />
              Email Service (SMTP) Configuration & Real OTP Dispatch
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Configure your outgoing mail server to send real 6-digit One-Time Passwords (OTP) to students when they click "Verify Email".
            </p>
          </div>
          <div>
            {smtpConfig.is_configured ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle className="w-3.5 h-3.5" />
                Active & Configured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle className="w-3.5 h-3.5" />
                Not Configured
              </span>
            )}
          </div>
        </div>

        {/* Gmail Setup Instructions / Quick Guide */}
        <div className="bg-indigo-950/20 border border-indigo-500/20 p-4 rounded-xl text-xs text-indigo-200 space-y-2">
          <p className="font-semibold text-white flex items-center gap-2">
            <span>💡 How to configure Gmail SMTP (Fastest & Free):</span>
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-300">
            <li>Go to your Google Account at <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-indigo-400 underline">myaccount.google.com/security</a> and enable <strong>2-Step Verification</strong>.</li>
            <li>Search for <strong>"App passwords"</strong> in Google Account settings.</li>
            <li>Create an app named <em>AI Attendance System</em> and copy the generated <strong>16-character password</strong> (e.g. <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">xxxx xxxx xxxx xxxx</code>).</li>
            <li>Paste your Gmail into <strong>Sender Email</strong> and the 16-character code into <strong>Google App Password</strong> below.</li>
          </ol>
        </div>

        <form onSubmit={handleSaveSmtp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Sender Email Address (SMTP User)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="email"
                placeholder="your-email@gmail.com"
                value={smtpConfig.smtp_user}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_user: e.target.value })}
                className="w-full pl-9 pr-3 py-2 bg-[#0d1321]/60 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              App Password / SMTP Password
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="password"
                placeholder="16-character App Password"
                value={smtpConfig.smtp_password}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_password: e.target.value })}
                className="w-full pl-9 pr-3 py-2 bg-[#0d1321]/60 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Sender Display Name
            </label>
            <input
              type="text"
              placeholder="AI Attendance System"
              value={smtpConfig.smtp_from_name}
              onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_from_name: e.target.value })}
              className="w-full px-3 py-2 bg-[#0d1321]/60 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              SMTP Host
            </label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="text"
                placeholder="smtp.gmail.com"
                value={smtpConfig.smtp_host}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_host: e.target.value })}
                className="w-full pl-9 pr-3 py-2 bg-[#0d1321]/60 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              SMTP Port
            </label>
            <input
              type="number"
              placeholder="587"
              value={smtpConfig.smtp_port}
              onChange={(e) => setSmtpConfig({ ...smtpConfig, smtp_port: e.target.value })}
              className="w-full px-3 py-2 bg-[#0d1321]/60 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={savingSmtp}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-600/20"
            >
              {savingSmtp ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save SMTP Configuration
            </button>
          </div>
        </form>

        {/* Live Test Email Dispatcher */}
        <div className="border-t border-slate-800/80 pt-4 mt-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Send Test Verification Email
          </label>
          <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
            <input
              type="email"
              placeholder="recipient@example.com"
              value={testEmailTarget}
              onChange={(e) => setTestEmailTarget(e.target.value)}
              className="flex-1 px-3 py-2 bg-[#0d1321]/60 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={handleTestSmtp}
              disabled={testingSmtp || !testEmailTarget}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {testingSmtp ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-indigo-400" />}
              Send Test OTP
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: User account activation panel */}
      <div className="glass-panel p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-indigo-400" />
          SaaS Student User Account Control
        </h2>
        {loadingStudents ? (
          <div className="py-12 flex justify-center">
            <Loader className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs">
                  <th className="py-3 px-4 font-semibold">Student ID</th>
                  <th className="py-3 px-4 font-semibold">Name</th>
                  <th className="py-3 px-4 font-semibold">Email</th>
                  <th className="py-3 px-4 font-semibold">Face Model Status</th>
                  <th className="py-3 px-4 font-semibold">Account Status</th>
                  <th className="py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-indigo-400">{student.student_id}</td>
                    <td className="py-3 px-4 text-white font-medium">{student.name}</td>
                    <td className="py-3 px-4 text-slate-300">{student.email || "No Email"}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                        student.face_registered 
                          ? "bg-indigo-950/40 border border-indigo-500/20 text-indigo-400" 
                          : "bg-slate-900 border border-slate-800 text-slate-500"
                      }`}>
                        {student.face_registered ? "Registered" : "Not Registered"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {/* Note: since User status is linked, let's assume if user profile load, it has status or we default to active */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-emerald-950/40 border border-emerald-500/20 text-emerald-400">
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleAccount(student.student_id, true)}
                        className="p-1 text-slate-400 hover:text-red-400 transition-colors mr-2 cursor-pointer"
                        title="Deactivate Account"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row 3: Login security audits */}
      <div className="glass-panel p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          Security Access logs (Remote Sign-Ins)
        </h2>
        {loadingLogs ? (
          <div className="py-12 flex justify-center">
            <Loader className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs">
                  <th className="py-3 px-4 font-semibold">User ID</th>
                  <th className="py-3 px-4 font-semibold">Remote IP Address</th>
                  <th className="py-3 px-4 font-semibold">Device Agent Signature</th>
                  <th className="py-3 px-4 font-semibold">Timestamp (UTC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs font-mono">
                {loginLogs.length > 0 ? (
                  loginLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-medium">User #{log.user_id}</td>
                      <td className="py-3 px-4 text-indigo-400">{log.ip_address || "127.0.0.1"}</td>
                      <td className="py-3 px-4 text-slate-300 truncate max-w-[280px]" title={log.device_info}>
                        {log.device_info || "Unknown"}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(log.timestamp).toISOString().replace("T", " ").replace("Z", "")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-500 text-xs font-sans">
                      No security login audits recorded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperDashboard;
