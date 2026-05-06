import React, { useState, useEffect } from "react";
import { 
  FileText, Plus, Trash2, UploadCloud, Clock, Calendar, 
  ShieldCheck, ArrowRight, Eye, Info, FileEdit,
  ChevronUp, ChevronDown 
} from "lucide-react";
import MDEditor from "@uiw/react-md-editor";
import AdminLayout from "./AdminLayout";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../utils/api";

const DEFAULT_SECTIONS = [
  { id: "overview", title: "Overview", content: "Provide a high-level summary of the exam and its context.", isEditing: false },
  { id: "objective", title: "Objective", content: "What is the primary goal of this exam? What skills are being tested?", isEditing: false },
  { id: "evaluation", title: "Evaluation Metric", content: "How will the submissions be measured (e.g., Accuracy, F1-Score, RMSE)?", isEditing: false },
  { id: "submission", title: "Submission Format", content: "Explain how the student should format their CSV or code file.", isEditing: false },
  { id: "marking", title: "Marking Scheme", content: "Detail the weightage of each section or question.", isEditing: false }
];

const CreateExam = () => {
  const { token } = useAuth();
  
  const [form, setForm] = useState({
    code: "",
    subject: "",
    exam_name: "",
    duration: "180",
    start_time: "",
    access_code: "",
  });

  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [dataset, setDataset] = useState(null);
  const [sampleCsv, setSampleCsv] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [activeSection, setActiveSection] = useState(sections[0]?.id);
  const [collapsedSections, setCollapsedSections] = useState(new Set());

  // Intersection Observer for scroll-spy (Strict Top Highlight)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      // Tight margin to only catch what's at the very top (below topbar)
      { threshold: 0, rootMargin: "-80px 0px -90% 0px" }
    );

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  const handleAddSection = () => {
    const id = `section-${Date.now()}`;
    setSections([...sections, { id, title: `New Section`, content: "", isEditing: true }]);
    setTimeout(() => scrollToSection(id), 100);
  };

  const handleRemoveSection = (index) => {
    if (index < DEFAULT_SECTIONS.length) {
       if (!window.confirm("This is a default section. Are you sure you want to remove it?")) return;
    }
    setSections(sections.filter((_, i) => i !== index));
  };

  const handleSectionChange = (index, field, value) => {
    const updated = [...sections];
    updated[index][field] = value;
    setSections(updated);
  };

  const handleToggleEdit = (index, state) => {
    const updated = [...sections];
    updated[index].isEditing = state;
    setSections(updated);
  };

  const toggleCollapse = (id) => {
    const updated = new Set(collapsedSections);
    if (updated.has(id)) updated.delete(id);
    else updated.add(id);
    setCollapsedSections(updated);
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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
      formData.append("extra_sections", JSON.stringify(sections));
      
      if (dataset) formData.append("dataset", dataset);
      if (sampleCsv) formData.append("sample_csv", sampleCsv);

      const response = await fetch(`${API_BASE_URL}/admin/exams`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        setStatus({ type: "success", message: "Exam created and launched successfully!" });
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
      <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '100px' }}>
        
        {status.message && (
          <div className={`admin-alert alert-${status.type}`} style={{ marginBottom: '24px' }}>
            {status.message}
          </div>
        )}

        {/* 1. TOP: Exam Parameters */}
        <div className="admin-card" style={{ marginBottom: '40px', border: '1px solid #e2e8f0' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 className="admin-card-title" style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Info size={22} color="var(--admin-brand)" /> Exam Parameters
              </h2>
              <button 
                type="button" 
                className="admin-btn-primary" 
                disabled={submitting}
                onClick={handleSubmit}
                style={{ borderRadius: '10px', height: '44px' }}
              >
                {submitting ? "Launching..." : "Launch Exam"} <ArrowRight size={18} />
              </button>
           </div>
           
           <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
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
                <input className="admin-input" placeholder="e.g. Final Semester" value={form.exam_name} onChange={e => setForm({...form, exam_name: e.target.value})} required />
              </div>
              <div className="admin-input-group">
                <label className="admin-label">Passkey (6-digit)</label>
                <input className="admin-input" placeholder="123456" maxLength={6} value={form.access_code} onChange={e => setForm({...form, access_code: e.target.value.replace(/\D/g, "")})} required />
              </div>
              <div className="admin-input-group">
                <label className="admin-label">Duration (min)</label>
                <input type="number" className="admin-input" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} required />
              </div>
              <div className="admin-input-group">
                <label className="admin-label">Start Date & Time</label>
                <input type="datetime-local" className="admin-input" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} required />
              </div>
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
              <div>
                <label className="admin-label" style={{ marginBottom: '8px', display: 'block' }}>Dataset (.zip)</label>
                <label className="project-file-upload">
                  <UploadCloud size={18} />
                  <span>{dataset ? dataset.name : "Click to upload dataset"}</span>
                  <input type="file" accept=".zip" hidden onChange={e => setDataset(e.target.files[0])} />
                </label>
              </div>
              <div>
                <label className="admin-label" style={{ marginBottom: '8px', display: 'block' }}>Sample Submission (.csv)</label>
                <label className="project-file-upload">
                  <FileText size={18} />
                  <span>{sampleCsv ? sampleCsv.name : "Click to upload sample"}</span>
                  <input type="file" accept=".csv" hidden onChange={e => setSampleCsv(e.target.files[0])} />
                </label>
              </div>
           </div>
        </div>

        {/* 2. CONTENT & SIDEBAR */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '60px', alignItems: 'start' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '80vh' }}>
            {sections.map((section, idx) => (
              <div key={section.id} id={section.id} className="exam-section-block" style={{ scrollMarginTop: '80px' }}>
                
                {section.isEditing ? (
                  // EDIT MODE
                  <>
                    <button type="button" onClick={() => handleRemoveSection(idx)} className="section-delete-btn-top">
                      <Trash2 size={18} />
                    </button>

                    <div className="section-edit-card">
                      <div className="section-title-wrapper">
                        <label className="section-title-label">SECTION HEADING</label>
                        <input 
                          className="section-title-input" 
                          value={section.title}
                          onChange={e => handleSectionChange(idx, "title", e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="section-edit-card">
                       <label className="section-title-label">SECTION CONTENT</label>
                       <div data-color-mode="light" className="section-md-editor">
                        <MDEditor 
                          value={section.content} 
                          onChange={val => handleSectionChange(idx, "content", val || "")} 
                          preview="edit"
                          height={300}
                        />
                      </div>
                      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => handleToggleEdit(idx, false)} className="admin-btn-primary" style={{ height: '40px', padding: '0 24px', borderRadius: '8px' }}>
                          Save Section
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  // PREVIEW MODE
                  <div style={{ padding: '0' }}>
                    <div className="section-preview-header">
                       <h2 style={{ color: '#1E293B', fontSize: '1.4rem', margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>{section.title}</h2>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                         <button type="button" onClick={() => handleToggleEdit(idx, true)} style={{ background: 'rgba(27, 42, 74, 0.05)', border: 'none', color: 'var(--admin-brand)', padding: '6px 12px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                           <FileEdit size={14} /> Edit
                         </button>
                         <button 
                           type="button" 
                           onClick={() => toggleCollapse(section.id)}
                           style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                         >
                           {collapsedSections.has(section.id) ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                         </button>
                       </div>
                    </div>
                    
                    {!collapsedSections.has(section.id) && (
                      <div className="markdown-preview-scroll" data-color-mode="light">
                        <MDEditor.Markdown source={section.content || "_No content provided._"} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Sticky ToC Sidebar */}
          <div style={{ position: 'sticky', top: '24px', alignSelf: 'start' }}>
            <div className="preview-sidebar" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '20px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <h3 style={{ color: '#1E293B', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, fontWeight: 800 }}>
                  Sections
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {sections.map((s) => (
                  <button 
                    key={s.id} 
                    onClick={() => scrollToSection(s.id)}
                    className={`toc-item ${activeSection === s.id ? 'active' : ''}`}
                  >
                    <span style={{ color: '#64748B', fontSize: '0.9rem', fontWeight: 600 }}>{s.title}</span>
                  </button>
                ))}
              </div>
              <div style={{ padding: '16px', borderTop: '1px solid #f1f5f9' }}>
                 <button type="button" className="add-section-sidebar-btn" onClick={handleAddSection}>
                   <Plus size={18} /> Add New Section
                 </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
};

export default CreateExam;
