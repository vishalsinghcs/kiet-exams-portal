import React, { useState } from "react";
import { Users, Search, Trash2, ShieldCheck } from "lucide-react";
import AdminLayout from "./AdminLayout";

const AssignExam = () => {
  const [form, setForm] = useState({ examId: "", branch: "", section: "" });
  
  // Mock Data
  const exams = [
    { id: 1, name: "[CS401] Machine Learning - Mid Sem" },
    { id: 2, name: "[CS402] Cloud Computing - Quiz 1" }
  ];
  
  const assignments = [
    { id: 101, examName: "[CS401] Machine Learning", branch: "CSE AI", section: "A", count: 64, date: "Today, 10:30 AM" },
    { id: 102, examName: "[CS401] Machine Learning", branch: "CSE AI", section: "B", count: 58, date: "Today, 10:32 AM" },
  ];

  const branches = ["CSE AI", "CSE AIML", "CSE IOT", "CSE Core"];
  const sections = ["A", "B", "C", "D", "E"];

  const getStudentCount = () => {
    // Mock simulation:
    if (!form.branch || !form.section) return 0;
    return Math.floor(Math.random() * 20) + 45; // random between 45 and 65
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Mock: Assigned ${form.examId} to ${form.branch} - Sec ${form.section} (${getStudentCount()} students)`);
  };

  return (
    <AdminLayout title="Assign Exams">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Assignment Form */}
        <div className="admin-card">
          <h2 className="admin-card-title" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color="#2E4A79" /> Bulk Assignment by Section
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              
              <div className="admin-input-group">
                <label className="admin-label">Select Exam</label>
                <select 
                  className="admin-input" 
                  value={form.examId}
                  onChange={e => setForm({...form, examId: e.target.value})}
                  required
                >
                  <option value="">-- Choose Exam --</option>
                  {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                </select>
              </div>

              <div className="admin-input-group">
                <label className="admin-label">Target Branch</label>
                <select 
                  className="admin-input" 
                  value={form.branch}
                  onChange={e => setForm({...form, branch: e.target.value})}
                  required
                >
                  <option value="">-- Choose Branch --</option>
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="admin-input-group">
                <label className="admin-label">Target Section</label>
                <select 
                  className="admin-input" 
                  value={form.section}
                  onChange={e => setForm({...form, section: e.target.value})}
                  required
                >
                  <option value="">-- Choose Section --</option>
                  {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
                </select>
              </div>
            </div>

            {form.branch && form.section && (
              <div style={{ padding: '16px', backgroundColor: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE', margin: '10px 0 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Users size={20} color="#2563EB" />
                <p style={{ margin: 0, color: '#1E3A8A', fontSize: '0.95rem' }}>
                  This action will securely assign the exam to approximately <strong>{getStudentCount()} students</strong> in <strong>{form.branch} - Section {form.section}</strong>.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="admin-btn-primary">Confirm Assignment</button>
            </div>
          </form>
        </div>

        {/* Existing Assignments Table */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Currently Assigned Sections</h2>
            <div style={{ position: 'relative', width: '250px' }}>
              <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input type="text" className="admin-input" placeholder="Search..." style={{ paddingLeft: '36px', height: '40px' }} />
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Exam Name</th>
                <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Branch & Section</th>
                <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Students</th>
                <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Assigned Date</th>
                <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '16px 0', fontWeight: 600, color: '#1E293B', fontSize: '0.95rem' }}>{a.examName}</td>
                  <td style={{ padding: '16px 0' }}>
                    <span style={{ backgroundColor: '#F1F5F9', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                      {a.branch} - Sec {a.section}
                    </span>
                  </td>
                  <td style={{ padding: '16px 0', color: '#475569' }}>{a.count}</td>
                  <td style={{ padding: '16px 0', color: '#64748B', fontSize: '0.9rem' }}>{a.date}</td>
                  <td style={{ padding: '16px 0', textAlign: 'right' }}>
                    <button className="admin-icon-btn" style={{ marginLeft: 'auto', color: '#EF4444' }} onClick={() => alert('Mock revoke')}>
                      <Trash2 size={18} />
                    </button>
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

export default AssignExam;
