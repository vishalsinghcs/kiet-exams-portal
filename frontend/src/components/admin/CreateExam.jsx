import React, { useState } from "react";
import { 
  FileText, Plus, Trash2, UploadCloud, Clock, Calendar, 
  ShieldCheck, ArrowRight, Eye, Info 
} from "lucide-react";
import MDEditor from "@uiw/react-md-editor";
import AdminLayout from "./AdminLayout";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../utils/api";

const CreateExam = () => {
  const { token } = useAuth();
  
  // Basic Form State
  const [form, setForm] = useState({
    code: "",
    subject: "",
    exam_name: "",
    duration: "180",
    start_time: "",
    access_code: "",
    overview: "## Introduction\nWelcome to the exam. Please read the instructions carefully.",
  });

  // Dynamic Sections
  const [extraSections, setExtraSections] = useState([]);

  // File State
  const [dataset, setDataset] = useState(null);
  const [sampleCsv, setSampleCsv] = useState(null);

  // Status State
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleAddSection = () => {
    setExtraSections([...extraSections, { title: "New Section", content: "Write section content here..." }]);
  };

  const handleRemoveSection = (index) => {
    setExtraSections(extraSections.filter((_, i) => i !== index));
  };

  const handleSectionChange = (index, field, value) => {
    const updated = [...extraSections];
    updated[index][field] = value;
    setExtraSections(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.access_code.length !== 6 || !/^\d+$/.test(form.access_code)) {
      setStatus({ type: "error", message: "Access code must be exactly 6 digits." });
      return;
    }

    setSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => formData.append(key, form[key]));
      formData.append("extra_sections", JSON.stringify(extraSections));
      if (dataset) formData.append("dataset", dataset);
      if (sampleCsv) formData.append("sample_csv", sampleCsv);

      const response = await fetch(`${API_BASE_URL}/admin/exams`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        setStatus({ type: "success", message: "Exam created successfully!" });
        // Optional: Reset form or navigate
      } else {
        const err = await response.json();
        setStatus({ type: "error", message: err.detail || "Failed to create exam." });
      }
    } catch (err) {
      setStatus({ type: "error", message: "Connection error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout title="Create New Exam">
      <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "32px", height: "calc(100vh - 160px)" }}>
        
        {/* Left Column: Form Fields */}
        <div style={{ overflowY: "auto", paddingRight: "12px" }}>
          
          {status.message && (
            <div className={`admin-alert alert-${status.type}`} style={{ marginBottom: '24px' }}>
              {status.message}
            </div>
          )}

          <div className="admin-card" style={{ marginBottom: "24px" }}>
            <h2 className="admin-card-title"><Info size={18} /> Basic Information</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "20px" }}>
              <div className="admin-input-group">
                <label className="admin-label">Subject Code</label>
                <input className="admin-input" placeholder="e.g. CS401" value={form.code} onChange={e => setForm({...form, code: e.target.value})} required />
              </div>
              <div className="admin-input-group">
                <label className="admin-label">Subject Name</label>
                <input className="admin-input" placeholder="e.g. Machine Learning" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required />
              </div>
              <div className="admin-input-group">
                <label className="admin-label">Exam Title</label>
                <input className="admin-input" placeholder="e.g. Mid-Semester Exam" value={form.exam_name} onChange={e => setForm({...form, exam_name: e.target.value})} required />
              </div>
              <div className="admin-input-group">
                <label className="admin-label">Access Code (6-digit)</label>
                <input className="admin-input" placeholder="e.g. 123456" maxLength={6} value={form.access_code} onChange={e => setForm({...form, access_code: e.target.value.replace(/\D/g, "")})} required />
              </div>
              <div className="admin-input-group">
                <label className="admin-label">Duration (min)</label>
                <div style={{ position: "relative" }}>
                  <Clock size={16} style={{ position: "absolute", left: "12px", top: "12px", color: "#94A3B8" }} />
                  <input type="number" className="admin-input" style={{ paddingLeft: "36px" }} value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} required />
                </div>
              </div>
              <div className="admin-input-group">
                <label className="admin-label">Start Date & Time</label>
                <div style={{ position: "relative" }}>
                  <Calendar size={16} style={{ position: "absolute", left: "12px", top: "12px", color: "#94A3B8" }} />
                  <input type="datetime-local" className="admin-input" style={{ paddingLeft: "36px" }} value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} required />
                </div>
              </div>
            </div>
          </div>

          <div className="admin-card" style={{ marginBottom: "24px" }}>
            <h2 className="admin-card-title"><FileText size={18} /> Exam Overview (Markdown)</h2>
            <div data-color-mode="light" style={{ marginTop: "20px" }}>
              <MDEditor value={form.overview} onChange={val => setForm({...form, overview: val})} height={300} />
            </div>
          </div>

          {extraSections.map((section, idx) => (
            <div key={idx} className="admin-card" style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <input 
                  className="admin-input" 
                  style={{ border: "none", fontSize: "1.1rem", fontWeight: "bold", padding: 0, background: "transparent" }}
                  value={section.title}
                  onChange={e => handleSectionChange(idx, "title", e.target.value)}
                />
                <button type="button" onClick={() => handleRemoveSection(idx)} style={{ color: "#EF4444", background: "none", border: "none", cursor: "pointer" }}>
                  <Trash2 size={18} />
                </button>
              </div>
              <div data-color-mode="light">
                <MDEditor value={section.content} onChange={val => handleSectionChange(idx, "content", val)} height={200} />
              </div>
            </div>
          ))}

          <button type="button" className="admin-btn-primary" style={{ width: "100%", background: "#F1F5F9", color: "#475569", marginBottom: "32px", border: "2px dashed #CBD5E1" }} onClick={handleAddSection}>
            <Plus size={18} /> Add Extra Section
          </button>
        </div>

        {/* Right Column: Files & Live Preview */}
        <div style={{ overflowY: "auto" }}>
          
          <div className="admin-card" style={{ marginBottom: "24px" }}>
            <h2 className="admin-card-title"><UploadCloud size={18} /> Resources</h2>
            <div style={{ marginTop: "20px", display: "grid", gap: "16px" }}>
              
              <div className="file-upload-zone">
                <label style={{ display: "block", padding: "20px", border: "2px dashed #E2E8F0", borderRadius: "12px", textAlign: "center", cursor: "pointer" }}>
                  <UploadCloud size={24} color="#94A3B8" style={{ margin: "0 auto 8px" }} />
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "#64748B" }}>
                    {dataset ? dataset.name : "Upload Dataset ZIP"}
                  </p>
                  <input type="file" accept=".zip" hidden onChange={e => setDataset(e.target.files[0])} />
                </label>
              </div>

              <div className="file-upload-zone">
                <label style={{ display: "block", padding: "20px", border: "2px dashed #E2E8F0", borderRadius: "12px", textAlign: "center", cursor: "pointer" }}>
                  <FileText size={24} color="#94A3B8" style={{ margin: "0 auto 8px" }} />
                  <p style={{ margin: 0, fontSize: "0.9rem", color: "#64748B" }}>
                    {sampleCsv ? sampleCsv.name : "Upload Sample Submission CSV"}
                  </p>
                  <input type="file" accept=".csv" hidden onChange={e => setSampleCsv(e.target.files[0])} />
                </label>
              </div>

            </div>
          </div>

          <div className="admin-card" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
            <h2 className="admin-card-title"><Eye size={18} /> Live Preview</h2>
            <div style={{ marginTop: "20px", padding: "20px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #F1F5F9", minHeight: "300px" }}>
              <h1 style={{ fontSize: "1.5rem", margin: "0 0 8px" }}>{form.exam_name || "Untitled Exam"}</h1>
              <p style={{ color: "#64748B", fontSize: "0.9rem", marginBottom: "24px" }}>
                {form.code} {form.subject ? `· ${form.subject}` : ""} {form.duration ? `· ${form.duration} mins` : ""}
              </p>
              <div data-color-mode="light" className="markdown-preview">
                <MDEditor.Markdown source={form.overview} />
                {extraSections.map((sec, i) => (
                  <div key={i} style={{ marginTop: "24px" }}>
                    <h2 style={{ fontSize: "1.2rem", borderBottom: "1px solid #F1F5F9", paddingBottom: "8px" }}>{sec.title}</h2>
                    <MDEditor.Markdown source={sec.content} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="admin-btn-primary" style={{ width: "100%", marginTop: "24px", height: "56px", fontSize: "1.1rem" }}>
            {submitting ? "Processing..." : "Create & Launch Exam"} <ArrowRight size={20} />
          </button>
        </div>

      </form>
    </AdminLayout>
  );
};

export default CreateExam;
