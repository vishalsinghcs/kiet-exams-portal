import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword, resetPassword } from "../utils/api";
import AnimatedMeshBackground from "./AnimatedMeshBackground";
import "./Login.css";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = Email, 2 = OTP + New Password
  
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    if (!email.endsWith("@kiet.edu")) {
      setError("Only @kiet.edu email addresses are recognised");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      setStep(2); // Move to OTP + Password reset step
    } catch (err) {
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirmPassword) {
      setError("All fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await resetPassword(email, otp, newPassword);
      // On success, redirect to login
      navigate("/login", { state: { message: "Password reset successfully. Please login." } });
    } catch (err) {
      setError(err.message || "Failed to reset password. Please verify your OTP.");
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
                  <h2 className="form-title">Reset</h2>
                  <div className="title-dot"></div>
                </div>

                <p className="forgot-desc">
                  Enter your KIET email address and we'll send you an OTP to reset your password.
                </p>

                {error && <p className="error-text">{error}</p>}

                <form onSubmit={handleSendOtp} className="login-form-split">
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

                  <button type="submit" disabled={loading} className="submit-btn-split">
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </button>

                  <p className="switch-auth-split">
                    Remembered it? <Link to="/login">Back to Login</Link>
                  </p>
                </form>
              </>
            ) : (
              <>
                <div className="form-header">
                  <h2 className="form-title">New Password</h2>
                  <div className="title-dot"></div>
                </div>
                
                <p className="forgot-desc" style={{ marginBottom: "1rem" }}>
                  We sent a 6-digit code to <strong>{email}</strong>.
                </p>

                {error && <p className="error-text">{error}</p>}

                <form onSubmit={handleResetPassword} className="login-form-split">
                  <div className="input-group-split">
                    <label>6-Digit OTP</label>
                    <input 
                      type="text" 
                      placeholder="XXXXXX" 
                      maxLength="6"
                      value={otp} 
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // only allow digits
                      required 
                      style={{ letterSpacing: '0.5rem', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
                    />
                  </div>
                  
                  <div className="input-group-split">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group-split">
                    <label>Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" disabled={loading} className="submit-btn-split" style={{ marginTop: '0.5rem' }}>
                    {loading ? "Resetting..." : "Reset Password"}
                  </button>
                  
                  <p className="switch-auth-split">
                    <button type="button" onClick={() => setStep(1)} style={{ background:'none', border:'none', color:'#6c5ce7', cursor:'pointer', fontWeight: 600 }}>
                      Back to Email
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

export default ForgotPassword;
