import React, { useState, useEffect } from "react";
import { useAuth, API_BASE_URL } from "../hooks/useAuth";
import { 
  LayoutDashboard, 
  Camera, 
  Users, 
  ClipboardList, 
  LogOut,
  User,
  QrCode,
  ShieldAlert,
  Bell,
  Check,
  Lock,
  Loader
} from "lucide-react";

export const Layout = ({ activePage, setActivePage, children }) => {
  const { user, token, logout } = useAuth();
  
  // States for notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotif, setLoadingNotif] = useState(false);

  // Student Profile Completion State
  const [profileCompletion, setProfileCompletion] = useState(100);

  useEffect(() => {
    fetchNotifications();
    // Refresh notifications every 15 seconds
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user?.role === "student") {
      fetchStudentProfile();
    }
  }, [user]);

  const fetchStudentProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/students/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProfileCompletion(data.profile_completed_percentage);
      }
    } catch (err) {
      console.error("Error fetching student progress:", err);
    }
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  const handleMarkAsRead = async (notifId, e) => {
    e.stopPropagation();
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${notifId}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Build menu list based on role
  let menuItems = [];
  if (user?.role === "admin") {
    menuItems = [
      { id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
      { id: "pre_records", name: "Student Registry", icon: Users },
      { id: "students", name: "Student Directory", icon: Users },
      { id: "qr_generator", name: "QR Generator", icon: QrCode },
      { id: "logs", name: "Attendance Logs", icon: ClipboardList },
      { id: "admin_super", name: "Super Dashboard", icon: ShieldAlert },
    ];
  } else if (user?.role === "teacher") {
    menuItems = [
      { id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
      { id: "pre_records", name: "Student Registry", icon: Users },
      { id: "students", name: "Student Directory", icon: Users },
      { id: "qr_generator", name: "QR Generator", icon: QrCode },
      { id: "logs", name: "Attendance Logs", icon: ClipboardList },
    ];
  } else if (user?.role === "student") {
    menuItems = [
      { id: "student_dashboard", name: "Dashboard", icon: LayoutDashboard, requiresCompletion: true },
      { id: "student_scanner", name: "Scan QR Code", icon: Camera, requiresCompletion: true },
      { id: "student_profile", name: "Profile Hub", icon: User, requiresCompletion: false },
    ];
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden relative">
      {/* Decorative Glows */}
      <div className="bg-glow-indigo top-0 left-0"></div>
      <div className="bg-glow-cyan bottom-0 right-0"></div>

      {/* Sidebar */}
      <aside className="w-64 glass-panel border-r border-slate-800 m-4 flex flex-col justify-between z-10 relative">
        <div>
          {/* Logo / Header */}
          <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white font-bold text-lg shadow-lg shadow-indigo-500/30">
              AI
            </div>
            <div>
              <h1 className="font-semibold text-base leading-tight">AI Attendance</h1>
              <span className="text-[10px] text-indigo-400 font-medium tracking-wider uppercase">System</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              
              // Force completion check
              const isLocked = user?.role === "student" && item.requiresCompletion && profileCompletion < 100;

              return (
                <button
                  key={item.id}
                  onClick={() => !isLocked && setActivePage(item.id)}
                  disabled={isLocked}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 cursor-pointer"
                      : isLocked 
                        ? "text-slate-600 cursor-not-allowed opacity-50"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/50 cursor-pointer"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </div>
                  {isLocked && <Lock className="w-3.5 h-3.5 text-slate-600" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info / Notifications / Logout */}
        <div className="p-4 border-t border-slate-800 space-y-2 relative">
          
          {/* Notification bell and drawer */}
          <div className="flex justify-between items-center px-2 py-1 relative">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">In-App Alerts</span>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                fetchNotifications();
              }}
              className="relative p-1.5 bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-lg text-slate-400 hover:text-white cursor-pointer transition-all"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              )}
            </button>

            {/* Notification Dropdown Drawer */}
            {showNotifications && (
              <div className="absolute bottom-12 right-0 w-72 glass-panel border border-slate-800 bg-[#080d1a]/95 rounded-xl shadow-2xl p-4 space-y-3 z-30 max-h-80 overflow-y-auto">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Your Notifications</span>
                  <span className="text-[10px] font-semibold bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded-full">{unreadCount} unread</span>
                </div>
                <div className="space-y-2">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          notif.is_read 
                            ? "bg-slate-950/20 border-slate-900 opacity-60" 
                            : "bg-indigo-950/10 border-indigo-950 hover:bg-indigo-950/20"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${
                            notif.type === "success" 
                              ? "text-emerald-400" 
                              : notif.type === "warning" 
                                ? "text-amber-400" 
                                : "text-indigo-400"
                          }`}>{notif.title}</span>
                          {!notif.is_read && (
                            <button
                              onClick={(e) => handleMarkAsRead(notif.id, e)}
                              className="text-[9px] text-indigo-400 hover:text-white flex items-center gap-0.5"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{notif.message}</p>
                        <span className="text-[9px] text-slate-500 block mt-1">
                          {new Date(notif.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-500 text-[11px]">No alerts or notifications yet</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Info */}
          <div className="flex items-center space-x-3 px-2 py-2">
            <div className="bg-slate-800 p-2 rounded-full flex-shrink-0">
              <User className="w-4 h-4 text-slate-300" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {user?.username || "Guest User"}
              </p>
              <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block">
                {user?.role === "admin" ? "Administrator" : user?.role === "teacher" ? "Lecturer" : "Student"}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto p-6 z-10 relative">
        {children}
      </main>
    </div>
  );
};
export default Layout;
