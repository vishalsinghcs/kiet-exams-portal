import React, { useState } from "react";
import MDEditor from '@uiw/react-md-editor';
import { UploadCloud, X, Plus, Clock, FileKey, CheckCircle2 } from "lucide-react";
import AdminLayout from "./AdminLayout";

const CreateExam = () => {
  const [examForm, setExamForm] = useState({
    code: "", subject: "", exam_name: "", duration: 60, start_time: "", access_code: ""
  });
  const [overview, setOverview] = useState("**Instructions:**\n- All questions are compulsory.\n- No negative marking.");
  const [datasetFile, setDatasetFile] = useState(null);
  const [csvFile, setCsvFile] = useState(null);

  const generateRandomCode = () => {
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    setExamForm({ ...examForm, access_code: randomCode });
  };

  const handleFileDrop = (e, type) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (type === 'dataset') setDatasetFile(file);
    else setCsvFile(file);
  };

  const handleFileInput = (e, type) => {
    const file = e.target.files[0];
    if (type === 'dataset') setDatasetFile(file);
    else setCsvFile(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Exam Created (Mock)", { ...examForm, overview, datasetFile, csvFile });
    // Backend integration happens in next phase
    alert("Exam created successfully! (Frontend Only)");
  };

  return (
    <AdminLayout title="Create New Exam">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        
        {/* Main Form Area */}
        <div className="admin-card" style={{ marginBottom: 0 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              
              <div className="admin-input-group" style={{ marginBottom: 0 }}>
                <label className="admin-label">Subject Code</label>
                <input 
                  type="text" 
                  className="admin-input" 
                  placeholder="e.g. CS401"
                  value={examForm.code}
                  onChange={e => setExamForm({...examForm, code: e.target.value})}
                  required 
                />
              </div>

              <div className="admin-input-group" style={{ marginBottom: 0 }}>
                <label className="admin-label">Subject Name</label>
                <input 
                  type="text" 
                  className="admin-input" 
                  placeholder="e.g. Machine Learning"
                  value={examForm.subject}
                  onChange={e => setExamForm({...examForm, subject: e.target.value})}
                  required 
                />
              </div>

              <div className="admin-input-group" style={{ marginBottom: 0 }}>
                <label className="admin-label">Exam Name</label>
                <input 
                  type="text" 
                  className="admin-input" 
                  placeholder="e.g. Mid Semester"
                  value={examForm.exam_name}
                  onChange={e => setExamForm({...examForm, exam_name: e.target.value})}
                  required 
                />
              </div>

              <div className="admin-input-group" style={{ marginBottom: 0 }}>
                <label className="admin-label">Access Code (6-digit)</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    className="admin-input" 
                    placeholder="••••••"
                    maxLength={6}
                    value={examForm.access_code}
                    onChange={e => setExamForm({...examForm, access_code: e.target.value.replace(/\D/g, '')})}
                    required 
                  />
                  <button type="button" onClick={generateRandomCode} className="admin-btn-primary" style={{ padding: '0 16px', background: '#475569' }}>
                    Generate
                  </button>
                </div>
              </div>

              <div className="admin-input-group" style={{ marginBottom: 0 }}>
                <label className="admin-label"><Clock size={14} style={{ display: 'inline', marginRight: '4px' }}/> Duration (Minutes)</label>
                <input 
                  type="number" 
                  className="admin-input" 
                  min="1" max="300"
                  value={examForm.duration}
                  onChange={e => setExamForm({...examForm, duration: e.target.value})}
                  required 
                />
              </div>

              <div className="admin-input-group" style={{ marginBottom: 0 }}>
                <label className="admin-label">Start Time</label>
                <input 
                  type="datetime-local" 
                  className="admin-input" 
                  value={examForm.start_time}
                  onChange={e => setExamForm({...examForm, start_time: e.target.value})}
                  required 
                />
              </div>
            </div>

            {/* Markdown Editor */}
            <div className="admin-input-group" data-color-mode="light">
              <label className="admin-label">Exam Overview & Questions</label>
              <MDEditor
                value={overview}
                onChange={setOverview}
                height={300}
                style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: 'none' }}
              />
            </div>

            {/* File Upload Zones */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '32px' }}>
              
              <div 
                style={{
                  border: `2px dashed ${datasetFile ? '#10B981' : '#CBD5E1'}`,
                  borderRadius: '12px', padding: '32px 20px', textAlign: 'center',
                  backgroundColor: datasetFile ? '#ECFDF5' : '#F8FAFC',
                  transition: 'all 0.2s', position: 'relative'
                }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleFileDrop(e, 'dataset')}
              >
                {datasetFile ? (
                  <>
                    <CheckCircle2 size={32} color="#10B981" style={{ margin: '0 auto 12px' }} />
                    <p style={{ margin: 0, fontWeight: 600, color: '#065F46' }}>{datasetFile.name}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#047857' }}>{(datasetFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button type="button" onClick={() => setDatasetFile(null)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#10B981' }}><X size={20}/></button>
                  </>
                ) : (
                  <>
                    <UploadCloud size={32} color="#64748B" style={{ margin: '0 auto 12px' }} />
                    <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#475569' }}>Upload Dataset (.zip)</p>
                    <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: '#94A3B8' }}>Max size: 500MB</p>
                    <label className="admin-btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem', cursor: 'pointer', background: '#E2E8F0', color: '#475569' }}>
                      Browse Files
                      <input type="file" style={{ display: 'none' }} accept=".zip" onChange={e => handleFileInput(e, 'dataset')} />
                    </label>
                  </>
                )}
              </div>

              <div 
                style={{
                  border: `2px dashed ${csvFile ? '#10B981' : '#CBD5E1'}`,
                  borderRadius: '12px', padding: '32px 20px', textAlign: 'center',
                  backgroundColor: csvFile ? '#ECFDF5' : '#F8FAFC',
                  transition: 'all 0.2s', position: 'relative'
                }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleFileDrop(e, 'csv')}
              >
                {csvFile ? (
                  <>
                    <CheckCircle2 size={32} color="#10B981" style={{ margin: '0 auto 12px' }} />
                    <p style={{ margin: 0, fontWeight: 600, color: '#065F46' }}>{csvFile.name}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#047857' }}>{(csvFile.size / 1024).toFixed(2)} KB</p>
                    <button type="button" onClick={() => setCsvFile(null)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#10B981' }}><X size={20}/></button>
                  </>
                ) : (
                  <>
                    <FileKey size={32} color="#64748B" style={{ margin: '0 auto 12px' }} />
                    <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#475569' }}>Sample Submission (.csv)</p>
                    <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: '#94A3B8' }}>Format validator file</p>
                    <label className="admin-btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem', cursor: 'pointer', background: '#E2E8F0', color: '#475569' }}>
                      Browse Files
                      <input type="file" style={{ display: 'none' }} accept=".csv" onChange={e => handleFileInput(e, 'csv')} />
                    </label>
                  </>
                )}
              </div>

            </div>

            <div style={{ marginTop: '32px', borderTop: '1px solid #E2E8F0', paddingTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="admin-btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }}>
                <Plus size={18} /> Publish Exam
              </button>
            </div>
          </form>
        </div>

      </div>
    </AdminLayout>
  );
};

export default CreateExam;
