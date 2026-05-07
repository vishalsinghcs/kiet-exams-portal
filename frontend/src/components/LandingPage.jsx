import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";
import { Upload, Code2, Send } from "lucide-react";
import logo from "../assets/examly_logo_trans.png";

import AnimatedMeshBackgroundDark from "./AnimatedMeshBackgroundDark";

const LandingPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="landing-page-wrapper">
      <AnimatedMeshBackgroundDark />
      {/* Navbar */}
      <nav className="landing-navbar">
        <div className="landing-navbar-container">
          <div className="navbar-brand">
            <img src={logo} alt="Examly Logo" className="brand-logo-img" />
            <span className="brand-text">Examly Platform</span>
          </div>
          <div className="navbar-actions">
            <Link to="/login" className="nav-btn nav-login-btn">
              Login
            </Link>
            <Link to="/signup" className="nav-btn nav-signup-btn">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="landing-main">
        <div className="hero-section">
          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            The Ultimate <br /> ML Exam Portal
          </motion.h1>
          <motion.p
            className="hero-subtitle"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            A high-performance assessment platform for machine learning. <br /> 
            Seamlessly manage datasets, solve complex challenges, and submit notebooks.
          </motion.p>
          <motion.div
            className="hero-cta"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link to="/signup" className="hero-btn primary-cta">
              Get Started
            </Link>
            <Link to="/login" className="hero-btn secondary-cta">
              Portal Login
            </Link>
          </motion.div>
        </div>

        {/* Value Proposition Section */}
        <motion.div 
          className="value-prop-section"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className="step-card">
            <div className="step-icon-wrapper">
              <Upload size={22} />
            </div>
            <h3>1. Download Data</h3>
            <p>Access curated datasets and problem statements directly from the portal.</p>
          </div>
          
          <div className="step-divider"></div>

          <div className="step-card">
            <div className="step-icon-wrapper">
              <Code2 size={22} />
            </div>
            <h3>2. Solve & Develop</h3>
            <p>Build your ML models and generate predictions in your local environment.</p>
          </div>

          <div className="step-divider"></div>

          <div className="step-card">
            <div className="step-icon-wrapper">
              <Send size={22} />
            </div>
            <h3>3. Submit Results</h3>
            <p>Upload your predictions and Jupyter notebooks for automated evaluation.</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default LandingPage;
