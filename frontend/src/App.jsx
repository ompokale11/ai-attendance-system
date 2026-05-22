import React, { useState } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AttendanceScanner from "./pages/AttendanceScanner";
import Students from "./pages/Students";
import AttendanceLogs from "./pages/AttendanceLogs";
import { Loader } from "lucide-react";

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const [activePage, setActivePage] = useState("dashboard");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-slate-400">
        <Loader className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm">Verifying session token...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Active page renderer
  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard />;
      case "scanner":
        return <AttendanceScanner />;
      case "students":
        return <Students />;
      case "logs":
        return <AttendanceLogs />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activePage={activePage} setActivePage={setActivePage}>
      {renderPage()}
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
