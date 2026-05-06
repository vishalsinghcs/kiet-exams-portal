import React, { useState } from "react";
import { Search, Filter, MoreHorizontal, Clock, Calendar, Users, Eye, EyeOff } from "lucide-react";
import AdminLayout from "./AdminLayout";

const ViewExams = () => {
  const [exams, setExams] = useState([
    { id: 1, code: "CS401", subject: "Machine Learning", name: "Mid Semester", duration: 180, date: "15 May 2026", time: "10:00 AM", status: "Active", assigned: "CSE AI-A, CSE AI-B", students: 86, accessCode: "847291" },
    { id: 2, code: "CS402", subject: "Cloud Computing", name: "Quiz 1", duration: 60, date: "20 May 2026", time: "2:00 PM", status: "Scheduled", assigned: "CSE AIML-A", students: 45, accessCode: "193847" },
    { id: 3, code: "CS305", subject: "Data Structures", name: "Final", duration: 180, date: "10 May 2026", time: "9:00 AM", status: "Completed", assigned: "All Sections", students: 210, accessCode: "958210" }
  ]);

  const [visibleCodes, setVisibleCodes] = useState({});

  const toggleCodeVisibility = (id) => {
    setVisibleCodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <AdminLayout title="My Exams">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} color="#64748B" style={{ position: 'absolute', left: '14px', top: '11px' }} />
          <input type="text" className="admin-input" placeholder="Search exams..." style={{ paddingLeft: '40px' }} />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="admin-btn-primary" style={{ background: '#FFFFFF', color: '#475569', border: '1px solid #E2E8F0' }}>
            <Filter size={16} /> Filter
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '24px' }}>
        {exams.map(exam => (
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
                      backgroundColor: exam.status === 'Active' ? '#ECFDF5' : exam.status === 'Scheduled' ? '#EFF6FF' : '#F1F5F9',
                      color: exam.status === 'Active' ? '#10B981' : exam.status === 'Scheduled' ? '#3B82F6' : '#64748B'
                    }}>
                      ● {exam.status}
                    </span>
                  </div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, color: '#1E293B' }}>{exam.subject}</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748B' }}>{exam.name}</p>
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
                  <Calendar size={16} color="#94A3B8" /> {exam.date}, {exam.time}
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E293B', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                  <Users size={16} color="#3B82F6" /> Assigned To
                </div>
                <p style={{ margin: 0, color: '#475569', fontSize: '0.85rem' }}>
                  {exam.assigned} <span style={{ color: '#94A3B8' }}>({exam.students} students)</span>
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Access Code:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F1F5F9', padding: '6px 12px', borderRadius: '6px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: '#1E293B', letterSpacing: '2px' }}>
                    {visibleCodes[exam.id] ? exam.accessCode : "••••••"}
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
        ))}
      </div>
    </AdminLayout>
  );
};

export default ViewExams;
