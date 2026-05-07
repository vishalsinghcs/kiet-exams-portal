import React, { useState, useEffect } from "react";
import { Search, Download, Filter, FileSpreadsheet, Users, CheckCircle, XCircle } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { API_BASE_URL } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

const ViewResults = () => {
  const { token } = useAuth();
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ assigned: 0, submitted: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  // Fetch all exams for dropdown
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/exams/all`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setExams(data);
          if (data.length > 0) {
            setSelectedExam(data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch exams:", err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchExams();
  }, [token]);

  // Fetch results when selected exam changes
  useEffect(() => {
    if (!selectedExam) return;
    
    const fetchResults = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/exams/${selectedExam}/results`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStats({
            assigned: data.assigned,
            submitted: data.submitted,
            pending: data.pending
          });
          setResults(data.results);
        }
      } catch (err) {
        console.error("Failed to fetch results:", err);
      }
    };
    
    fetchResults();
  }, [selectedExam, token]);

  const handleDownload = async (enrollmentId, studentName) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/submissions/${enrollmentId}/download`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${studentName.replace(/ /g, '_')}_submission.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert("Failed to download file. It might be missing on the server.");
      }
    } catch (err) {
      console.error("Download error:", err);
      alert("Network error while trying to download.");
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "—";
    const d = new Date(timeStr.endsWith("Z") ? timeStr : `${timeStr}Z`);
    return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  };

  if (loading) {
    return <AdminLayout title="Exam Results & Submissions"><p>Loading...</p></AdminLayout>;
  }

  return (
    <AdminLayout title="Exam Results & Submissions">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Top Controls */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="admin-input-group" style={{ marginBottom: 0, flex: 1, maxWidth: '400px' }}>
            <select 
              className="admin-input" 
              value={selectedExam || ""}
              onChange={e => setSelectedExam(Number(e.target.value))}
            >
              {exams.length === 0 && <option value="">No exams available</option>}
              {exams.map(ex => <option key={ex.id} value={ex.id}>[{ex.code}] {ex.exam_name}</option>)}
            </select>
          </div>
          <button className="admin-btn-primary" style={{ background: '#10B981', display: 'flex', gap: '8px' }}>
            <FileSpreadsheet size={18} /> Export All Results (CSV)
          </button>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <div className="admin-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
            <div style={{ background: '#EFF6FF', padding: '16px', borderRadius: '12px' }}>
              <Users size={24} color="#3B82F6" />
            </div>
            <div>
              <p style={{ margin: '0 0 4px', color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Assigned</p>
              <h2 style={{ margin: 0, color: '#1E293B', fontSize: '1.8rem' }}>{stats.assigned}</h2>
            </div>
          </div>
          <div className="admin-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
            <div style={{ background: '#ECFDF5', padding: '16px', borderRadius: '12px' }}>
              <CheckCircle size={24} color="#10B981" />
            </div>
            <div>
              <p style={{ margin: '0 0 4px', color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Submitted</p>
              <h2 style={{ margin: 0, color: '#1E293B', fontSize: '1.8rem' }}>{stats.submitted}</h2>
            </div>
          </div>
          <div className="admin-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
            <div style={{ background: '#FEF2F2', padding: '16px', borderRadius: '12px' }}>
              <XCircle size={24} color="#EF4444" />
            </div>
            <div>
              <p style={{ margin: '0 0 4px', color: '#64748B', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Pending</p>
              <h2 style={{ margin: 0, color: '#1E293B', fontSize: '1.8rem' }}>{stats.pending}</h2>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Student Submissions</h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ position: 'relative', width: '250px' }}>
                <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input type="text" className="admin-input" placeholder="Search student..." style={{ paddingLeft: '36px', height: '40px' }} />
              </div>
              <button className="admin-btn-primary" style={{ background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', padding: '0 16px' }}>
                <Filter size={16} /> Filter
              </button>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Student</th>
                <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Branch & Sec</th>
                <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Submitted At</th>
                <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '24px 0', textAlign: 'center', color: '#64748B' }}>
                    No students assigned to this exam.
                  </td>
                </tr>
              )}
              {results.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '16px 0' }}>
                    <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '0.95rem' }}>{r.name}</div>
                    <div style={{ color: '#64748B', fontSize: '0.8rem' }}>{r.email}</div>
                  </td>
                  <td style={{ padding: '16px 0', color: '#475569', fontSize: '0.9rem' }}>{r.branch || 'N/A'} - {r.section || 'N/A'}</td>
                  <td style={{ padding: '16px 0' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                      backgroundColor: r.status === 'Submitted' ? '#ECFDF5' : '#FEF2F2',
                      color: r.status === 'Submitted' ? '#10B981' : '#EF4444'
                    }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 0', color: '#64748B', fontSize: '0.9rem' }}>{formatTime(r.submitted_at)}</td>
                  <td style={{ padding: '16px 0', textAlign: 'right' }}>
                    {r.has_submission ? (
                      <button 
                        className="admin-icon-btn" 
                        style={{ marginLeft: 'auto', color: '#2E4A79' }} 
                        onClick={() => handleDownload(r.id, r.name)}
                        title="Download CSV"
                      >
                        <Download size={18} />
                      </button>
                    ) : (
                      <span style={{ color: '#CBD5E1' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </AdminLayout>
  );
};

export default ViewResults;

