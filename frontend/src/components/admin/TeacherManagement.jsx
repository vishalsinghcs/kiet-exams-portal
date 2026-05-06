import React, { useState } from "react";
import { Shield, Search, Trash2, UserPlus, CheckCircle } from "lucide-react";
import AdminLayout from "./AdminLayout";

const TeacherManagement = () => {
  const [email, setEmail] = useState("");
  
  // Mock Data
  const admins = [
    { id: 1, name: "Admin User", email: "admin@kiet.edu", role: "Super Admin", date: "01 Jan 2026" },
    { id: 2, name: "Piyush Sir", email: "piyush@kiet.edu", role: "Teacher", date: "15 Apr 2026" }
  ];

  const handleElevate = (e) => {
    e.preventDefault();
    alert(`Mock: Elevated ${email} to Teacher/Admin role.`);
    setEmail("");
  };

  return (
    <AdminLayout title="Manage Teachers & Admins">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Elevate Form */}
        <div className="admin-card">
          <h2 className="admin-card-title" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={20} color="#10B981" /> Grant Teacher Access
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '24px' }}>
            Elevating a user grants them the ability to create exams, view submissions, and manage their assigned sections.
          </p>
          
          <form onSubmit={handleElevate} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
            <div className="admin-input-group" style={{ marginBottom: 0, flex: 1 }}>
              <label className="admin-label">User Email (@kiet.edu)</label>
              <input 
                type="email" 
                className="admin-input" 
                placeholder="teacher.name@kiet.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required 
              />
            </div>
            <button type="submit" className="admin-btn-primary" style={{ height: '46px', background: '#10B981' }}>
              <Shield size={18} /> Elevate User
            </button>
          </form>
        </div>

        {/* Existing Admins Table */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">Current Teachers & Admins</h2>
            <div style={{ position: 'relative', width: '250px' }}>
              <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input type="text" className="admin-input" placeholder="Search users..." style={{ paddingLeft: '36px', height: '40px' }} />
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Name</th>
                <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Email</th>
                <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Role</th>
                <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Added On</th>
                <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map(admin => (
                <tr key={admin.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '16px 0', fontWeight: 600, color: '#1E293B', fontSize: '0.95rem' }}>{admin.name}</td>
                  <td style={{ padding: '16px 0', color: '#475569' }}>{admin.email}</td>
                  <td style={{ padding: '16px 0' }}>
                    <span style={{ 
                      backgroundColor: admin.role === 'Super Admin' ? '#F3E8FF' : '#ECFDF5', 
                      color: admin.role === 'Super Admin' ? '#7E22CE' : '#047857',
                      padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 
                    }}>
                      {admin.role}
                    </span>
                  </td>
                  <td style={{ padding: '16px 0', color: '#64748B', fontSize: '0.9rem' }}>{admin.date}</td>
                  <td style={{ padding: '16px 0', textAlign: 'right' }}>
                    {admin.role !== 'Super Admin' && (
                      <button className="admin-icon-btn" style={{ marginLeft: 'auto', color: '#EF4444' }} title="Revoke Access">
                        <Trash2 size={18} />
                      </button>
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

export default TeacherManagement;
