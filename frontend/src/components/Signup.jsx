import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { signupUser, verifyOtp } from "../utils/api";
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

  const [step, setStep] = useState(1); // 1 = details, 2 = OTP
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [branch, setBranch] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  
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

  const handleSignupDetails = async (e) => {
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
      await signupUser(name, email, password);
      setStep(2); // Move to OTP step
    } catch (err) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError("Please enter the OTP");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const tokenData = await verifyOtp(name, email, password, otp);
      login(tokenData.access_token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-bg-left">
          <AnimatedMeshBackground />
        </div>
        <div className="login-bg-right"></div>
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
            <h1 className="brand-kiet">KIET</h1>
            <h1 className="brand-exams">EXAMS</h1>
          </div>
        </div>

        <div className="login-right-pane">
          <div className="shape-top-right"></div>
          <div className="shape-top-right-outline"></div>
          <div className="shape-top-left">
            <div className="circle-inner"></div>
          </div>

          <div className="login-form-container">
            {step === 1 ? (
              <>
                <div className="form-header">
                  <h2 className="form-title">Sign Up</h2>
                  <div className="title-dot"></div>
                </div>

                {error && <p className="error-text">{error}</p>}

                <form onSubmit={handleSignupDetails} className="login-form-split">
                  <div className="input-group-split">
                    <label>Full Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="input-group-split">
                    <label>KIET Email</label>
                    <input type="email" placeholder="student@kiet.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="input-group-split">
                    <label>Branch</label>
                    <select value={branch} onChange={(e) => setBranch(e.target.value)} required className="auth-select">
                      <option value="" disabled>Select your branch</option>
                      {branches.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="input-group-split">
                    <label>Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>

                  <button type="submit" disabled={loading} className="submit-btn-split">
                    {loading ? "Sending OTP..." : "Sign Up"}
                  </button>
                  <p className="switch-auth-split">
                    Already have an account? <Link to="/login">Login here</Link>
                  </p>
                </form>
              </>
            ) : (
              <>
                <div className="form-header">
                  <h2 className="form-title">Verify Email</h2>
                  <div className="title-dot"></div>
                </div>
                
                <p className="forgot-desc">
                  We sent a 6-digit code to <strong>{email}</strong>. Enter it below to complete your registration.
                </p>

                {error && <p className="error-text">{error}</p>}

                <form onSubmit={handleVerifyOtp} className="login-form-split">
                  <div className="input-group-split">
                    <label>6-Digit OTP</label>
                    <input 
                      type="text" 
                      placeholder="XXXXXX" 
                      maxLength="6"
                      value={otp} 
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // only allow digits
                      required 
                      style={{ letterSpacing: '0.5rem', textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}
                    />
                  </div>

                  <button type="submit" disabled={loading} className="submit-btn-split" style={{ marginTop: '1rem' }}>
                    {loading ? "Verifying..." : "Complete Registration"}
                  </button>
                  
                  <p className="switch-auth-split">
                    <button type="button" onClick={() => setStep(1)} style={{ background:'none', border:'none', color:'#6c5ce7', cursor:'pointer', fontWeight: 600 }}>
                      Change Email
                    </button>
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
