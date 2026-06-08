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
  const [showPassword, setShowPassword] = useState(false);
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
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: '60px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#6c5ce7',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="forgot-password-link">
                <Link to="/forgot-password">Forgot Password?</Link>
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
