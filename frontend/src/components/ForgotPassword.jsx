import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import AnimatedMeshBackground from "./AnimatedMeshBackground";
import "./Login.css"; /* Reuse the same split layout styles */

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
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
    // TODO: call backend password reset endpoint
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1500);
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

        {/* Right pane */}
        <div className="login-right-pane">
          <div className="shape-top-right"></div>
          <div className="shape-top-right-outline"></div>
          <div className="shape-top-left">
            <div className="circle-inner"></div>
          </div>

          <div className="login-form-container">

            {submitted ? (
              /* Success state */
              <motion.div
                className="forgot-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <div className="success-icon">✓</div>
                <h2 className="form-title" style={{ marginBottom: "1rem" }}>Check your inbox</h2>
                <p className="forgot-desc">
                  If an account with <strong>{email}</strong> exists, a password reset link has been sent.
                </p>
                <Link to="/login" className="back-to-login-btn">
                  Back to Login
                </Link>
              </motion.div>
            ) : (
              /* Form state */
              <>
                <div className="form-header">
                  <h2 className="form-title">Reset</h2>
                  <div className="title-dot"></div>
                </div>

                <p className="forgot-desc">
                  Enter your KIET email address and we'll send you a link to reset your password.
                </p>

                {error && <p className="error-text">{error}</p>}

                <form onSubmit={handleSubmit} className="login-form-split">
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
                    {loading ? "Sending..." : "Send Reset Link"}
                  </button>

                  <p className="switch-auth-split">
                    Remembered it? <Link to="/login">Back to Login</Link>
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
