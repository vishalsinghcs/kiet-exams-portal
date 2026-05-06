import React, { useState } from "react";
import { Search, Download, Filter, FileSpreadsheet, Users, CheckCircle, XCircle } from "lucide-react";
import AdminLayout from "./AdminLayout";

const ViewResults = () => {
  const [selectedExam, setSelectedExam] = useState(1);
  
  // Mock Data
  const exams = [
    { id: 1, name: "[CS401] Machine Learning - Mid Sem" },
    { id: 2, name: "[CS402] Cloud Computing - Quiz 1" }
  ];

  const results = [
    { id: 101, name: "Aarav Sharma", email: "aarav@kiet.edu", branch: "CSE AI", section: "A", status: "Submitted", time: "15 May, 12:30 PM", score: 38 },
    { id: 102, name: "Isha Singh", email: "isha@kiet.edu", branch: "CSE AI", section: "A", status: "Submitted", time: "15 May, 12:45 PM", score: 40 },
    { id: 103, name: "Rohan Gupta", email: "rohan@kiet.edu", branch: "CSE AI", section: "B", status: "Not Submitted", time: "-", score: "-" },
    { id: 104, name: "Neha Verma", email: "neha@kiet.edu", branch: "CSE AIML", section: "A", status: "Submitted", time: "15 May, 01:10 PM", score: 35 },
  ];

  const stats = {
    assigned: 124,
    submitted: 108,
    pending: 16
  };

  const handleDownload = (name) => {
    alert(`Mock Download: ${name}_submission.csv`);
  };

  return (
    <AdminLayout title="Exam Results & Submissions">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Top Controls */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="admin-input-group" style={{ marginBottom: 0, flex: 1, maxWidth: '400px' }}>
            <select 
              className="admin-input" 
              value={selectedExam}
              onChange={e => setSelectedExam(Number(e.target.value))}
            >
              {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
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
              {results.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '16px 0' }}>
                    <div style={{ fontWeight: 600, color: '#1E293B', fontSize: '0.95rem' }}>{r.name}</div>
                    <div style={{ color: '#64748B', fontSize: '0.8rem' }}>{r.email}</div>
                  </td>
                  <td style={{ padding: '16px 0', color: '#475569', fontSize: '0.9rem' }}>{r.branch} - {r.section}</td>
                  <td style={{ padding: '16px 0' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                      backgroundColor: r.status === 'Submitted' ? '#ECFDF5' : '#FEF2F2',
                      color: r.status === 'Submitted' ? '#10B981' : '#EF4444'
                    }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 0', color: '#64748B', fontSize: '0.9rem' }}>{r.time}</td>
                  <td style={{ padding: '16px 0', textAlign: 'right' }}>
                    {r.status === 'Submitted' ? (
                      <button 
                        className="admin-icon-btn" 
                        style={{ marginLeft: 'auto', color: '#2E4A79' }} 
                        onClick={() => handleDownload(r.name.replace(' ', '_'))}
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
