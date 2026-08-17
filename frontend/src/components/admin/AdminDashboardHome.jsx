import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, FileText, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { API_BASE_URL } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

const AdminDashboardHome = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentExams, setRecentExams] = useState([]);
  
  const [logoutIdentifier, setLogoutIdentifier] = useState("");
  const [logoutMessage, setLogoutMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, examsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/stats`, {
            headers: { "Authorization": `Bearer ${token}` }
          }),
          fetch(`${API_BASE_URL}/admin/exams/all`, {
            headers: { "Authorization": `Bearer ${token}` }
          })
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (examsRes.ok) {
          const all = await examsRes.json();
          if (Array.isArray(all)) {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            // 1. Filter for current month only
            const filtered = all.filter(exam => {
              const examDate = new Date(exam.start_time.endsWith("Z") ? exam.start_time : `${exam.start_time}Z`);
              return examDate.getMonth() === currentMonth && examDate.getFullYear() === currentYear;
            });

            // 2. Sort by Status Priority: Ongoing (1) > Upcoming (2) > Completed (3)
            const sorted = filtered.sort((a, b) => {
              const statusA = getExamStatus(a).label;
              const statusB = getExamStatus(b).label;
              
              const priority = { "Ongoing": 1, "Upcoming": 2, "Completed": 3 };
              return priority[statusA] - priority[statusB];
            });

            // 3. Limit to 10
            setRecentExams(sorted.slice(0, 10));
          } else {
            console.error("Expected an array of exams, but received:", all);
            setRecentExams([]);
          }
        }
      } catch (e) {
        console.error("Dashboard data fetch failed", e);
      }
    };

    if (token) fetchData();
  }, [token]);

  const handleForceLogout = async () => {
    if (!logoutIdentifier) return;
    setLogoutMessage({ text: "Processing...", type: "info" });
    try {
      const res = await fetch(`${API_BASE_URL}/admin/force-logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ identifier: logoutIdentifier })
      });
      const data = await res.json();
      if (res.ok) {
        setLogoutMessage({ text: data.message, type: "success" });
        setLogoutIdentifier("");
      } else {
        setLogoutMessage({ text: data.detail || "Failed to force logout", type: "error" });
      }
    } catch (e) {
      setLogoutMessage({ text: "Network error", type: "error" });
    }
    // Clear message after 5 seconds
    setTimeout(() => setLogoutMessage({ text: "", type: "" }), 5000);
  };

  const statItems = [
    {
      title: "Total Exams",
      value: stats?.total_exams ?? "—",
      icon: <FileText size={28} color="#3B82F6" />,
      bgColor: "#EFF6FF"
    },
    {
      title: "Enrolled Students",
      value: stats?.total_students ?? "—",
      icon: <Users size={28} color="#8B5CF6" />,
      bgColor: "#F5F3FF"
    },
    {
      title: "Total Enrollments",
      value: stats?.total_enrollments ?? "—",
      icon: <CheckCircle2 size={28} color="#10B981" />,
      bgColor: "#ECFDF5"
    }
  ];

  const getExamStatus = (exam) => {
    const start = new Date(exam.start_time.endsWith("Z") ? exam.start_time : `${exam.start_time}Z`);
    const now = new Date();
    const end = new Date(start.getTime() + exam.duration * 60000);

    if (now >= start && now <= end) return { label: "Ongoing", bg: "#ECFDF5", color: "#10B981" };
    if (now < start) return { label: "Upcoming", bg: "#EFF6FF", color: "#3B82F6" };
    return { label: "Completed", bg: "#F1F5F9", color: "#64748B" };
  };

  const formatStartTime = (exam) => {
    const d = new Date(exam.start_time.endsWith("Z") ? exam.start_time : `${exam.start_time}Z`);
    return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  };

  return (
    <AdminLayout title="Dashboard Overview">
      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
        {statItems.map((stat, i) => (
          <div key={i} className="admin-card" style={{ marginBottom: 0, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>{stat.title}</p>
                <h3 style={{ margin: '8px 0 0', fontSize: '2.2rem', fontWeight: 800, color: '#1E293B' }}>{stat.value}</h3>
              </div>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: stat.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {stat.icon}
              </div>
            </div>
            <div style={{ marginTop: '20px', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
              <Link to="/admin/my-exams" style={{ color: '#2E4A79', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                View all exams <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Portal Health / Stats Column - Now on Top */}
        <div className="admin-card" style={{ marginBottom: 0 }}>
          <div className="admin-card-header">
            <h3 className="admin-card-title">Portal Health</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '16px' }}>
            <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <CheckCircle2 size={18} color="#10B981" />
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>System Status</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }}></div>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B' }}>All Systems Online</span>
              </div>
            </div>

            <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <FileText size={18} color="#3B82F6" />
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>Database</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B' }}>Supabase Active</span>
              </div>
            </div>

            <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <CheckCircle2 size={18} color="#8B5CF6" />
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>API Performance</span>
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B' }}>124ms Latency</span>
            </div>
          </div>
        </div>

        {/* Student Session Management */}
        <div className="admin-card" style={{ marginBottom: 0 }}>
          <div className="admin-card-header">
            <h3 className="admin-card-title">Student Session Management</h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#64748B', marginBottom: '16px' }}>
            Forcefully log a student out if their session gets stuck (e.g., computer crash). This will clear their active session block.
          </p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input 
              type="text" 
              className="admin-input" 
              placeholder="Enter Student Email or Reg No..." 
              value={logoutIdentifier}
              onChange={(e) => setLogoutIdentifier(e.target.value)}
              style={{ maxWidth: '300px', margin: 0 }}
            />
            <button 
              onClick={handleForceLogout} 
              className="admin-btn-primary" 
              style={{ padding: '10px 20px', margin: 0 }}
            >
              Force Logout
            </button>
          </div>
          {logoutMessage.text && (
            <div style={{ 
              marginTop: '12px', 
              padding: '10px', 
              borderRadius: '6px', 
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: logoutMessage.type === 'success' ? '#ECFDF5' : (logoutMessage.type === 'error' ? '#FEF2F2' : '#EFF6FF'),
              color: logoutMessage.type === 'success' ? '#10B981' : (logoutMessage.type === 'error' ? '#EF4444' : '#3B82F6')
            }}>
              {logoutMessage.text}
            </div>
          )}
        </div>

        {/* Recent Exams Table Card - Below Health */}
        <div className="admin-card" style={{ marginBottom: 0 }}>
          <div className="admin-card-header">
            <h3 className="admin-card-title">Recent Exams (This Month)</h3>
          </div>
          <div className="dashboard-scroll-table" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1, borderBottom: '2px solid #E2E8F0' }}>
                <tr>
                  <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Exam</th>
                  <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Subject</th>
                  <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Start Time</th>
                  <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentExams.map(exam => {
                  const status = getExamStatus(exam);
                  return (
                    <tr key={exam.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '16px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ padding: '6px 10px', backgroundColor: '#F1F5F9', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                            {exam.subject_code || exam.code}
                          </div>
                          <span style={{ fontWeight: 600, color: '#1E293B', fontSize: '0.9rem' }}>{exam.exam_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 0', color: '#475569', fontSize: '0.9rem' }}>{exam.subject}</td>
                      <td style={{ padding: '16px 0', color: '#475569', fontSize: '0.9rem' }}>{formatStartTime(exam)}</td>
                      <td style={{ padding: '16px 0' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                          backgroundColor: status.bg, color: status.color
                        }}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {recentExams.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                      No exams assigned this month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '20px' }}>
            <Link to="/admin/my-exams" style={{ color: '#2E4A79', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>View all exams ›</Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardHome;
