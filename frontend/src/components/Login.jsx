import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginUser } from "../utils/api";
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
          const profileRes = await fetch("http://127.0.0.1:8000/users/me", {
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
      const profileRes = await fetch("http://127.0.0.1:8000/users/me", {
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

      {/* ===== FULL-SCREEN BACKGROUND LAYER ===== */}
      <div className="login-bg">
        {/* Left background half — dark blue with animated mesh */}
        <div className="login-bg-left">
          <AnimatedMeshBackground />
        </div>
        {/* Right background half — plain white */}
        <div className="login-bg-right">
          <AnimatedMeshBackgroundDark />
        </div>
      </div>

      {/* ===== CARD — floats on top with large margins ===== */}
      <motion.div
        className="login-card-wrapper"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* ----- Left pane of card (dark, NO animation) ----- */}
        <div className="login-left-pane">

          {/* Decorative shapes */}
          <div className="shape-circle-1"></div>
          <div className="shape-circle-2"></div>
          <div className="shape-circle-3"></div>
          <div className="shape-dashes"></div>
          <div className="shape-dot" style={{ top: "42%", right: "18%" }}></div>
          <div className="shape-dot" style={{ top: "20%", right: "45%" }}></div>
          <div className="shape-dot" style={{ bottom: "42%", left: "18%" }}></div>
          <div className="shape-circle-4"></div>
          <div className="shape-circle-5"></div>

          {/* Quote text */}
          <div className="left-pane-content">
            <h1 className="brand-kiet">KIET</h1>
            <h1 className="brand-exams">EXAMS</h1>
          </div>
        </div>

        {/* ----- Right pane of card (white, form) ----- */}
        <div className="login-right-pane">

          {/* Decorative corner shapes */}
          <div className="shape-top-right"></div>
          <div className="shape-top-right-outline"></div>
          <div className="shape-top-left">
            <div className="circle-inner"></div>
          </div>

          {/* Form */}
          <div className="login-form-container">
            <div className="form-header">
              <h2 className="form-title">Login</h2>
              <div className="title-dot"></div>
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
