import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Menu, FileText, Code, UploadCloud, Clock, AlertTriangle, X, Folder, File as FileIcon, Sun, Moon } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../utils/api';

const ExamEnvironment = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const examToken = sessionStorage.getItem(`exam_token_${examId}`);

  const [isSidebarPinned, setIsSidebarPinned] = useState(true);
  const [activeView, setActiveView] = useState("question");

  const [exam, setExam] = useState(null);
  const [examLoading, setExamLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);

  const [submissionFile, setSubmissionFile] = useState(null);
  const [notebookFile, setNotebookFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  const [showFilePicker, setShowFilePicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null); // 'csv' or 'ipynb'
  const [workspaceFiles, setWorkspaceFiles] = useState([]);
  const [pickerError, setPickerError] = useState("");

  const openWorkspacePicker = (target) => {
    setPickerError("");
    setPickerTarget(target);
    const iframe = document.querySelector('iframe');
    
    if (!iframe || !iframe.contentWindow) {
      setPickerError("IDE is still initializing. Please wait a moment.");
      setShowFilePicker(true);
      return;
    }

    let pyodide = null;
    try {
      pyodide = iframe.contentWindow.eval('typeof pyodide !== "undefined" ? pyodide : null');
    } catch(e) {}

    if (!pyodide) {
      setPickerError("IDE is still initializing. Please wait a moment.");
      setShowFilePicker(true);
      return;
    }
    
    const foundFiles = [];
    
    const scanDir = (dir) => {
      try {
        const contents = pyodide.FS.readdir(dir);
        for (const item of contents) {
          if (item === '.' || item === '..') continue;
          const path = dir === '/' ? `/${item}` : `${dir}/${item}`;
          const stat = pyodide.FS.stat(path);
          if (pyodide.FS.isDir(stat.mode)) {
            scanDir(path);
          } else {
            if (path.endsWith(`.${target}`) && item !== 'sample.csv') {
              foundFiles.push(path);
            }
          }
        }
      } catch(e) {}
    };
    
    scanDir('/workspace');
    scanDir('/data');
    setWorkspaceFiles(foundFiles);
    setShowFilePicker(true);
  };

  const handleSelectWorkspaceFile = (path) => {
    try {
      const iframe = document.querySelector('iframe');
      const pyodide = iframe.contentWindow.eval('pyodide');
      
      const fileContent = pyodide.FS.readFile(path);
      const filename = path.split('/').pop();
      
      let blobPart = fileContent;
      if (typeof fileContent === 'string') {
          blobPart = new TextEncoder().encode(fileContent);
      }
      
      const fileObj = new File([blobPart], filename, { 
        type: pickerTarget === 'csv' ? 'text/csv' : 'application/x-ipynb+json' 
      });

      if (pickerTarget === 'csv') {
        if (fileObj.size > 5 * 1024 * 1024) {
          setPickerError('CSV file exceeds 5MB limit.');
          return;
        } else {
          setSubmissionFile(fileObj);
        }
      } else if (pickerTarget === 'ipynb') {
        if (fileObj.size > 15 * 1024 * 1024) {
          setPickerError('Notebook exceeds 15MB limit.');
          return;
        } else {
          setNotebookFile(fileObj);
        }
      }
    } catch (err) {
      setPickerError("Failed to read file from workspace.");
      return;
    }
    setShowFilePicker(false);
  };

  const internalClipboard = useRef("");
  const [cheatWarning, setCheatWarning] = useState(false);
  const [cheatLogs, setCheatLogs] = useState(0);

  // --- ANTI-CHEAT: Visibility Tracker ---
  useEffect(() => {
    const handleViolation = (e) => {
      // If window blurs because the user clicked inside the IDE iframe, ignore it
      if (e && e.type === 'blur' && document.activeElement && document.activeElement.tagName === 'IFRAME') {
        return;
      }
      
      setCheatLogs(prev => {
        const newLogs = prev + 1;
        setCheatWarning(true);
        if (newLogs >= 3) {
          // Block the student after 3 times, logout locally and redirect to login
          alert("You have been blocked from the exam due to multiple tab/window switches.");
          logout(true);
          navigate('/login');
        }
        return newLogs;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) handleViolation();
    };

    window.addEventListener('blur', handleViolation);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('blur', handleViolation);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [navigate, logout]);

  // --- ANTI-CHEAT: Back Button Trap ---
  useEffect(() => {
    window.history.pushState(null, null, window.location.href);
    const handlePopState = (e) => {
      window.history.pushState(null, null, window.location.href);
      setCheatWarning(true);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- ANTI-CHEAT: Internal Clipboard ---
  useEffect(() => {
    const handleCopy = (e) => {
      e.preventDefault();
      const selectedText = window.getSelection().toString();
      internalClipboard.current = selectedText;
    };

    const handlePaste = (e) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        e.preventDefault();
        try {
          document.execCommand('insertText', false, internalClipboard.current);
        } catch (err) {
          activeEl.value = activeEl.value + internalClipboard.current;
        }
      } else {
        e.preventDefault();
      }
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
    };
  }, []);

  // --- Fetch Exam Metadata ---
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users/me/exams`, {
          headers: { 
            "Authorization": `Bearer ${token}`,
            // "X-Exam-Token": examToken // Future backend integration
          }
        });
        if (res.ok) {
          const exams = await res.json();
          const found = exams.find(e => String(e.id) === String(examId));
          setExam(found || null);
        }
      } catch (e) {
        console.error("Failed to fetch exam", e);
      } finally {
        setExamLoading(false);
      }
    };
    if (token) fetchExam();
  }, [token, examId]);

  // --- Countdown Timer ---
  useEffect(() => {
    if (!exam) return;
    const startStr = exam.start_time || exam.startTime;
    if (!startStr) return;

    const endTime = new Date(
      startStr.endsWith("Z") ? startStr : `${startStr}Z`
    ).getTime() + exam.duration * 60 * 1000;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        // Force submit if time is up
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [exam]);

  const formatTime = (seconds) => {
    if (seconds === null) return "--:--:--";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // --- Submissions ---
  const handleSubmissionFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size === 0) {
      alert("Error: The uploaded document is empty.");
      e.target.value = "";
      return;
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert("Error: Only .csv files are supported in this column.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Error: File exceeds the 5MB size limit.");
      e.target.value = "";
      return;
    }
    setSubmissionFile(file);
  };

  const handleNotebookFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size === 0) {
      alert("Error: The uploaded document is empty.");
      e.target.value = "";
      return;
    }
    if (!file.name.toLowerCase().endsWith('.ipynb')) {
      alert("Error: Only .ipynb files are supported in this column.");
      e.target.value = "";
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert("Error: File exceeds the 15MB size limit.");
      e.target.value = "";
      return;
    }
    setNotebookFile(file);
  };

  const handleSubmission = async () => {
    if (!submissionFile || !notebookFile) {
      setSubmissionError("You must select both the .csv and .ipynb files before submitting.");
      return;
    }
    
    setIsSubmitting(true);
    setSubmissionError("");
    setSubmissionSuccess(false);

    try {
      const csvData = new FormData();
      csvData.append("file_type", "csv");
      csvData.append("file", submissionFile);
      const resCsv = await fetch(`${API_BASE_URL}/users/me/exams/${examId}/upload`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: csvData
      });
      if (!resCsv.ok) throw new Error("Failed to upload CSV. Please try again.");

      const nbData = new FormData();
      nbData.append("file_type", "ipynb");
      nbData.append("file", notebookFile);
      const resNb = await fetch(`${API_BASE_URL}/users/me/exams/${examId}/upload`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: nbData
      });
      if (!resNb.ok) throw new Error("Failed to upload Notebook. Please try again.");

      const resSubmit = await fetch(`${API_BASE_URL}/users/me/exams/${examId}/submit`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (resSubmit.ok) {
        setSubmissionSuccess(true);
      } else {
        const errorData = await resSubmit.json();
        setSubmissionError(errorData.detail || "Failed to finalize exam submission.");
      }
    } catch (err) {
      setSubmissionError(err.message || "Network error while submitting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (examLoading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>Loading Exam...</div>;
  }

  if (!exam) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', flexDirection: 'column' }}>
        <p style={{ color: 'var(--danger)', fontSize: '1.2rem', marginBottom: '16px' }}>Exam not found or you are not enrolled.</p>
        <button onClick={() => navigate("/dashboard")} style={{ background: 'var(--accent)', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-base)', overflow: 'hidden' }}>
      
      {/* Anti-Cheat Warning Modal */}
      {cheatWarning && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(255, 59, 48, 0.95)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', padding: '40px', textAlign: 'center' }}>
          <AlertTriangle size={64} style={{ marginBottom: '24px' }} />
          <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>WARNING: Tab Switch Detected</h2>
          <p style={{ fontSize: '18px', maxWidth: '600px', marginBottom: '32px' }}>You have navigated away from the exam window. This incident has been logged. Further violations may result in immediate disqualification.</p>
          <button onClick={() => setCheatWarning(false)} style={{ background: 'white', color: 'var(--danger)', padding: '14px 32px', borderRadius: '12px', fontSize: '16px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            Acknowledge and Return to Exam
          </button>
        </div>
      )}

      {/* Sidebar */}
      <div style={{
        width: isSidebarPinned ? 'var(--sidebar-width, 260px)' : '64px',
        background: 'var(--bg-surface-glass)', backdropFilter: 'blur(24px)', borderRight: '1px solid var(--border-medium)',
        display: 'flex', flexDirection: 'column', transition: 'width 0.3s cubic-bezier(0.2, 1, 0.4, 1)'
      }}>
        <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', justifyContent: isSidebarPinned ? 'space-between' : 'center' }}>
          {isSidebarPinned && <span style={{ fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>CodeML</span>}
          <button onClick={() => setIsSidebarPinned(!isSidebarPinned)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <Menu size={24} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 12px', marginTop: '24px' }}>
          {[
            { id: 'question', icon: FileText, label: 'Question' },
            { id: 'coding', icon: Code, label: 'Coding' },
            { id: 'result', icon: UploadCloud, label: 'Submission' }
          ].map(item => (
            <button key={item.id} onClick={() => setActiveView(item.id)} style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px',
              background: activeView === item.id ? 'var(--bg-surface)' : 'transparent',
              color: activeView === item.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: activeView === item.id ? '1px solid var(--border-light)' : '1px solid transparent',
              boxShadow: activeView === item.id ? 'var(--shadow-sm)' : 'none',
              cursor: 'pointer', transition: 'all 0.2s', width: '100%', justifyContent: isSidebarPinned ? 'flex-start' : 'center'
            }}>
              <item.icon size={20} />
              {isSidebarPinned && <span style={{ fontWeight: 600, fontSize: '14px' }}>{item.label}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Topbar with Timer on Top Right */}
        <header style={{
          height: '64px', background: 'var(--bg-surface-glass)', backdropFilter: 'blur(24px)', borderBottom: '1px solid var(--border-medium)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px'
        }}>
          <div>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '16px' }}>{exam.examName || exam.exam_name}</span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginLeft: '12px' }}>{exam.subject_code || exam.code}</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={toggleTheme}
              style={{
                background: 'var(--bg-base)', border: '1px solid var(--border-light)',
                borderRadius: '50%', width: '36px', height: '36px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-base)', padding: '8px 16px', borderRadius: '24px',
              border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)',
              color: timeLeft !== null && timeLeft < 600 ? 'var(--danger)' : 'var(--text-primary)',
              transition: 'color 0.3s'
            }}>
              <Clock size={18} className={timeLeft !== null && timeLeft < 600 ? 'pulse' : ''} />
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '18px', letterSpacing: '1px' }}>{formatTime(timeLeft)}</span>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div style={{ flex: 1, overflow: 'auto', padding: activeView === 'coding' ? '0' : '40px', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
          
          {/* Question View */}
          <div style={{ display: activeView === 'question' ? 'block' : 'none', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '40px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)' }}>
                {(() => {
                  try {
                    const extras = typeof exam.exam_sections === 'string' 
                      ? JSON.parse(exam.exam_sections) 
                      : (exam.exam_sections || []);
                      
                    if (extras.length === 0) {
                      return <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center' }}>No questions available for this exam.</p>;
                    }

                    return extras.map((section, idx) => (
                      <div key={idx} data-color-mode="light" style={{ marginBottom: idx === extras.length - 1 ? 0 : '40px' }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', paddingBottom: '16px', borderBottom: '1px solid var(--border-medium)', marginBottom: '24px' }}>
                          {section.title}
                        </h3>
                        <div style={{ fontSize: '1.05rem', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
                          <MDEditor.Markdown source={section.content} style={{ background: 'transparent', color: 'inherit' }} />
                        </div>
                      </div>
                    ));
                  } catch (e) {
                    return <p style={{ color: 'var(--danger)' }}>Failed to load questions.</p>;
                  }
                })()}
              </div>
            </div>

          {/* Coding View */}
          <div style={{ display: activeView === 'coding' ? 'block' : 'none', height: '100%', width: '100%' }}>
            <iframe
              src={`/ide/index.html?examId=${examId}&token=${token}&apiBaseUrl=${encodeURIComponent(API_BASE_URL)}`}
              title="JupyterLite Coding Environment"
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="cross-origin-isolated; clipboard-read; clipboard-write"
            />
          </div>

          {/* Result View */}
          <div style={{ display: activeView === 'result' ? 'block' : 'none', maxWidth: '700px', margin: 'auto', width: '100%', background: 'var(--bg-surface)', padding: '40px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Submit Your Work</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Upload your generated <code>submission.csv</code> and Jupyter <code>.ipynb</code> notebook.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
                <div style={{ background: 'var(--bg-base)', border: '2px dashed var(--border-medium)', borderRadius: '16px', padding: '32px 20px', textAlign: 'center', transition: 'border-color 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <UploadCloud size={40} style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }} />
                  <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>Select CSV File</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>Max size 5MB</p>
                  <button onClick={() => openWorkspacePicker('csv')} style={{ background: '#4F46E5', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', marginBottom: submissionFile ? '12px' : '0' }}>Choose from Workspace</button>
                  {submissionFile && <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>{submissionFile.name}</div>}
                </div>

                <div style={{ background: 'var(--bg-base)', border: '2px dashed var(--border-medium)', borderRadius: '16px', padding: '32px 20px', textAlign: 'center', transition: 'border-color 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <FileText size={40} style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }} />
                  <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>Select Notebook</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>.ipynb (Max 15MB)</p>
                  <button onClick={() => openWorkspacePicker('ipynb')} style={{ background: '#4F46E5', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', marginBottom: notebookFile ? '12px' : '0' }}>Choose from Workspace</button>
                  {notebookFile && <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>{notebookFile.name}</div>}
                </div>
              </div>

              {submissionError && <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: '24px' }}>{submissionError}</div>}
              {submissionSuccess && <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', marginBottom: '24px', fontWeight: 600 }}>Exam submitted successfully! You may close this tab.</div>}

              <button 
                onClick={handleSubmission}
                disabled={isSubmitting || (!submissionFile && !notebookFile) || submissionSuccess}
                style={{
                  width: '100%', background: '#4F46E5', color: 'white', padding: '16px', borderRadius: '12px', border: 'none',
                  fontWeight: 700, fontSize: '16px', cursor: (isSubmitting || (!submissionFile && !notebookFile) || submissionSuccess) ? 'not-allowed' : 'pointer',
                  opacity: (isSubmitting || (!submissionFile && !notebookFile) || submissionSuccess) ? 0.6 : 1, transition: 'all 0.2s'
                }}
              >
                {isSubmitting ? "Submitting securely..." : "Finalize Submission"}
              </button>
            </div>

        </div>
      </div>

      {/* File Picker Modal */}
      {showFilePicker && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} onClick={() => setShowFilePicker(false)}>
          <div style={{
            background: 'var(--bg-surface)', width: '100%', maxWidth: '400px', borderRadius: 'var(--radius-lg)', padding: '24px',
            boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-light)'
          }} onClick={e => e.stopPropagation()}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Select {pickerTarget === 'csv' ? 'CSV File' : 'Notebook'}</h3>
              <button onClick={() => setShowFilePicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>

            {pickerError && (
              <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} />
                <span>{pickerError}</span>
              </div>
            )}
            
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {!pickerError && workspaceFiles.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--bg-base)', borderRadius: '8px' }}>
                  <Folder size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ fontSize: '14px' }}>No .{pickerTarget} files found in your workspace.</p>
                </div>
              ) : (
                workspaceFiles.map(path => (
                  <button key={path} onClick={() => handleSelectWorkspaceFile(path)} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-base)', border: '1px solid var(--border-light)', borderRadius: '8px',
                    cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', width: '100%'
                  }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}>
                    <FileIcon size={18} style={{ color: 'var(--text-tertiary)' }} />
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{path}</span>
                  </button>
                ))
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ExamEnvironment;
