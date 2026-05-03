import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut, ShieldAlert, Plus, UserPlus, Shield, Activity, List } from "lucide-react";
import "./AdminDashboard.css";
import logo from "../assets/KIET-Logo.jpg";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { logout, token } = useAuth();
  
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("create_exam");
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);

  // Form states
  const [examForm, setExamForm] = useState({
    code: "", subject: "", exam_name: "", duration: 60, start_time: ""
  });
  const [assignForm, setAssignForm] = useState({ email: "", exam_id: "" });
  const [elevateEmail, setElevateEmail] = useState("");

  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/users/me", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (!data.is_admin) {
            navigate("/dashboard"); // Redirect non-admins
            return;
          }
          setUser(data);
          fetchAllExams();
        } else {
          logout();
          navigate("/login");
        }
      } catch (error) {
        console.error("Auth check failed", error);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchAdminProfile();
    else navigate("/login");
  }, [token, navigate, logout]);

  const fetchAllExams = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/admin/exams/all", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        setExams(await response.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    try {
      // Ensure time includes timezone for backend
      const formattedTime = new Date(examForm.start_time).toISOString();
      
      const response = await fetch("http://127.0.0.1:8000/admin/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ...examForm, start_time: formattedTime })
      });
      
      if (response.ok) {
        showMessage("success", "Exam created successfully!");
        setExamForm({ code: "", subject: "", exam_name: "", duration: 60, start_time: "" });
        fetchAllExams();
      } else {
        showMessage("error", "Failed to create exam.");
      }
    } catch (e) {
      showMessage("error", "An error occurred.");
    }
  };

  const handleAssignExam = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://127.0.0.1:8000/admin/exams/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ email: assignForm.email, exam_id: parseInt(assignForm.exam_id) })
      });
      
      const data = await response.json();
      if (response.ok) {
        showMessage("success", "Exam assigned successfully!");
        setAssignForm({ email: "", exam_id: "" });
      } else {
        showMessage("error", data.detail || "Failed to assign exam.");
      }
    } catch (e) {
      showMessage("error", "An error occurred.");
    }
  };

  const handleElevateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://127.0.0.1:8000/admin/elevate?email=${elevateEmail}`, {
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
    } catch (e) {
      showMessage("error", "An error occurred.");
    }
  };

  if (loading) return <div className="admin-loading">Checking Admin Credentials...</div>;
  if (!user) return null;

  return (
    <div className="admin-page">
      <nav className="admin-navbar">
        <div className="admin-brand">
          <img src={logo} alt="KIET Logo" className="admin-logo-img" />
          <ShieldAlert size={20} className="admin-shield" />
          Admin Portal
        </div>
        <div className="admin-profile">
          <span>{user.email} (Admin)</span>
          <button onClick={() => { logout(); navigate("/"); }} className="admin-logout-btn">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <div className="admin-layout">
        <aside className="admin-sidebar glass-panel">
          <div className={`sidebar-item ${activeTab === 'create_exam' ? 'active' : ''}`} onClick={() => setActiveTab('create_exam')}>
            <Plus size={18} /> Create Exam
          </div>
          <div className={`sidebar-item ${activeTab === 'assign_exam' ? 'active' : ''}`} onClick={() => setActiveTab('assign_exam')}>
            <UserPlus size={18} /> Assign Exam
          </div>
          <div className={`sidebar-item ${activeTab === 'elevate' ? 'active' : ''}`} onClick={() => setActiveTab('elevate')}>
            <Shield size={18} /> Manage Admins
          </div>
          <div className={`sidebar-item ${activeTab === 'all_exams' ? 'active' : ''}`} onClick={() => setActiveTab('all_exams')}>
            <List size={18} /> View All Exams
          </div>
          <div className="sidebar-divider"></div>
          <div className="sidebar-item" onClick={() => navigate("/dashboard")}>
            <Activity size={18} /> Student View
          </div>
        </aside>

        <main className="admin-main-content">
          {message.text && (
            <div className={`admin-alert alert-${message.type}`}>
              {message.text}
            </div>
          )}

          {activeTab === 'create_exam' && (
            <div className="admin-card glass-panel">
              <h2 className="admin-section-title">Create New Exam</h2>
              <form onSubmit={handleCreateExam} className="admin-form">
                <div className="form-group">
                  <label>Exam Code (e.g., CS-402)</label>
                  <input type="text" value={examForm.code} onChange={(e) => setExamForm({...examForm, code: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Subject (e.g., Machine Learning)</label>
                  <input type="text" value={examForm.subject} onChange={(e) => setExamForm({...examForm, subject: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Exam Name (e.g., Mid Semester)</label>
                  <input type="text" value={examForm.exam_name} onChange={(e) => setExamForm({...examForm, exam_name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Duration (in minutes)</label>
                  <input type="number" value={examForm.duration} onChange={(e) => setExamForm({...examForm, duration: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Start Time (IST)</label>
                  <input type="datetime-local" value={examForm.start_time} onChange={(e) => setExamForm({...examForm, start_time: e.target.value})} required />
                </div>
                <button type="submit" className="admin-submit-btn">Create Exam in Database</button>
              </form>
            </div>
          )}

          {activeTab === 'assign_exam' && (
            <div className="admin-card glass-panel">
              <h2 className="admin-section-title">Assign Exam to Student</h2>
              <form onSubmit={handleAssignExam} className="admin-form">
                <div className="form-group">
                  <label>Student Email (@kiet.edu)</label>
                  <input type="email" value={assignForm.email} onChange={(e) => setAssignForm({...assignForm, email: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Select Exam</label>
                  <select value={assignForm.exam_id} onChange={(e) => setAssignForm({...assignForm, exam_id: e.target.value})} required>
                    <option value="">-- Choose an Exam --</option>
                    {exams.map(ex => (
                      <option key={ex.id} value={ex.id}>{ex.code} - {ex.subject}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="admin-submit-btn">Assign Exam</button>
              </form>
            </div>
          )}

          {activeTab === 'elevate' && (
            <div className="admin-card glass-panel">
              <h2 className="admin-section-title">Promote User to Admin</h2>
              <p className="admin-desc">Granting admin privileges will allow this user to create and assign exams.</p>
              <form onSubmit={handleElevateUser} className="admin-form">
                <div className="form-group">
                  <label>User Email (@kiet.edu)</label>
                  <input type="email" value={elevateEmail} onChange={(e) => setElevateEmail(e.target.value)} required />
                </div>
                <button type="submit" className="admin-submit-btn danger-btn">Elevate to Admin</button>
              </form>
            </div>
          )}

          {activeTab === 'all_exams' && (
            <div className="admin-card glass-panel">
              <h2 className="admin-section-title">Database Exams</h2>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Code</th>
                      <th>Subject</th>
                      <th>Duration</th>
                      <th>Start Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map(ex => (
                      <tr key={ex.id}>
                        <td>{ex.id}</td>
                        <td>{ex.code}</td>
                        <td>{ex.subject}</td>
                        <td>{ex.duration} min</td>
                        <td>{new Date(ex.start_time).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
