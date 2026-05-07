import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginUser, API_BASE_URL } from "../utils/api";
import AnimatedMeshBackground from "./AnimatedMeshBackground";
import AnimatedMeshBackgroundDark from "./AnimatedMeshBackgroundDark";
import "./Login.css";

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already authenticated on initial load, quickly check their role
    const checkRoleAndRedirect = async () => {
      if (isAuthenticated) {
        const token = localStorage.getItem("token");
        try {
          const profileRes = await fetch(`${API_BASE_URL}/users/me`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            if (profileData.is_admin) {
              navigate("/admin", { replace: true });
              return;
            }
          }
        } catch (e) {
          console.error(e);
        }
        navigate("/dashboard", { replace: true });
      }
    };
    // Only run this if we are mounting and already authenticated
    // For active login clicks, handleLogin will route directly
    checkRoleAndRedirect();
  }, [isAuthenticated, navigate]);

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
      login(data.access_token); // store real JWT in AuthContext
      
      // Immediately check profile using the fresh token to determine redirect route
      const profileRes = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { "Authorization": `Bearer ${data.access_token}` }
      });
      
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.is_admin) {
          navigate("/admin");
          return;
        }
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <motion.div
        className="login-card-wrapper"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="login-left-pane">
          <AnimatedMeshBackground />
          <div className="left-pane-content">
            <h1 className="brand-kiet">Next-Gen <br /> ML Assessment</h1>
            <p className="brand-subtitle">
              A high-performance environment designed for machine learning, data science, and AI evaluation.
            </p>
          </div>
        </div>

        <div className="login-right-pane">
          <div className="login-form-container">
            <div className="form-header">
              <h2 className="form-title">Login</h2>
            </div>

            {error && <p className="error-text">{error}</p>}

            <form onSubmit={handleLogin} className="login-form-split">
              <div className="input-group-split">
                <label>KIET Email</label>
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

              <div className="forgot-password-link">
                <Link to="/forgot-password">forgot password?</Link>
              </div>

              <button type="submit" disabled={loading} className="submit-btn-split">
                {loading ? "Logging in..." : "Login"}
              </button>

              <p className="switch-auth-split">
                Don't have any account? <Link to="/signup">Create an account</Link>
              </p>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
