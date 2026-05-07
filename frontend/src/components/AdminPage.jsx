import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import AdminDashboard from "./AdminDashboard";
import { motion } from "framer-motion";
import { loginUser, API_BASE_URL } from "../utils/api";
import { useNavigate } from "react-router-dom";
import AnimatedMeshBackground from "./AnimatedMeshBackground";
import AnimatedMeshBackgroundDark from "./AnimatedMeshBackgroundDark";
import "./Login.css";

const AdminPage = () => {
  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    const checkRole = async () => {
      if (isAuthenticated) {
        const currentToken = token || localStorage.getItem("token");
        try {
          const res = await fetch(`${API_BASE_URL}/users/me`, {
            headers: { "Authorization": `Bearer ${currentToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.role === 'admin' || data.role === 'teacher' || data.is_admin) {
              setIsAdmin(true);
            } else {
              // Valid user, but NOT an admin. Redirect to student dashboard
              navigate("/dashboard");
            }
          } else {
            setIsAdmin(false); // Invalid token
          }
        } catch (e) {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };
    checkRole();
  }, [isAuthenticated, token, navigate]);

  // If authenticated and verified as admin, show the dashboard
  if (isAuthenticated && isAdmin) {
    return <AdminDashboard />;
  }

  // If still checking, show nothing or loading to prevent flash
  if (isAuthenticated && isAdmin === null) {
    return <div className="admin-loading" style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>Verifying Secure Access...</div>;
  }

  // Otherwise, render the Admin Login Form!
  return <AdminLoginForm />;
};

const AdminLoginForm = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("All fields are required");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await loginUser(email, password);
      
      // Verify admin status BEFORE authenticating the entire app state
      const profileRes = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { "Authorization": `Bearer ${data.access_token}` }
      });
      
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.role === 'admin' || profileData.role === 'teacher' || profileData.is_admin) {
           login(data.access_token); // This updates AuthContext and mounts AdminDashboard automatically
        } else {
           setError("Access Denied: You are not an administrator or teacher.");
           setLoading(false);
        }
      } else {
        setError("Failed to verify admin status.");
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-bg-left">
          <AnimatedMeshBackground />
        </div>
        <div className="login-bg-right">
          <AnimatedMeshBackgroundDark />
        </div>
      </div>

      <motion.div
        className="login-card-wrapper"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="login-left-pane">
          <div className="shape-circle-1"></div>
          <div className="shape-circle-2"></div>
          <div className="shape-circle-3"></div>
          <div className="shape-dashes"></div>
          <div className="shape-dot" style={{ top: "42%", right: "18%" }}></div>
          <div className="shape-dot" style={{ top: "20%", right: "45%" }}></div>
          <div className="shape-dot" style={{ bottom: "42%", left: "18%" }}></div>
          <div className="shape-circle-4"></div>
          <div className="shape-circle-5"></div>
          <div className="left-pane-content">
            <h1 className="brand-kiet">EXAMLY</h1>
            <h1 className="brand-exams">ADMIN</h1>
          </div>
        </div>

        <div className="login-right-pane">
          <div className="shape-top-right"></div>
          <div className="shape-top-right-outline"></div>
          <div className="shape-top-left">
            <div className="circle-inner"></div>
          </div>
          <div className="login-form-container">
            <div className="form-header">
              <h2 className="form-title">Admin Portal</h2>
              <div className="title-dot"></div>
            </div>

            {error && <p className="error-text">{error}</p>}

            <form onSubmit={handleLogin} className="login-form-split">
              <div className="input-group-split">
                <label>Admin Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="input-group-split">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="submit-btn-split">
                {loading ? "Authenticating..." : "Secure Login"}
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminPage;
