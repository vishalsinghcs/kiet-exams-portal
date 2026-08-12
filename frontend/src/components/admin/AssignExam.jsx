import React, { useState, useEffect } from "react";
import { Users, Search, Trash2, ShieldCheck, Loader2 } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { API_BASE_URL } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

const BRANCHES = ["CSE AI", "CSE AIML"];
const BRANCH_SECTIONS = {
  "CSE AI": ["A", "B", "C", "D"],
  "CSE AIML": ["A", "B", "C"]
};

const AssignExam = () => {
  const { token } = useAuth();
  const [form, setForm] = useState({ examId: "", branch: "", section: "" });

  const getAvailableSections = () => {
    return BRANCH_SECTIONS[form.branch] || [];
  };
  const [exams, setExams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [studentCount, setStudentCount] = useState(null);
  const [countLoading, setCountLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  // Fetch real exams from backend
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/exams/all`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) setExams(await res.json());
      } catch (e) {
        console.error("Failed to fetch exams", e);
      }
    };
    if (token) fetchExams();
  }, [token]);

  // Fetch assigned sections when exam changes
  useEffect(() => {
    if (!form.examId) { setAssignments([]); return; }
    const fetchAssignments = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/exams/${form.examId}/sections`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) setAssignments(await res.json());
      } catch (e) {
        console.error("Failed to fetch section assignments", e);
      }
    };
    fetchAssignments();
  }, [form.examId, token]);

  // Live student count when branch+section both selected
  useEffect(() => {
    if (!form.branch || !form.section) { setStudentCount(null); return; }
    const fetchCount = async () => {
      setCountLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/admin/sections/${encodeURIComponent(form.branch)}/${form.section}/count`,
          { headers: { "Authorization": `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setStudentCount(data.count);
        }
      } catch (e) {
        setStudentCount(null);
      } finally {
        setCountLoading(false);
      }
    };
    fetchCount();
  }, [form.branch, form.section, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.examId || !form.branch || !form.section) {
      setStatus({ type: "error", message: "Please select an exam, branch, and section." });
      return;
    }
    setSubmitting(true);
    setStatus({ type: "", message: "" });
    try {
      const res = await fetch(`${API_BASE_URL}/admin/exams/${form.examId}/assign-section`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ branch: form.branch, section: form.section })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: "success", message: data.message });
        // Refresh section assignments list
        const updated = await fetch(`${API_BASE_URL}/admin/exams/${form.examId}/sections`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (updated.ok) setAssignments(await updated.json());
      } else {
        setStatus({ type: "error", message: data.detail || "Assignment failed." });
      }
    } catch {
      setStatus({ type: "error", message: "Connection error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (assignment) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/exams/${form.examId}/assign-section`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ branch: assignment.branch, section: assignment.section })
      });
      if (res.ok) {
        setAssignments(prev => prev.filter(a => !(a.branch === assignment.branch && a.section === assignment.section)));
        setStatus({ type: "success", message: `Removed ${assignment.branch} - Section ${assignment.section}` });
      }
    } catch {
      setStatus({ type: "error", message: "Failed to remove assignment." });
    }
  };

  return (
    <AdminLayout title="Assign Exams">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>

        {/* Assignment Form */}
        <div className="admin-card">
          <h2 className="admin-card-title" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color="#2E4A79" /> Bulk Assignment by Section
          </h2>

          {status.message && (
            <div className={`admin-alert alert-${status.type}`} style={{ marginBottom: '16px' }}>
              {status.message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>

              <div className="admin-input-group">
                <label className="admin-label">Select Exam</label>
                <select
                  className="admin-input"
                  value={form.examId}
                  onChange={e => setForm({ ...form, examId: e.target.value })}
                  required
                >
                  <option value="">-- Choose Exam --</option>
                  {exams.map(ex => (
                    <option key={ex.id} value={ex.id}>[{ex.subject_code || ex.code}] {ex.exam_name}</option>
                  ))}
                </select>
              </div>

              <div className="admin-input-group">
                <label className="admin-label">Target Branch</label>
                <select
                  className="admin-input"
                  value={form.branch}
                  onChange={e => setForm({ ...form, branch: e.target.value, section: "" })}
                  required
                >
                  <option value="">-- Choose Branch --</option>
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="admin-input-group">
                <label className="admin-label">Target Section</label>
                <select
                  className="admin-input"
                  value={form.section}
                  onChange={e => setForm({ ...form, section: e.target.value })}
                  required
                  disabled={!form.branch}
                >
                  <option value="">{form.branch ? "-- Choose Section --" : "-- Select Branch First --"}</option>
                  {getAvailableSections().map(s => <option key={s} value={s}>Section {s}</option>)}
                </select>
              </div>
            </div>

            {/* Live student count preview */}
            {form.branch && form.section && (
              <div style={{ padding: '16px', backgroundColor: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE', margin: '16px 0 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {countLoading ? (
                  <Loader2 size={20} color="#2563EB" style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Users size={20} color="#2563EB" />
                )}
                <p style={{ margin: 0, color: '#1E3A8A', fontSize: '0.95rem' }}>
                  {countLoading
                    ? "Fetching student count..."
                    : <>This action will assign the exam to <strong>{studentCount ?? 0} student{studentCount !== 1 ? 's' : ''}</strong> in <strong>{form.branch} - Section {form.section}</strong>.</>
                  }
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="admin-btn-primary" disabled={submitting}>
                {submitting ? "Assigning..." : "Confirm Assignment"}
              </button>
            </div>
          </form>
        </div>

        {/* Existing Assignments Table */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h2 className="admin-card-title">
              Currently Assigned Sections
              {form.examId && (
                <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: '#64748B', fontWeight: 400 }}>
                  — {exams.find(e => String(e.id) === String(form.examId))?.exam_name || ""}
                </span>
              )}
            </h2>
          </div>

          {!form.examId ? (
            <p style={{ color: '#94A3B8', textAlign: 'center', padding: '24px' }}>Select an exam above to see its section assignments.</p>
          ) : assignments.length === 0 ? (
            <p style={{ color: '#94A3B8', textAlign: 'center', padding: '24px' }}>No sections assigned to this exam yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Branch & Section</th>
                  <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>Assigned At</th>
                  <th style={{ padding: '12px 0', color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '16px 0' }}>
                      <span style={{ backgroundColor: '#F1F5F9', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                        {a.branch} — Sec {a.section}
                      </span>
                    </td>
                    <td style={{ padding: '16px 0', color: '#64748B', fontSize: '0.9rem' }}>
                      {new Date(a.assigned_at + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: '16px 0', textAlign: 'right' }}>
                      <button
                        className="admin-icon-btn"
                        style={{ marginLeft: 'auto', color: '#EF4444' }}
                        onClick={() => handleRevoke(a)}
                        title="Remove this section assignment"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </AdminLayout>
  );
};

export default AssignExam;
