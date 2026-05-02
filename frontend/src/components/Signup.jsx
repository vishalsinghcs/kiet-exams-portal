import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { signupUser, loginUser } from "../utils/api";
import AnimatedMeshBackground from "./AnimatedMeshBackground";
import "./Login.css";

const Signup = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [branch, setBranch] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const branches = [
    "Computer Science and Engineering",
    "Information Technology",
    "Electronics and Communication",
    "Mechanical Engineering",
    "Civil Engineering",
    "Computer Science (AI & ML)",
  ];

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !branch) {
      setError("All fields are required");
      return;
    }
    if (!email.endsWith("@kiet.edu")) {
      setError("Only @kiet.edu email addresses are allowed");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // 1. Register the account
      await signupUser(name, email, password);
      // 2. Auto-login immediately after successful signup
      const tokenData = await loginUser(email, password);
      login(tokenData.access_token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* Full-screen background layer */}
      <div className="login-bg">
        <div className="login-bg-left">
          <AnimatedMeshBackground />
        </div>
        <div className="login-bg-right"></div>
      </div>

      {/* Floating card */}
      <motion.div
        className="login-card-wrapper"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Left pane */}
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
            <h1 className="brand-kiet">KIET</h1>
            <h1 className="brand-exams">EXAMS</h1>
          </div>
        </div>

        {/* Right pane — form */}
        <div className="login-right-pane">
          <div className="shape-top-right"></div>
          <div className="shape-top-right-outline"></div>
          <div className="shape-top-left">
            <div className="circle-inner"></div>
          </div>

          <div className="login-form-container">
            <div className="form-header">
              <h2 className="form-title">Sign Up</h2>
              <div className="title-dot"></div>
            </div>

            {error && <p className="error-text">{error}</p>}

            <form onSubmit={handleSignup} className="login-form-split">
              <div className="input-group-split">
                <label>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group-split">
                <label>KIET Email</label>
                <input
                  type="email"
                  placeholder="student@kiet.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="input-group-split">
                <label>Branch</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  required
                  className="auth-select"
                >
                  <option value="" disabled>Select your branch</option>
                  {branches.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
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
                {loading ? "Creating account..." : "Sign Up"}
              </button>

              <p className="switch-auth-split">
                Already have an account? <Link to="/login">Login here</Link>
              </p>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
