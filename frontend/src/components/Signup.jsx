import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { APP_NAME } from "../utils/constants";

const Signup = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = (e) => {
    e.preventDefault();

    //  Validation
    if (!name || !email || !password) {
      setError("All fields are required");
      return;
    }

    setError("");
    setLoading(true);

    //   Fake signup (simulate API)
    setTimeout(() => {
      login(); // auto login after signup
      setLoading(false);
      navigate("/dashboard");
    }, 1500);
  };

  return (
    <div className="center-content signup-page">
      <motion.div
        className="glass-panel signup-card"
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="signup-title">{APP_NAME}</h1>

        {error && <p className="error-text">{error}</p>}

        <form onSubmit={handleSignup} className="signup-form">
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="signup-input"
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="signup-input"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="signup-input"
          />

          <button type="submit" disabled={loading} className="signup-button">
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="switch-auth">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;
