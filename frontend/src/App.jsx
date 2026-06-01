import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth, API_BASE_URL } from "./hooks/useAuth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PreRecords from "./pages/PreRecords";
import Students from "./pages/Students";
import QRGenerator from "./pages/QRGenerator";
import AttendanceLogs from "./pages/AttendanceLogs";
import SuperDashboard from "./pages/SuperDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import StudentScanner from "./pages/StudentScanner";
import ProfileHub from "./pages/ProfileHub";
import { Loader } from "lucide-react";

const AppContent = () => {
  const { isAuthenticated, loading, user, token } = useAuth();
  const [activePage, setActivePage] = useState("dashboard");
  const [studentProfile, setStudentProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role?.toLowerCase() === "student") {
        fetchStudentProfile();
      } else {
        setActivePage("dashboard");
      }
    } else {
      setStudentProfile(null);
    }
  }, [isAuthenticated, user]);

  const fetchStudentProfile = async () => {
    setProfileLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/students/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStudentProfile(data);
        if (data.profile_completed_percentage < 100) {
          setActivePage("student_profile");
        } else {
          setActivePage("student_dashboard");
        }
      }
    } catch (err) {
      console.error("Error fetching student profile:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-slate-400">
        <Loader className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm">Verifying secure credentials session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onRegisterSuccess={fetchStudentProfile} />;
  }

  // Active page renderer
  const renderPage = () => {
    switch (activePage) {
      // Admin / Teacher Pages
      case "dashboard":
        return <Dashboard />;
      case "pre_records":
        return <PreRecords />;
      case "students":
        return <Students />;
      case "qr_generator":
        return <QRGenerator />;
      case "logs":
        return <AttendanceLogs />;
      case "admin_super":
        return <SuperDashboard />;
        
      // Student Pages
      case "student_dashboard":
        return <StudentDashboard />;
      case "student_scanner":
        return <StudentScanner />;
      case "student_profile":
        return (
          <ProfileHub 
            studentProfile={studentProfile} 
            onRefreshProfile={fetchStudentProfile} 
          />
        );
      default:
        return user?.role?.toLowerCase() === "student" ? <StudentDashboard /> : <Dashboard />;
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
