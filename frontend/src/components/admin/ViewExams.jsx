import React, { useState, useEffect } from "react";
import { Search, Filter, Clock, Calendar, Eye, EyeOff, Pencil, Trash2, X, Plus } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { API_BASE_URL } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

const ViewExams = () => {
  const { token } = useAuth();
  const [exams, setExams] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCodes, setVisibleCodes] = useState({});
  const [loading, setLoading] = useState(true);

  // Delete confirm state
  const [deleteModal, setDeleteModal] = useState({ open: false, examId: null, examName: "" });
  const [deleting, setDeleting] = useState(false);

  // Edit modal state
  const [editModal, setEditModal] = useState({ open: false, exam: null });
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

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

  useEffect(() => {
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

  const isExamStarted = (exam) => {
    const start = new Date(exam.start_time.endsWith("Z") ? exam.start_time : `${exam.start_time}Z`);
    return new Date() >= start;
  };

  const formatStartTime = (exam) => {
    const d = new Date(exam.start_time.endsWith("Z") ? exam.start_time : `${exam.start_time}Z`);
    return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  };

  // Datetime-local format for input
  const toDatetimeLocal = (isoStr) => {
    const d = new Date(isoStr.endsWith("Z") ? isoStr : `${isoStr}Z`);
    // offset to IST for display
    const offset = 5.5 * 60 * 60000;
    const local = new Date(d.getTime() + offset);
    return local.toISOString().slice(0, 16);
  };

  // --- Open Edit Modal ---
  const openEdit = (exam) => {
    setEditError("");
    setEditForm({
      code: exam.code,
      subject: exam.subject,
      exam_name: exam.exam_name,
      duration: exam.duration,
      access_code: exam.access_code,
      start_time: toDatetimeLocal(exam.start_time),
      overview: exam.overview || "",
    });
    setEditModal({ open: true, exam });
  };

  // --- Save Edit ---
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(editForm.access_code)) {
      setEditError("Access code must be exactly 6 numeric digits.");
      return;
    }
    setSaving(true);
    setEditError("");
    try {
      const res = await fetch(`${API_BASE_URL}/admin/exams/${editModal.exam.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...editForm,
          start_time: new Date(editForm.start_time).toISOString(),
          duration: Number(editForm.duration),
        })
      });
      if (res.ok) {
        setEditModal({ open: false, exam: null });
        await fetchExams(); // refresh cards
      } else {
        const err = await res.json();
        setEditError(err.detail || "Failed to update exam.");
      }
    } catch {
      setEditError("Connection error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // --- Delete ---
  const confirmDelete = (exam) => {
    setDeleteModal({ open: true, examId: exam.id, examName: `${exam.code} — ${exam.exam_name}` });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/exams/${deleteModal.examId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setDeleteModal({ open: false, examId: null, examName: "" });
        setExams(prev => prev.filter(e => e.id !== deleteModal.examId));
      }
    } catch (e) {
      console.error("Delete failed", e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout title="My Exams">

      {/* Edit Modal */}
      {editModal.open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '32px',
            width: '560px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1E293B' }}>Edit Exam</h2>
              <button onClick={() => setEditModal({ open: false, exam: null })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="admin-input-group">
                  <label className="admin-label">Subject Code</label>
                  <input className="admin-input" value={editForm.code}
                    onChange={e => setEditForm({ ...editForm, code: e.target.value })} required />
                </div>
                <div className="admin-input-group">
                  <label className="admin-label">Subject Name</label>
                  <input className="admin-input" value={editForm.subject}
                    onChange={e => setEditForm({ ...editForm, subject: e.target.value })} required />
                </div>
                <div className="admin-input-group">
                  <label className="admin-label">Exam Name</label>
                  <input className="admin-input" value={editForm.exam_name}
                    onChange={e => setEditForm({ ...editForm, exam_name: e.target.value })} required />
                </div>
                <div className="admin-input-group">
                  <label className="admin-label">Access Code (6-digit)</label>
                  <input className="admin-input" value={editForm.access_code} maxLength={6}
                    onChange={e => setEditForm({ ...editForm, access_code: e.target.value.replace(/\D/g, '') })} required />
                </div>
                <div className="admin-input-group">
                  <label className="admin-label">Duration (minutes)</label>
                  <input type="number" className="admin-input" value={editForm.duration} min="1" max="300"
                    onChange={e => setEditForm({ ...editForm, duration: e.target.value })} required />
                </div>
                <div className="admin-input-group">
                  <label className="admin-label">Start Time</label>
                  <input type="datetime-local" className="admin-input" value={editForm.start_time}
                    onChange={e => setEditForm({ ...editForm, start_time: e.target.value })} required />
                </div>
              </div>

              {editError && (
                <div className="admin-alert alert-error" style={{ marginTop: '8px' }}>{editError}</div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                <button type="button" onClick={() => setEditModal({ open: false, exam: null })}
                  className="admin-btn-primary" style={{ background: '#F1F5F9', color: '#475569' }}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteModal.open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '32px',
            width: '420px', maxWidth: '95vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)', textAlign: 'center'
          }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={24} color="#EF4444" />
            </div>
            <h3 style={{ margin: '0 0 8px', color: '#1E293B', fontSize: '1.1rem' }}>Delete Exam?</h3>
            <p style={{ margin: '0 0 24px', color: '#64748B', fontSize: '0.9rem' }}>
              This will permanently delete <strong>{deleteModal.examName}</strong> and remove all student enrollments. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => setDeleteModal({ open: false, examId: null, examName: "" })}
                className="admin-btn-primary" style={{ background: '#F1F5F9', color: '#475569' }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="admin-btn-primary" style={{ background: '#EF4444' }}>
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
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

      {loading && <div style={{ textAlign: 'center', padding: '48px', color: '#64748B' }}>Loading exams...</div>}

      {!loading && filteredExams.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#64748B' }}>
          {searchTerm ? "No exams match your search." : "No exams created yet."}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '24px' }}>
        {filteredExams.map(exam => {
          const status = getExamStatus(exam);
          const started = isExamStarted(exam);
          return (
            <div key={exam.id} className="admin-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Card Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
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
                  {/* Quick Action Buttons */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="admin-icon-btn"
                      title={started ? "Cannot edit a started exam" : "Edit Exam"}
                      disabled={started}
                      onClick={() => !started && openEdit(exam)}
                      style={{ color: started ? '#CBD5E1' : '#2E4A79', cursor: started ? 'not-allowed' : 'pointer' }}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      className="admin-icon-btn"
                      title="Delete Exam"
                      onClick={() => confirmDelete(exam)}
                      style={{ color: '#EF4444' }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
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
                <button className="admin-btn-primary" style={{ flex: 1, padding: '8px 0', fontSize: '0.9rem' }}>
                  View Results
                </button>
                <button
                  className="admin-btn-primary"
                  style={{ flex: 1, padding: '8px 0', fontSize: '0.9rem', background: started ? '#F8FAFC' : '#F1F5F9', color: started ? '#CBD5E1' : '#475569', cursor: started ? 'not-allowed' : 'pointer' }}
                  disabled={started}
                  onClick={() => !started && openEdit(exam)}
                  title={started ? "Cannot edit a started exam" : "Edit Exam"}
                >
                  <Pencil size={15} /> {started ? "Locked" : "Edit Exam"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
};

export default ViewExams;
