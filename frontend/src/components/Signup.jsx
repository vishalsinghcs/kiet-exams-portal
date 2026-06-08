import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { signupUser, verifyOtp } from "../utils/api";
import AnimatedMeshBackground from "./AnimatedMeshBackground";
import AnimatedMeshBackgroundDark from "./AnimatedMeshBackgroundDark";
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
  const [section, setSection] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const branches = ["CSE AI", "CSE AIML"];

  const branchSections = {
    "CSE AI": ["A", "B", "C", "D"],
    "CSE AIML": ["A", "B", "C"]
  };

  const getAvailableSections = () => {
    return branchSections[branch] || [];
  };

  const handleSignupDetails = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !branch || !section) {
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
      await signupUser(name, email, password, branch, section);
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
      const tokenData = await verifyOtp(name, email, password, branch, section, otp);
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
            {step === 1 ? (
              <>
                <div className="form-header">
                  <h2 className="form-title">Create Account</h2>
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
                  <div className="form-row-split">
                    <div className="input-group-split">
                      <label>Branch</label>
                      <select 
                        value={branch} 
                        onChange={(e) => {
                          setBranch(e.target.value);
                          setSection(""); 
                        }} 
                        required 
                        className="auth-select"
                      >
                        <option value="" disabled>Select Branch</option>
                        {branches.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div className="input-group-split">
                      <label>Section</label>
                      <select 
                        value={section} 
                        onChange={(e) => setSection(e.target.value)} 
                        required 
                        className="auth-select"
                        disabled={!branch}
                      >
                        <option value="" disabled>{branch ? "Select Section" : "..."}</option>
                        {getAvailableSections().map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
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
