import React from "react";
import { useAuth } from "../hooks/useAuth";
import { 
  LayoutDashboard, 
  Camera, 
  Users, 
  ClipboardList, 
  LogOut,
  User
} from "lucide-react";

export const Layout = ({ activePage, setActivePage, children }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
    { id: "scanner", name: "Camera Scanner", icon: Camera },
    { id: "students", name: "Students Info", icon: Users },
    { id: "logs", name: "Attendance Logs", icon: ClipboardList },
  ];

  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden relative">
      {/* Decorative Glows */}
      <div className="bg-glow-indigo top-0 left-0"></div>
      <div className="bg-glow-cyan bottom-0 right-0"></div>

      {/* Sidebar */}
      <aside className="w-64 glass-panel border-r border-slate-800 m-4 flex flex-col justify-between z-10">
        <div>
          {/* Logo / Header */}
          <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white font-bold text-lg shadow-lg shadow-indigo-500/30">
              AI
            </div>
            <div>
              <h1 className="font-semibold text-base leading-tight">Face Attendance</h1>
              <span className="text-[10px] text-indigo-400 font-medium tracking-wider uppercase">System</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info / Logout */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="flex items-center space-x-3 px-2 py-2">
            <div className="bg-slate-800 p-2 rounded-full">
              <User className="w-4 h-4 text-slate-300" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {user?.username || "Admin User"}
              </p>
              <span className="text-[10px] text-slate-400 uppercase">Administrator</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto p-6 z-10">
        {children}
      </main>
    </div>
  );
};
export default Layout;
