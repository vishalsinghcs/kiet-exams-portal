import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, KeyRound, Clock, Calendar, PlayCircle, BookOpen, Shield } from "lucide-react";
import { API_BASE_URL } from "../utils/api";
import logo from "../assets/KIET-Logo.jpg";
import "./Dashboard.css";

// Dynamic times removed - now using live database data

const Dashboard = () => {
  const navigate = useNavigate();
  const { logout, token } = useAuth();
  
  const [user, setUser] = useState(null);
  const [exams, setExams] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("ongoing"); // Default tab
  const dropdownRef = useRef(null);

  // Modal states
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [examCodeInput, setExamCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");

  // Fetch User Profile from Backend
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else {
          logout();
          navigate("/login");
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
      }
    };

    const fetchExams = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/me/exams`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          const mappedExams = data.map(ex => ({
            id: ex.id,
            code: ex.code,
            subject: ex.subject,
            examName: ex.exam_name,
            duration: ex.duration,
            startTime: ex.start_time,
            status: ex.status
          }));
          setExams(mappedExams);
        }
      } catch (error) {
        console.error("Failed to fetch exams", error);
      }
    };

    if (token) {
      fetchProfile();
      fetchExams();
    }
  }, [token, logout, navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const verifyCodeAndStartExam = async (e) => {
    e.preventDefault();
    setCodeError("");
    try {
      const response = await fetch(`${API_BASE_URL}/users/me/exams/${selectedExamId}/verify-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ code: examCodeInput })
      });
      
      if (response.ok) {
        setShowCodeModal(false);
        navigate(`/exam/${selectedExamId}`);
      } else {
        const data = await response.json();
        setCodeError(data.detail || "Invalid access code");
      }
    } catch (err) {
      setCodeError("An error occurred verifying the code");
    }
  };

  const formatISTTime = (isoString) => {
    // Backend stores as naive UTC, append Z to force correct parsing
    const utcString = isoString.endsWith("Z") ? isoString : `${isoString}Z`;
    const date = new Date(utcString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  // Helper functions for exam states
  const getExamCategory = (exam) => {
    if (exam.status === "completed") return "completed";
    
    const utcString = exam.startTime.endsWith("Z") ? exam.startTime : `${exam.startTime}Z`;
    const examStart = new Date(utcString);
    const deadline = new Date(examStart.getTime() + exam.duration * 60000);
    const currentTime = new Date();

    if (currentTime > deadline) {
      return "completed"; // Deadline passed
    } else if (currentTime >= examStart && currentTime <= deadline) {
      return "ongoing"; // Currently happening
    } else {
      return "upcoming"; // In the future
    }
  };

  const renderExamButton = (exam, category) => {
    if (category === "completed") {
      const label = exam.status === "completed" ? "Completed" : "Not Attempted";
      const color = exam.status === "completed" ? "#10b981" : "var(--danger-color)";
      return (
        <button className="start-exam-btn" style={{ background: color, opacity: 0.8, cursor: "default" }} disabled>
          {label}
        </button>
      );
    }

    if (category === "upcoming") {
      return (
        <button className="start-exam-btn" style={{ background: "var(--surface-color-light)", cursor: "not-allowed" }} disabled>
          <Clock size={18} />
          Starts Later
        </button>
      );
    }

    return (
      <button 
        className="start-exam-btn"
        onClick={() => {
          setSelectedExamId(exam.id);
          setExamCodeInput("");
          setCodeError("");
          setShowCodeModal(true);
        }}
      >
        <PlayCircle size={18} />
        Start Test
      </button>
    );
  };

  // Filter exams based on selected tab
  const filteredExams = exams.filter(exam => getExamCategory(exam) === activeTab);

  return (
    <div className="dashboard-page">
      {/* Top Navigation Bar */}
      <nav className="dashboard-navbar">
        <div className="dashboard-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={logo} alt="KIET Logo" style={{ height: '30px', borderRadius: '4px' }} />
          Exams
        </div>
        
        <div className="profile-container" ref={dropdownRef}>
          <div 
            className="profile-trigger" 
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <User size={20} />
            <span className="profile-name">
              {user ? user.name : "Loading..."}
            </span>
          </div>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div 
                className="profile-dropdown"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="dropdown-header">
                  <p className="dropdown-email">{user?.email}</p>
                </div>
                
                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/forgot-password");
                  }}
                >
                  <KeyRound size={16} />
                  Reset Password
                </button>
                
                {user?.is_admin && (
                  <button 
                    className="dropdown-item" 
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate("/admin");
                    }}
                  >
                    <Shield size={16} />
                    Admin Panel
                  </button>
                )}
                
                <button className="dropdown-item logout-item" onClick={handleLogout}>
                  <LogOut size={16} />
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Main Layout (Sidebar + Content) */}
      <div className="dashboard-layout">
        
        {/* Sidebar Navigation */}
        <aside className="dashboard-sidebar">
          <div 
            className={`sidebar-item ${activeTab === 'ongoing' ? 'active' : ''}`}
            onClick={() => setActiveTab('ongoing')}
          >
            <PlayCircle size={18} />
            Ongoing Exams
          </div>
          
          <div 
            className={`sidebar-item ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            <Calendar size={18} />
            Upcoming Exams
          </div>

          <div 
            className={`sidebar-item ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            <BookOpen size={18} />
            Completed
          </div>
        </aside>

        {/* Exam Grid Area */}
        <main className="dashboard-main-content">
          <h1 className="section-title">
            {activeTab === 'ongoing' && "Ongoing Exams"}
            {activeTab === 'upcoming' && "Upcoming Exams"}
            {activeTab === 'completed' && "Completed"}
          </h1>
          
          {filteredExams.length === 0 ? (
            <div className="empty-state glass-panel">
              <p>No {activeTab} exams found.</p>
            </div>
          ) : (
            <div className="exam-grid">
              {filteredExams.map((exam, index) => (
                <motion.div 
                  key={exam.id}
                  className="glass-panel exam-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <div className="exam-header">
                    <span className="exam-code">{exam.code}</span>
                    <span className="exam-type">{exam.examName}</span>
                  </div>
                  
                  <h2 className="exam-subject">{exam.subject}</h2>
                  
                  <div className="exam-details">
                    <div className="detail-row">
                      <Clock size={16} />
                      <span>{exam.duration} Minutes</span>
                    </div>
                    <div className="detail-row">
                      <Calendar size={16} />
                      <span>{formatISTTime(exam.startTime)}</span>
                    </div>
                  </div>
                  
                  {renderExamButton(exam, activeTab)}
                </motion.div>
              ))}
            </div>
          )}
        </main>

      </div>

      {/* Code Verification Modal */}
      <AnimatePresence>
        {showCodeModal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCodeModal(false)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <motion.div 
              className="glass-panel"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{ padding: '30px', width: '400px', maxWidth: '90%', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              <h2 style={{ margin: 0, color: 'var(--text-color)' }}>Enter Exam Code</h2>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Please enter the 6-digit access code provided by your invigilator.</p>
              
              <form onSubmit={verifyCodeAndStartExam} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input 
                  type="text" 
                  value={examCodeInput} 
                  onChange={(e) => setExamCodeInput(e.target.value)} 
                  maxLength={6} 
                  placeholder="e.g. 123456"
                  required 
                  style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--surface-color-light)', color: 'var(--text-color)', fontSize: '1.2rem', textAlign: 'center', letterSpacing: '4px' }}
                />
                
                {codeError && <div style={{ color: 'var(--danger-color)', fontSize: '0.9rem', textAlign: 'center' }}>{codeError}</div>}
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setShowCodeModal(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: '10px', background: 'var(--primary-color)', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Enter Exam</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
