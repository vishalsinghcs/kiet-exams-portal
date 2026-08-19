import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from "react-router-dom";
import AnimatedMeshBackground from "./components/AnimatedMeshBackground";
import Login from "./components/Login";
import "./App.css";
import Dashboard from "./components/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Signup from "./components/Signup";
import LandingPage from "./components/LandingPage";
import ForgotPassword from "./components/ForgotPassword";
import AdminPage from "./components/AdminPage";
import ExamEnvironment from "./components/ExamEnvironment";

function App() {
  const [isAppDown, setIsAppDown] = useState(false);
  const [maintenanceAt, setMaintenanceAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const handleLock = () => setIsAppDown(true);
    const handleWarning = (e) => setMaintenanceAt(e.detail.timestamp);

    window.addEventListener("maintenance-lock", handleLock);
    window.addEventListener("maintenance-warning", handleWarning);

    return () => {
      window.removeEventListener("maintenance-lock", handleLock);
      window.removeEventListener("maintenance-warning", handleWarning);
    };
  }, []);

  useEffect(() => {
    if (!maintenanceAt) return;
    
    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(maintenanceAt).getTime();
      const distance = target - now;

      if (distance <= 0) {
        setIsAppDown(true);
        setMaintenanceAt(null);
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [maintenanceAt]);

  if (isAppDown) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#0f172a', color: 'white', textAlign: 'center', padding: '20px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Service Unavailable</h1>
        <p style={{ color: '#94a3b8', maxWidth: '400px' }}>The system is currently undergoing scheduled maintenance to sync databases and upgrade servers. Please check back in a few minutes.</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        <AnimatedMeshBackground />

        {maintenanceAt && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#ef4444', color: 'white', textAlign: 'center', padding: '10px', zIndex: 9999, fontWeight: 'bold' }}>
            ⚠️ Service will go down for maintenance in {timeLeft}. Please save your work!
          </div>
        )}

        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/admin/*" 
            element={<AdminPage />} 
          />
          <Route 
            path="/exam/:examId" 
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <ExamEnvironment />
              </ProtectedRoute>
            } 
          />
          
          {/* Unknown routes redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
