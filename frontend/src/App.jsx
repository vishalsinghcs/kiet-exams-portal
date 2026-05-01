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
        </Routes>
      </div>
    </Router>
  );
}

export default App;
