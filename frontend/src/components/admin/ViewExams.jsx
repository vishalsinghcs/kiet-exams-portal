import React, { useState, useEffect } from "react";
import { Search, Filter, MoreHorizontal, Clock, Calendar, Eye, EyeOff } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { API_BASE_URL } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

const ViewExams = () => {
  const { token } = useAuth();
  const [exams, setExams] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCodes, setVisibleCodes] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/exams/all`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) setExams(await response.json());
      } catch (e) {
        console.error("Fetch exams failed", e);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchExams();
  }, [token]);

  const filteredExams = exams.filter(ex =>
    ex.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ex.exam_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleCodeVisibility = (id) => {
    setVisibleCodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
    <AdminLayout title="My Exams">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} color="#64748B" style={{ position: 'absolute', left: '14px', top: '11px' }} />
          <input
            type="text"
            className="admin-input"
            placeholder="Search by code, subject or name..."
            style={{ paddingLeft: '40px' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="admin-btn-primary" style={{ background: '#FFFFFF', color: '#475569', border: '1px solid #E2E8F0' }}>
            <Filter size={16} /> Filter
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#64748B' }}>
          Loading exams...
        </div>
      )}

      {!loading && filteredExams.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#64748B' }}>
          {searchTerm ? "No exams match your search." : "No exams created yet."}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '24px' }}>
        {filteredExams.map(exam => {
          const status = getExamStatus(exam);
          return (
            <div key={exam.id} className="admin-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Card Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ padding: '4px 8px', background: '#F1F5F9', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                        {exam.code}
                      </span>
                      <span style={{
                        padding: '4px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600,
                        backgroundColor: status.bg, color: status.color
                      }}>
                        ● {status.label}
                      </span>
                    </div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, color: '#1E293B' }}>{exam.subject}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748B' }}>{exam.exam_name}</p>
                  </div>
                  <button className="admin-icon-btn"><MoreHorizontal size={20}/></button>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '20px 24px', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.85rem' }}>
                    <Clock size={16} color="#94A3B8" /> {exam.duration} mins
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.85rem' }}>
                    <Calendar size={16} color="#94A3B8" /> {formatStartTime(exam)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Access Code:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F1F5F9', padding: '6px 12px', borderRadius: '6px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: '#1E293B', letterSpacing: '2px' }}>
                      {visibleCodes[exam.id] ? exam.access_code : "••••••"}
                    </span>
                    <button onClick={() => toggleCodeVisibility(exam.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#64748B' }}>
                      {visibleCodes[exam.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '12px' }}>
                <button className="admin-btn-primary" style={{ flex: 1, padding: '8px 0', fontSize: '0.9rem' }}>View Results</button>
                <button className="admin-btn-primary" style={{ flex: 1, padding: '8px 0', fontSize: '0.9rem', background: '#F1F5F9', color: '#475569' }}>Edit Exam</button>
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
};

export default ViewExams;
