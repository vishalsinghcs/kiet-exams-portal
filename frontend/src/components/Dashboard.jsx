import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  LogOut,
  KeyRound,
  Clock,
  Calendar,
  PlayCircle,
  BookOpen,
  Shield,
} from "lucide-react";
import { API_BASE_URL } from "../utils/api";
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

  // Passkey modal state
  const [passkeyModal, setPasskeyModal] = useState({
    open: false,
    examId: null,
    examCode: "",
  });
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [passkeyError, setPasskeyError] = useState("");
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyShake, setPasskeyShake] = useState(false);
  const inputRefs = useRef([]);

  // Fetch User Profile from Backend
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          const mappedExams = data.map((ex) => ({
            id: ex.id,
            code: ex.code,
            subject: ex.subject,
            examName: ex.exam_name,
            duration: ex.duration,
            startTime: ex.start_time,
            status: ex.status,
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

  // Open passkey modal when student clicks Start Test
  const handleStartExam = (exam) => {
    setDigits(["", "", "", "", "", ""]);
    setPasskeyError("");
    setPasskeyShake(false);
    setPasskeyModal({ open: true, examId: exam.id, examCode: exam.code });
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  };

  // Handle each digit box input
  const handleDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setPasskeyError("");
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    // Auto-submit when all 6 filled
    if (digit && index === 5 && newDigits.every((d) => d !== "")) {
      submitPasskey(newDigits.join(""));
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === "Backspace" && digits[index] === "" && index > 0) {
      const newDigits = [...digits];
      newDigits[index - 1] = "";
      setDigits(newDigits);
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0)
      inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5)
      inputRefs.current[index + 1]?.focus();
  };

  const handleDigitPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      inputRefs.current[5]?.focus();
      submitPasskey(pasted);
    }
  };

  // Core submit — calls backend, navigates on success
  const submitPasskey = useCallback(
    async (code) => {
      setPasskeyLoading(true);
      setPasskeyError("");
      try {
        const res = await fetch(
          `${API_BASE_URL}/users/me/exams/${passkeyModal.examId}/verify-code`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ code }),
          },
        );
        const data = await res.json();
        if (res.ok && data.success) {
          setPasskeyModal({ open: false, examId: null, examCode: "" });
          navigate(`/exam/${passkeyModal.examId}`);
        } else {
          setPasskeyError(data.detail || "Invalid passkey. Please try again.");
          setPasskeyShake(true);
          setDigits(["", "", "", "", "", ""]);
          setTimeout(() => {
            setPasskeyShake(false);
            inputRefs.current[0]?.focus();
          }, 600);
        }
      } catch (err) {
        setPasskeyError("Connection error. Please try again.");
      } finally {
        setPasskeyLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [passkeyModal.examId, token],
  );

  const formatISTTime = (isoString) => {
    // Backend stores as naive UTC, append Z to force correct parsing
    const utcString = isoString.endsWith("Z") ? isoString : `${isoString}Z`;
    const date = new Date(utcString);
    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  // Helper functions for exam states
  const getExamCategory = (exam) => {
    if (exam.status === "completed") return "completed";

    const utcString = exam.startTime.endsWith("Z")
      ? exam.startTime
      : `${exam.startTime}Z`;
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
      const color =
        exam.status === "completed" ? "#10b981" : "var(--danger-color)";
      return (
        <button
          className="start-exam-btn"
          style={{ background: color, opacity: 0.8, cursor: "default" }}
          disabled
        >
          {label}
        </button>
      );
    }

    if (category === "upcoming") {
      return (
        <button
          className="start-exam-btn"
          style={{
            background: "var(--surface-color-light)",
            cursor: "not-allowed",
          }}
          disabled
        >
          <Clock size={18} />
          Starts Later
        </button>
      );
    }

    return (
      <button className="start-exam-btn" onClick={() => handleStartExam(exam)}>
        <PlayCircle size={18} />
        Start Test
      </button>
    );
  };

  // Filter exams based on selected tab
  const filteredExams = exams.filter(
    (exam) => getExamCategory(exam) === activeTab,
  );

  return (
    <div className="dashboard-page">
      {/* Passkey OTP Modal */}
      {passkeyModal.open && (
        <div
          className="passkey-overlay"
          onClick={() =>
            setPasskeyModal({ open: false, examId: null, examCode: "" })
          }
        >
          <div className="passkey-modal" onClick={(e) => e.stopPropagation()}>
            <div className="passkey-lock-icon">&#128274;</div>
            <h3>Enter Exam Passkey</h3>
            <p>
              Enter the 6-digit passkey for{" "}
              <strong>{passkeyModal.examCode}</strong> provided by your
              administrator.
            </p>

            <div className={`otp-boxes${passkeyShake ? " otp-shake" : ""}`}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  className={`otp-box${passkeyError ? " otp-error" : ""}${digit ? " otp-filled" : ""}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(i, e)}
                  onPaste={i === 0 ? handleDigitPaste : undefined}
                  disabled={passkeyLoading}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <p className="passkey-error">{passkeyError}</p>

            <div className="passkey-actions">
              <button
                type="button"
                className="passkey-cancel-btn"
                onClick={() =>
                  setPasskeyModal({ open: false, examId: null, examCode: "" })
                }
                disabled={passkeyLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="passkey-submit-btn"
                disabled={passkeyLoading || digits.some((d) => d === "")}
                onClick={() => submitPasskey(digits.join(""))}
              >
                {passkeyLoading ? "Verifying..." : "Enter Exam"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <nav className="dashboard-navbar">
        <div
          className="dashboard-brand"
          style={{ display: "flex", alignItems: "center", gap: "10px" }}
        >
          <img src="/codeml_logo_trans.png" alt="CodeML Logo" style={{ height: '30px' }} />
          CodeML
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

                <button
                  className="dropdown-item logout-item"
                  onClick={handleLogout}
                >
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
            className={`sidebar-item ${activeTab === "ongoing" ? "active" : ""}`}
            onClick={() => setActiveTab("ongoing")}
          >
            <PlayCircle size={18} />
            Ongoing Exams
          </div>

          <div
            className={`sidebar-item ${activeTab === "upcoming" ? "active" : ""}`}
            onClick={() => setActiveTab("upcoming")}
          >
            <Calendar size={18} />
            Upcoming Exams
          </div>

          <div
            className={`sidebar-item ${activeTab === "completed" ? "active" : ""}`}
            onClick={() => setActiveTab("completed")}
          >
            <BookOpen size={18} />
            Completed
          </div>
        </aside>

        {/* Exam Grid Area */}
        <main className="dashboard-main-content">
          <h1 className="section-title">
            {activeTab === "ongoing" && "Ongoing Exams"}
            {activeTab === "upcoming" && "Upcoming Exams"}
            {activeTab === "completed" && "Completed"}
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
    </div>
  );
};

export default Dashboard;
