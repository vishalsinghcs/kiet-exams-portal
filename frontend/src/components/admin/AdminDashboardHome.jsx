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
          setRecentExams(all.slice(0, 5));
        }
      } catch (e) {
        console.error("Dashboard data fetch failed", e);
      }
    };

    if (token) fetchData();
  }, [token]);

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
    if (now < start) return { label: "Upcoming", bg: "#EFF6FF", color: "#3B82F6" };
    const end = new Date(start.getTime() + exam.duration * 60000);
    if (now < end) return { label: "Ongoing", bg: "#ECFDF5", color: "#10B981" };
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
                View all <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '60% 38%', gap: '2%' }}>
        {/* Recent Exams Table Card */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">Recent Exams</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
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
                          {exam.code}
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
                    No exams created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div style={{ marginTop: '20px' }}>
            <Link to="/admin/my-exams" style={{ color: '#2E4A79', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>View all exams ›</Link>
          </div>
        </div>

        {/* Portal Status Panel */}
        <div className="admin-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0' }}>
            <h3 className="admin-card-title" style={{ margin: 0 }}>Portal Status</h3>
          </div>

          <div style={{ padding: '20px' }}>
            <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }}></div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>System Online</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                All services running normally. NullPool DB connection active.
              </p>
            </div>

            <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6' }}></div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Backend Connected</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                FastAPI + Supabase (PostgreSQL)
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardHome;
