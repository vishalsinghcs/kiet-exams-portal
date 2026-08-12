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
  return (
    <Router>
      <div className="app-container">
        <AnimatedMeshBackground />

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
