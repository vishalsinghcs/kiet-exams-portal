import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";
import logo from "../assets/KIET-Logo.jpg";

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

  const cards = [
    {
      title: "Upcoming Hackathons",
      description: "Join the latest coding challenges and win exciting prizes.",
      icon: "🏆",
    },
    {
      title: "Trending Datasets",
      description: "Explore curated datasets for your next ML project.",
      icon: "📊",
    },
    {
      title: "Global Leaderboard",
      description: "See where you stand among top coders in the college.",
      icon: "🌟",
    },
  ];

  return (
    <div className="landing-page-wrapper">
      <AnimatedMeshBackgroundDark />
      {/* Navbar */}
      <nav className="landing-navbar glass-panel">
        <div className="navbar-brand">
          <img src={logo} alt="KIET Logo" className="brand-logo-img" />
          <span className="brand-text">KIET Exams</span>
        </div>
        <div className="navbar-actions">
          <Link to="/login" className="nav-btn nav-login-btn">
            Login
          </Link>
          <Link to="/signup" className="nav-btn nav-signup-btn">
            Sign Up
          </Link>
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
            The Ultimate KIET Coding & ML Arena
          </motion.h1>
          <motion.p
            className="hero-subtitle"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Level up your coding skills. Participate in college-wide hackathons, coding challenges, and ML competitions.
          </motion.p>
          <motion.div
            className="hero-cta"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link to="/signup" className="hero-btn primary-cta">
              Register Now - It's Free
            </Link>
            <Link to="/login" className="hero-btn secondary-cta">
              Explore Competitions
            </Link>
          </motion.div>
        </div>

        {/* Feature Cards Grid */}
        <motion.div
          className="features-grid"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          {cards.map((card, index) => (
            <div key={index} className="feature-card glass-panel">
              <div className="feature-icon">{card.icon}</div>
              <h3 className="feature-title">{card.title}</h3>
              <p className="feature-desc">{card.description}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
};

export default LandingPage;
