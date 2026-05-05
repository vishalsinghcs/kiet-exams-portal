import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, Plus, UserPlus, Shield, List, Activity,
  LogOut, Settings, ChevronDown, Bell, BarChart2
} from "lucide-react";
import { API_BASE_URL } from "../utils/api";
import "./AdminDashboard.css";

/* ─────────────────────────────────────────────────────
   Tab metadata — label + icon shown in the sidebar
───────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { id: "dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { id: "create_exam",  label: "Create Exam",  icon: Plus           },
  { id: "assign_exam",  label: "Assign Exam",  icon: UserPlus       },
  { id: "all_exams",    label: "My Exams",     icon: List           },
  { id: "results",      label: "Results",      icon: BarChart2      },
];

const ADMIN_ONLY_ITEMS = [
  { id: "elevate",      label: "Manage Admins", icon: Shield        },
];

const TAB_TITLES = {
  dashboard:   "Dashboard",
  create_exam: "Create Exam",
  assign_exam: "Assign Exam",
  all_exams:   "My Exams",
  results:     "Results",
  elevate:     "Manage Admins",
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { logout, token } = useAuth();

  const [user, setUser]         = useState(null);
  const [activeTab, setActiveTab] = useState("create_exam");
  const [loading, setLoading]   = useState(true);
  const [exams, setExams]       = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Form states (preserved from original)
  const [examForm, setExamForm] = useState({
    code: "", access_code: "", subject: "", exam_name: "", duration: 60, start_time: ""
  });
  const [assignForm, setAssignForm] = useState({ email: "", exam_id: "" });
  const [elevateEmail, setElevateEmail] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [submitting, setSubmitting] = useState(false);

  /* ── Auth check ── */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (!data.is_admin) { navigate("/dashboard"); return; }
          setUser(data);
          fetchAllExams();
        } else {
          logout();
        }
      } catch (error) {
        console.error("Auth check failed", error);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchAdminProfile();
    else logout();
  }, [token, navigate, logout]);

  /* ── Data fetchers ── */
  const fetchAllExams = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/exams/all`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) setExams(await response.json());
    } catch (e) { console.error(e); }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };


  const handleCreateExam = async (e) => {
    e.preventDefault();
    // Validate access code is exactly 6 digits
    if (!/^\d{6}$/.test(examForm.access_code)) {
      showMessage("error", "Access code must be exactly 6 numeric digits.");
      return;
    }
    if (submitting) return; // Guard against double submit
    setSubmitting(true);
    try {
      const formattedTime = new Date(examForm.start_time).toISOString();
      const response = await fetch(`${API_BASE_URL}/admin/exams`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ ...examForm, start_time: formattedTime })
      });
      if (response.ok) {
        showMessage("success", "Exam created successfully!");
        setExamForm({ code: "", access_code: "", subject: "", exam_name: "", duration: 60, start_time: "" });
        fetchAllExams();
      } else {
        const err = await response.json();
        showMessage("error", err.detail || "Failed to create exam.");
      }
    } catch (e) { showMessage("error", "An error occurred."); }
    finally { setSubmitting(false); }
  };

  const handleAssignExam = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/admin/exams/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ email: assignForm.email, exam_id: parseInt(assignForm.exam_id) })
      });
      const data = await response.json();
      if (response.ok) {
        showMessage("success", "Exam assigned successfully!");
        setAssignForm({ email: "", exam_id: "" });
      } else {
        showMessage("error", data.detail || "Failed to assign exam.");
      }
    } catch (e) { showMessage("error", "An error occurred."); }
  };

  const handleElevateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/admin/elevate?email=${elevateEmail}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        showMessage("success", data.message);
        setElevateEmail("");
      } else {
        showMessage("error", data.detail || "Failed to elevate user.");
      }
    } catch (e) { showMessage("error", "An error occurred."); }
  };

  /* ── Loading/guard ── */
  if (loading) return <div className="admin-loading">Checking Admin Credentials...</div>;
  if (!user)   return null;

  const allNavItems = [...NAV_ITEMS, ...(user.is_admin ? ADMIN_ONLY_ITEMS : [])];

  /* ─────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────── */
  return (
    <div className="admin-shell">

      {/* ── SIDEBAR ── */}
      <aside className="admin-sidebar">
        {/* Logo */}
        <div className="admin-sidebar-logo">
          <img src="/examly_logo_trans.png" alt="Examly" className="sidebar-logo-img" />
          <span className="sidebar-brand-name">Examly</span>
        </div>

        {/* Nav section label */}
        <p className="sidebar-section-label">GENERAL</p>

        <nav className="admin-nav">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`admin-nav-item${activeTab === id ? " active" : ""}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={18} className="nav-item-icon" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Admin-only section */}
        {user.is_admin && (
          <>
            <p className="sidebar-section-label" style={{ marginTop: "24px" }}>ADMIN</p>
            <nav className="admin-nav">
              {ADMIN_ONLY_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  className={`admin-nav-item${activeTab === id ? " active" : ""}`}
                  onClick={() => setActiveTab(id)}
                >
                  <Icon size={18} className="nav-item-icon" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Sidebar divider */}
        <div className="sidebar-bottom-divider" />

        {/* Student view shortcut */}
        <button className="admin-nav-item sidebar-student-link" onClick={() => navigate("/dashboard")}>
          <Activity size={18} className="nav-item-icon" />
          <span>Student View</span>
        </button>

        {/* Profile pill at bottom */}
        <div className="sidebar-profile" ref={dropdownRef} onClick={() => setDropdownOpen(!dropdownOpen)}>
          <div className="sidebar-avatar">
            {user.name ? user.name.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="sidebar-profile-info">
            <span className="sidebar-profile-name">{user.name || "Administrator"}</span>
            <span className="sidebar-profile-role">{user.role || "admin"}</span>
          </div>
          <ChevronDown size={14} className={`sidebar-chevron${dropdownOpen ? " open" : ""}`} />

          {dropdownOpen && (
            <div className="sidebar-dropdown">
              <div className="sidebar-dropdown-email">{user.email}</div>
              <div className="sidebar-dropdown-divider" />
              <Link to="/forgot-password" className="sidebar-dropdown-item">
                <Settings size={14} /> Reset Password
              </Link>
              <button
                className="sidebar-dropdown-item sidebar-dropdown-logout"
                onClick={() => { logout(); navigate("/admin"); }}
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="admin-main">

        {/* Top bar */}
        <header className="admin-topbar">
          <h1 className="topbar-title">{TAB_TITLES[activeTab] || "Admin"}</h1>
          <div className="topbar-actions">
            <button className="topbar-bell" aria-label="Notifications">
              <Bell size={20} />
            </button>
            <div className="topbar-avatar">
              {user.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="admin-content">

          {/* Alert message */}
          {message.text && (
            <div className={`admin-alert alert-${message.type}`}>{message.text}</div>
          )}

          {/* ── Dashboard placeholder ── */}
          {activeTab === "dashboard" && (
            <div className="admin-card">
              <h2 className="admin-section-title">Welcome back, {user.name}!</h2>
              <p style={{ color: "var(--text-muted)", marginTop: "8px" }}>
                Use the sidebar to create exams, assign them to students, and manage results.
              </p>
            </div>
          )}

          {/* ── Create Exam ── */}
          {activeTab === "create_exam" && (
            <div className="admin-card">
              <h2 className="admin-section-title">Create New Exam</h2>
              <form onSubmit={handleCreateExam} className="admin-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Exam Code <span className="form-required">*</span></label>
                    <input type="text" placeholder="e.g. CS-402"
                      value={examForm.code}
                      onChange={(e) => setExamForm({ ...examForm, code: e.target.value })}
                      required />
                  </div>
                  <div className="form-group">
                    <label>Subject <span className="form-required">*</span></label>
                    <input type="text" placeholder="e.g. Machine Learning"
                      value={examForm.subject}
                      onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })}
                      required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Exam Name <span className="form-required">*</span></label>
                  <input type="text" placeholder="e.g. Mid Semester Examination"
                    value={examForm.exam_name}
                    onChange={(e) => setExamForm({ ...examForm, exam_name: e.target.value })}
                    required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Duration (minutes) <span className="form-required">*</span></label>
                    <input type="number" min="1" max="300"
                      value={examForm.duration}
                      onChange={(e) => setExamForm({ ...examForm, duration: e.target.value })}
                      required />
                  </div>
                  <div className="form-group">
                    <label>Start Time (IST) <span className="form-required">*</span></label>
                    <input type="datetime-local"
                      value={examForm.start_time}
                      onChange={(e) => setExamForm({ ...examForm, start_time: e.target.value })}
                      required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Exam Access Code <span className="form-required">*</span>
                    <span className="form-hint"> (6 digits — share with students only at exam start)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter 6-digit code, e.g. 482910"
                    maxLength={6}
                    value={examForm.access_code}
                    onChange={(e) => setExamForm({ ...examForm, access_code: e.target.value.replace(/\D/g, "") })}
                    required
                    style={{
                      letterSpacing: examForm.access_code ? '6px' : 'normal',
                      fontSize: examForm.access_code ? '1.2rem' : '0.9rem',
                      fontWeight: examForm.access_code ? '700' : '400',
                    }}
                  />
                  <span className={`access-code-counter ${examForm.access_code.length === 6 ? 'counter-valid' : ''}`}>
                    {examForm.access_code.length}/6 digits{examForm.access_code.length === 6 ? ' ✓ Ready' : ''}
                  </span>
                </div>
                <button type="submit" className="admin-submit-btn" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Exam"}
                </button>
              </form>
            </div>
          )}

          {/* ── Assign Exam ── */}
          {activeTab === "assign_exam" && (
            <div className="admin-card">
              <h2 className="admin-section-title">Assign Exam to Student</h2>
              <form onSubmit={handleAssignExam} className="admin-form">
                <div className="form-group">
                  <label>Student Email (@kiet.edu)</label>
                  <input type="email" placeholder="student@kiet.edu"
                    value={assignForm.email}
                    onChange={(e) => setAssignForm({ ...assignForm, email: e.target.value })}
                    required />
                </div>
                <div className="form-group">
                  <label>Select Exam</label>
                  <select value={assignForm.exam_id}
                    onChange={(e) => setAssignForm({ ...assignForm, exam_id: e.target.value })}
                    required>
                    <option value="">-- Choose an Exam --</option>
                    {exams.map(ex => (
                      <option key={ex.id} value={ex.id}>{ex.code} — {ex.subject}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="admin-submit-btn">Assign Exam</button>
              </form>
            </div>
          )}

          {/* ── My Exams table ── */}
          {activeTab === "all_exams" && (
            <div className="admin-card">
              <h2 className="admin-section-title">All Exams</h2>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Code</th>
                      <th>Subject</th>
                      <th>Duration</th>
                      <th>Start Time (IST)</th>
                      <th>Access Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map(ex => (
                      <tr key={ex.id}>
                        <td>{ex.id}</td>
                        <td><span className="exam-code-badge">{ex.code}</span></td>
                        <td>{ex.subject}</td>
                        <td>{ex.duration} min</td>
                        <td>
                          {new Date(
                            ex.start_time.endsWith("Z") ? ex.start_time : `${ex.start_time}Z`
                          ).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                        </td>
                        <td>
                          <span className="access-code-masked">••••••</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Results placeholder ── */}
          {activeTab === "results" && (
            <div className="admin-card">
              <h2 className="admin-section-title">Results</h2>
              <p style={{ color: "var(--text-muted)" }}>Results view is coming in Feature 9.</p>
            </div>
          )}

          {/* ── Manage Admins ── */}
          {activeTab === "elevate" && (
            <div className="admin-card">
              <h2 className="admin-section-title">Promote User to Admin</h2>
              <p className="admin-desc">Granting admin privileges allows this user to create and assign exams.</p>
              <form onSubmit={handleElevateUser} className="admin-form">
                <div className="form-group">
                  <label>User Email (@kiet.edu)</label>
                  <input type="email" placeholder="user@kiet.edu"
                    value={elevateEmail}
                    onChange={(e) => setElevateEmail(e.target.value)}
                    required />
                </div>
                <button type="submit" className="admin-submit-btn danger-btn">Elevate to Admin</button>
              </form>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
