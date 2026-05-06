import React from "react";
import { Users, FileText, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import AdminLayout from "./AdminLayout";

const AdminDashboardHome = () => {
  // Mock data for frontend preview
  const stats = [
    { title: "Total Exams", value: "24", icon: <FileText size={28} color="#3B82F6" />, bgColor: "#EFF6FF" },
    { title: "Enrolled Students", value: "856", icon: <Users size={28} color="#8B5CF6" />, bgColor: "#F5F3FF" },
    { title: "Pending Submissions", value: "142", icon: <CheckCircle2 size={28} color="#10B981" />, bgColor: "#ECFDF5" }
  ];

  const recentExams = [
    { id: 1, code: "CS401", name: "Machine Learning - Mid Sem", sections: "CSE AI-A, CSE AI-B", time: "10:00 AM", status: "Active" },
    { id: 2, code: "CS402", name: "Cloud Computing - Quiz 1", sections: "CSE AIML-A", time: "Tomorrow", status: "Scheduled" },
    { id: 3, code: "CS305", name: "Data Structures - Final", sections: "All Sections", time: "Yesterday", status: "Completed" }
  ];

  const todaySchedule = [
    { subject: "Machine Learning", code: "CSE AI-A", time: "10:00 AM - 1:00 PM", active: true },
    { subject: "Computer Networks", code: "CSE AIML-B", time: "2:00 PM - 3:30 PM", active: false }
  ];

  return (
    <AdminLayout title="Dashboard Overview">
      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '24px' }}>
        {stats.map((stat, i) => (
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
              <a href="#" style={{ color: '#2E4A79', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                View all <ChevronRight size={14} />
              </a>
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
                <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Sections</th>
                <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Time</th>
                <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentExams.map(exam => (
                <tr key={exam.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '16px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ padding: '6px 10px', backgroundColor: '#F1F5F9', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                        {exam.code}
                      </div>
                      <span style={{ fontWeight: 600, color: '#1E293B', fontSize: '0.9rem' }}>{exam.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 0', color: '#475569', fontSize: '0.9rem' }}>{exam.sections}</td>
                  <td style={{ padding: '16px 0', color: '#475569', fontSize: '0.9rem' }}>{exam.time}</td>
                  <td style={{ padding: '16px 0' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                      backgroundColor: exam.status === 'Active' ? '#ECFDF5' : exam.status === 'Scheduled' ? '#EFF6FF' : '#F1F5F9',
                      color: exam.status === 'Active' ? '#10B981' : exam.status === 'Scheduled' ? '#3B82F6' : '#64748B'
                    }}>
                      {exam.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '20px' }}>
            <a href="#" style={{ color: '#2E4A79', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>View all exams ›</a>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="admin-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="admin-card-title" style={{ margin: 0 }}>Today, <span style={{ fontWeight: 800 }}>Mon 5</span></h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ border: '1px solid #E2E8F0', background: 'white', borderRadius: '6px', padding: '4px', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
              <button style={{ border: '1px solid #E2E8F0', background: 'white', borderRadius: '6px', padding: '4px', cursor: 'pointer' }}><ChevronRight size={16} /></button>
            </div>
          </div>
          
          <div style={{ padding: '12px' }}>
            {todaySchedule.map((item, i) => (
              <div key={i} style={{ 
                padding: '16px', margin: '8px 0', borderRadius: '12px',
                backgroundColor: item.active ? '#2E4A79' : 'transparent',
                color: item.active ? 'white' : '#1E293B',
                transition: 'background 0.2s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.subject}</span>
                  <span style={{ 
                    fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 600,
                    backgroundColor: item.active ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
                    color: item.active ? 'white' : '#64748B'
                  }}>{item.code}</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: item.active ? 'rgba(255,255,255,0.8)' : '#64748B', fontWeight: 500 }}>
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardHome;
