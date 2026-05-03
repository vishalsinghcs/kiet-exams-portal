import {
  BrowserRouter as Router,
  Routes,
  Route,
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
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route 
            path="/exam/:examId" 
            element={
              <ProtectedRoute>
                <ExamEnvironment />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
