import React, { useState, useEffect } from "react";
import { Search, Download, Filter, FileSpreadsheet, Users, CheckCircle, XCircle } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { API_BASE_URL } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import MDEditor from "@uiw/react-md-editor";

const ViewResults = () => {
  const { token } = useAuth();
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ assigned: 0, submitted: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  // Preview state
  const [previewData, setPreviewData] = useState(null);
  const [previewType, setPreviewType] = useState(null);

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

  const handleDownload = async (enrollmentId, studentName, type) => {
    try {
      const endpoint = type === 'csv' ? 'download' : 'notebook';
      const ext = type === 'csv' ? 'csv' : 'ipynb';
      const res = await fetch(`${API_BASE_URL}/admin/submissions/${enrollmentId}/${endpoint}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${studentName.replace(/ /g, '_')}_submission.${ext}`;
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

  const handlePreview = async (enrollmentId, type) => {
    try {
      const endpoint = type === 'csv' ? 'download' : 'notebook';
      const res = await fetch(`${API_BASE_URL}/admin/submissions/${enrollmentId}/${endpoint}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.ok) {
        const text = await res.text();
        if (type === 'notebook') {
            setPreviewData(JSON.parse(text));
        } else {
            setPreviewData(text);
        }
        setPreviewType(type);
      } else {
        alert("Failed to load file for preview.");
      }
    } catch (err) {
      console.error("Preview error:", err);
      alert("Network error while trying to preview.");
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
              {exams.map(ex => <option key={ex.id} value={ex.id}>[{ex.subject_code}] {ex.exam_name}</option>)}
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
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {r.has_submission ? (
                        <>
                          <button 
                            className="admin-icon-btn" 
                            style={{ color: '#2E4A79', padding: '4px' }} 
                            onClick={() => handleDownload(r.id, r.name, 'csv')}
                            title="Download CSV"
                          >
                            <Download size={16} />
                          </button>
                          <button 
                            className="admin-icon-btn" 
                            style={{ color: '#10B981', padding: '4px', fontSize: '0.75rem', fontWeight: 600 }} 
                            onClick={() => handlePreview(r.id, 'csv')}
                            title="Preview CSV"
                          >
                            Preview
                          </button>
                        </>
                      ) : <span style={{ color: '#CBD5E1', padding: '4px' }}>—</span>}
                      
                      {r.has_notebook ? (
                        <>
                          <button 
                            className="admin-icon-btn" 
                            style={{ color: '#2E4A79', padding: '4px' }} 
                            onClick={() => handleDownload(r.id, r.name, 'notebook')}
                            title="Download Notebook"
                          >
                            <Download size={16} />
                          </button>
                          <button 
                            className="admin-icon-btn" 
                            style={{ color: '#F59E0B', padding: '4px', fontSize: '0.75rem', fontWeight: 600 }} 
                            onClick={() => handlePreview(r.id, 'notebook')}
                            title="Preview Notebook"
                          >
                            Preview
                          </button>
                        </>
                      ) : <span style={{ color: '#CBD5E1', padding: '4px' }}>—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Preview Modal */}
      {previewData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '40px' }}>
          <div style={{ background: '#FFFFFF', width: '100%', maxWidth: '1000px', height: '80vh', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #E2E8F0' }}>
              <h3 style={{ margin: 0, color: '#1E293B', fontSize: '1.2rem' }}>File Preview ({previewType.toUpperCase()})</h3>
              <button onClick={() => setPreviewData(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <XCircle size={24} />
              </button>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: '#F8FAFC' }}>
              {previewType === 'csv' && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: '#FFFFFF' }}>
                    <tbody>
                      {previewData.split('\n').map((row, i) => (
                        <tr key={i}>
                          {row.split(',').map((cell, j) => (
                            <td key={j} style={{ border: '1px solid #E2E8F0', padding: '8px', fontSize: '0.85rem' }}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {previewType === 'notebook' && previewData.cells && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {previewData.cells.map((cell, idx) => (
                    <div key={idx} style={{ background: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      {cell.cell_type === 'markdown' ? (
                        <div data-color-mode="light">
                          <MDEditor.Markdown source={Array.isArray(cell.source) ? cell.source.join('') : cell.source || ''} />
                        </div>
                      ) : (
                        <div>
                          <pre style={{ background: '#F1F5F9', padding: '12px', borderRadius: '6px', overflowX: 'auto', margin: 0, fontSize: '0.85rem' }}>
                            <code>{Array.isArray(cell.source) ? cell.source.join('') : cell.source || ''}</code>
                          </pre>
                          {cell.outputs && cell.outputs.length > 0 && (
                            <div style={{ marginTop: '10px', padding: '10px', background: '#FEF2F2', borderLeft: '4px solid #EF4444', fontSize: '0.8rem' }}>
                              {cell.outputs.map((out, oidx) => (
                                <div key={oidx}>
                                  {out.text 
                                    ? (Array.isArray(out.text) ? out.text.join('') : out.text) 
                                    : (out.data && out.data['text/plain'] 
                                        ? (Array.isArray(out.data['text/plain']) ? out.data['text/plain'].join('') : out.data['text/plain']) 
                                        : 'Output type not supported in preview')}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ViewResults;

