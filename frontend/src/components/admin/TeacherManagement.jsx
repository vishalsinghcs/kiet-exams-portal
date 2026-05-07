import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../utils/api";
import AdminLayout from "./AdminLayout";
import { ShieldCheck, UserMinus, UserPlus, Search } from "lucide-react";

const TeacherManagement = () => {
  const { token } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const fetchTeachers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setTeachers(await res.json());
      } else {
        const data = await res.json();
        if (res.status === 403) {
            setStatus({ type: "error", message: "You do not have permission to view this page." });
        }
      }
    } catch (e) {
      console.error("Failed to fetch teachers", e);
    }
  };

  useEffect(() => {
    if (token) fetchTeachers();
  }, [token]);

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const res = await fetch(`${API_BASE_URL}/admin/teachers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (res.ok) {
        setStatus({ type: "success", message: data.message });
        setEmail("");
        fetchTeachers(); // Refresh list
      } else {
        setStatus({ type: "error", message: data.detail || "Failed to add teacher" });
      }
    } catch (e) {
      setStatus({ type: "error", message: "Connection error" });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (userId) => {
    if (!window.confirm("Are you sure you want to revoke this teacher's access? They will become a regular student.")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/teachers/${userId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        setStatus({ type: "success", message: "Teacher access revoked successfully." });
        fetchTeachers();
      } else {
        const data = await res.json();
        setStatus({ type: "error", message: data.detail || "Failed to revoke access." });
      }
    } catch (e) {
      setStatus({ type: "error", message: "Connection error" });
    }
  };

  return (
    <AdminLayout title="Manage Teachers">
      <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '100px' }}>
        
        {status.message && (
          <div className={`admin-alert alert-${status.type}`} style={{ marginBottom: '24px' }}>
            {status.message}
          </div>
        )}

        {/* 1. Add Teacher Section */}
        <div className="admin-card" style={{ marginBottom: '40px' }}>
          <div className="admin-card-header">
            <h3 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={20} color="var(--admin-brand)" /> Elevate User to Teacher
            </h3>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '20px' }}>
            Enter the email address of a registered user to grant them Teacher privileges. Teachers can create exams, assign sections, and view results for their own exams.
          </p>
          
          <form onSubmit={handleAddTeacher} style={{ display: 'flex', gap: '16px' }}>
            <div className="admin-input-group" style={{ flex: 1, marginBottom: 0 }}>
              <div style={{ position: 'relative' }}>
                <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="email" 
                  className="admin-input" 
                  placeholder="teacher.name@kiet.edu" 
                  style={{ paddingLeft: '42px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <button 
              type="submit" 
              className="admin-btn-primary" 
              disabled={loading}
              style={{ width: 'auto', padding: '0 24px' }}
            >
              {loading ? "Adding..." : "Make Teacher"}
            </button>
          </form>
        </div>

        {/* 2. Current Teachers List */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="var(--admin-brand)" /> Active Teachers ({teachers.length})
            </h3>
          </div>
          
          <div className="dashboard-scroll-table">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ borderBottom: '2px solid #E2E8F0' }}>
                <tr>
                  <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Department</th>
                  <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map(teacher => (
                  <tr key={teacher.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '16px 0', fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {teacher.name.charAt(0).toUpperCase()}
                      </div>
                      {teacher.name}
                    </td>
                    <td style={{ padding: '16px 0', color: '#475569', fontSize: '0.9rem' }}>{teacher.email}</td>
                    <td style={{ padding: '16px 0', color: '#475569', fontSize: '0.9rem' }}>
                      <span style={{ padding: '4px 8px', backgroundColor: '#F1F5F9', borderRadius: '6px', fontSize: '0.8rem' }}>
                        {teacher.branch || "General"}
                      </span>
                    </td>
                    <td style={{ padding: '16px 0', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleRevoke(teacher.id)}
                        style={{
                          background: 'none', border: '1px solid #FEE2E2', color: '#EF4444', 
                          padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
                          fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px'
                        }}
                      >
                        <UserMinus size={14} /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
                {teachers.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                      No teachers have been assigned yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default TeacherManagement;
