import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Menu, FileText, Code, UploadCloud, Clock, AlertTriangle, X, Check, Folder, File as FileIcon, Sun, Moon } from 'lucide-react';
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
  const [waitingTimeLeft, setWaitingTimeLeft] = useState("");

  const [submissionFile, setSubmissionFile] = useState(null);
  const [notebookFile, setNotebookFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  const [examEnded, setExamEnded] = useState(false);
  const [endReason, setEndReason] = useState(""); // 'time_up' or 'manual'
  const [autoSubmitStatus, setAutoSubmitStatus] = useState("");
  const [autoSubmitLogs, setAutoSubmitLogs] = useState([]);
  const [nbSubmitStatus, setNbSubmitStatus] = useState("pending");
  const [csvSubmitStatus, setCsvSubmitStatus] = useState("pending");

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
    scanDir('/output');
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
      let text = window.getSelection().toString();
      if (!text && document.activeElement) {
        if (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT') {
          text = document.activeElement.value.substring(document.activeElement.selectionStart, document.activeElement.selectionEnd);
        }
      }
      if (text) {
        localStorage.setItem('examClipboard', text);
      }
      e.preventDefault();
    };

    const handlePaste = (e) => {
      e.preventDefault();
      const text = localStorage.getItem('examClipboard');
      if (text) {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          const start = activeEl.selectionStart;
          const end = activeEl.selectionEnd;
          const val = activeEl.value;
          activeEl.value = val.substring(0, start) + text + val.substring(end);
          activeEl.selectionStart = activeEl.selectionEnd = start + text.length;
          activeEl.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (activeEl && activeEl.isContentEditable) {
          document.execCommand('insertText', false, text);
        }
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
          
          if (found && (found.status === 'submitted' || found.status === 'completed')) {
            setExamEnded(true);
            setEndReason('manual'); // Assuming it was submitted successfully previously
            setAutoSubmitStatus('success');
            setSubmissionSuccess(true);
          }
        }
      } catch (e) {
        console.error("Failed to fetch exam", e);
      } finally {
        setExamLoading(false);
      }
    };
    if (token) fetchExam();
  }, [token, examId]);

  // --- Auto Submit Logic ---
  const submissionFileRef = useRef(null);
  const notebookFileRef = useRef(null);
  const isAutoSubmitting = useRef(false);

  useEffect(() => {
    submissionFileRef.current = submissionFile;
  }, [submissionFile]);

  useEffect(() => {
    notebookFileRef.current = notebookFile;
  }, [notebookFile]);

  const getFileFromWorkspace = async (filename, mimeType) => {
    const getFromPyodide = () => {
      try {
        const iframe = document.querySelector('iframe');
        if (!iframe || !iframe.contentWindow) return null;
        const pyodide = iframe.contentWindow.eval('typeof pyodide !== "undefined" ? pyodide : null');
        if (!pyodide) return null;
        
        const pathsToTry = [filename, '/' + filename, '/workspace/' + filename, '/data/' + filename, '/home/pyodide/' + filename];
        for (let p of pathsToTry) {
            try {
                const fileContent = pyodide.FS.readFile(p);
                let blobPart = fileContent;
                if (typeof fileContent === 'string') {
                    blobPart = new TextEncoder().encode(fileContent);
                }
                return new File([blobPart], filename, { type: mimeType });
            } catch(e) {}
        }
      } catch (e) {}
      return null;
    };

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open('PyExDB', 1);
        request.onsuccess = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('state')) {
            resolve(getFromPyodide());
            return;
          }
          const transaction = db.transaction('state', 'readonly');
          const store = transaction.objectStore('state');
          const getReq = store.get('workspaceState');
          
          getReq.onsuccess = () => {
            const state = getReq.result;
            if (!state) { resolve(getFromPyodide()); return; }
            
            const pyFiles = state.pyFiles || [];
            const foundPy = pyFiles.find(f => f[0] === filename || f[0].endsWith('/' + filename));
            if (foundPy) {
              const content = foundPy[1];
              const blobPart = new TextEncoder().encode(content);
              resolve(new File([blobPart], filename, { type: mimeType }));
              return;
            }
            
            const uploadedFiles = state.uploadedFiles || [];
            const foundUpload = uploadedFiles.find(f => f[0] === filename || f[0].endsWith('/' + filename));
            if (foundUpload) {
               resolve(new File([foundUpload[1].data], filename, { type: mimeType }));
               return;
            }
            
            resolve(getFromPyodide());
          };
          getReq.onerror = () => resolve(getFromPyodide());
        };
        request.onerror = () => resolve(getFromPyodide());
      } catch (e) {
        resolve(getFromPyodide());
      }
    });
  };

  const addLog = (msg) => {
    setAutoSubmitLogs(prev => [...prev, msg]);
  };

  const handleAutoSubmit = async () => {
    if (isAutoSubmitting.current || submissionSuccess) return;
    isAutoSubmitting.current = true;
    
    setExamEnded(true);
    setEndReason("time_up");
    setAutoSubmitStatus("submitting");
    
    let csvFile = null;
    let nbFile = null;

    addLog("Searching for main.ipynb...");
    nbFile = await getFileFromWorkspace('main.ipynb', 'application/x-ipynb+json');
    if (!nbFile) {
      nbFile = notebookFileRef.current;
      if (nbFile) addLog("main.ipynb: using manually selected file.");
      else {
        addLog("main.ipynb: Not Found.");
        setNbSubmitStatus("not_found");
      }
    } else {
      addLog("main.ipynb: Found.");
    }

    addLog("Searching for submission.csv...");
    csvFile = await getFileFromWorkspace('submission.csv', 'text/csv');
    if (!csvFile) {
      csvFile = submissionFileRef.current;
      if (csvFile) addLog("submission.csv: using manually selected file.");
      else {
        addLog("submission.csv: Not Found.");
        setCsvSubmitStatus("not_found");
      }
    } else {
      addLog("submission.csv: Found.");
    }

    if (!csvFile && !nbFile) {
      addLog("No files found to submit, but finalizing exam anyway...");
    }

    try {
      if (csvFile) {
        addLog("Uploading submission.csv...");
        const csvData = new FormData();
        csvData.append("file_type", "csv");
        csvData.append("file", csvFile);
        const resCsv = await fetch(`${API_BASE_URL}/users/me/exams/${examId}/upload`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: csvData
        });
        if (resCsv.ok) {
          addLog("submission.csv: Upload Success.");
          setCsvSubmitStatus("success");
        } else {
          addLog("submission.csv: Upload Failed.");
          setCsvSubmitStatus("failed");
        }
      }

      if (nbFile) {
        addLog("Uploading main.ipynb...");
        const nbData = new FormData();
        nbData.append("file_type", "ipynb");
        nbData.append("file", nbFile);
        const resNb = await fetch(`${API_BASE_URL}/users/me/exams/${examId}/upload`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: nbData
        });
        if (resNb.ok) {
          addLog("main.ipynb: Upload Success.");
          setNbSubmitStatus("success");
        } else {
          addLog("main.ipynb: Upload Failed.");
          setNbSubmitStatus("failed");
        }
      }

      addLog("Finalizing exam submission...");
      const resSubmit = await fetch(`${API_BASE_URL}/users/me/exams/${examId}/submit?force=true`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (resSubmit.ok) {
        addLog("Exam submitted successfully.");
        setAutoSubmitStatus("success");
      } else {
        addLog("Failed to finalize exam submission.");
        setAutoSubmitStatus("failed");
      }
    } catch (err) {
      addLog("Network error during submission.");
      setAutoSubmitStatus("failed");
    }
  };

  // --- Countdown Timer & Waiting Room ---
  useEffect(() => {
    if (!exam) return;
    const startStr = exam.start_time || exam.startTime;
    if (!startStr) return;

    const startTime = new Date(
      startStr.endsWith("Z") ? startStr : `${startStr}Z`
    ).getTime();
    
    const endTime = startTime + exam.duration * 60 * 1000;

    let interval;
    const tick = () => {
      const now = Date.now();
      
      // Check if we are in the waiting period (before start time)
      if (now < startTime) {
        const diffMs = startTime - now;
        const m = Math.floor((diffMs / 60000) % 60);
        const s = Math.floor((diffMs / 1000) % 60);
        setWaitingTimeLeft(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        return; // Don't run the exam timer yet
      }

      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        if (interval) clearInterval(interval);
        handleAutoSubmit();
      }
    };
    
    tick();
    interval = setInterval(tick, 1000);
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
        setExamEnded(true);
        setEndReason("manual");
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

  const isActuallyWaiting = (() => {
    if (!exam) return false;
    const startStr = exam.start_time || exam.startTime;
    if (!startStr) return false;
    const startTime = new Date(startStr.endsWith("Z") ? startStr : `${startStr}Z`).getTime();
    return Date.now() < startTime;
  })();

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-base)', overflow: 'hidden' }}>
      
      {/* Anti-Cheat Warning Modal */}
      {cheatWarning && !examEnded && !isActuallyWaiting && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(255, 59, 48, 0.95)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', padding: '40px', textAlign: 'center' }}>
          <AlertTriangle size={64} style={{ marginBottom: '24px' }} />
          <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>WARNING: Tab Switch Detected</h2>
          <p style={{ fontSize: '18px', maxWidth: '600px', marginBottom: '32px' }}>You have navigated away from the exam window. This incident has been logged. Further violations may result in immediate disqualification.</p>
          <button onClick={() => setCheatWarning(false)} style={{ background: 'white', color: 'var(--danger)', padding: '14px 32px', borderRadius: '12px', fontSize: '16px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            Acknowledge and Return to Exam
          </button>
        </div>
      )}

      {/* Waiting Room Overlay */}
      {isActuallyWaiting && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
          <div style={{ background: 'var(--bg-surface)', padding: '40px', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-light)', maxWidth: '600px', width: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* Top Header: Subject Code & Exam Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px', marginBottom: '24px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-base)', padding: '6px 12px', borderRadius: '6px' }}>{exam.subject_code || exam.subjectCode || 'N/A'}</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{exam.exam_name || exam.examName}</span>
            </div>
            
            {/* Subject Name */}
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '32px', textAlign: 'center' }}>
              {exam.subject}
            </h2>

            {/* Timer */}
            <div style={{ background: 'var(--bg-base)', padding: '32px', borderRadius: 'var(--radius-lg)', width: '100%', marginBottom: '32px', border: '1px solid var(--border-light)', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '16px' }}>Exam Begins In</p>
              <div style={{ fontSize: '56px', fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {waitingTimeLeft || "--:--"}
              </div>
            </div>

            {/* Duration and Date/Time */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', marginBottom: '32px', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} />
                <span style={{ fontSize: '15px', fontWeight: 600 }}>{exam.duration} Minutes</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} />
                <span style={{ fontSize: '15px', fontWeight: 600 }}>
                  {(() => {
                    const st = exam.start_time || exam.startTime;
                    if (!st) return 'TBA';
                    return new Date(st.endsWith('Z') ? st : `${st}Z`).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
                  })()}
                </span>
              </div>
            </div>
            
            {/* Alert */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'var(--info-light, rgba(59,130,246,0.1))', border: '1px solid var(--info, #3b82f6)', padding: '16px', borderRadius: '12px', textAlign: 'left' }}>
              <AlertTriangle size={20} style={{ color: 'var(--info, #3b82f6)', flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                Please remain on this screen. The assessment will initiate automatically when the countdown expires.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* End of Exam Overlay */}
      {examEnded && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(34, 197, 94, 0.95)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', padding: '40px', textAlign: 'center' }}>
          <div style={{ background: 'white', color: 'var(--success)', padding: '24px', borderRadius: '50%', marginBottom: '24px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}>
            {endReason === 'time_up' && autoSubmitStatus !== 'success' && autoSubmitStatus !== 'failed' ? (
              <AlertTriangle size={64} />
            ) : (
              <UploadCloud size={64} />
            )}
          </div>
          
          {endReason === 'time_up' && autoSubmitStatus !== 'success' && autoSubmitStatus !== 'failed' && (
            <>
              <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>Time is over, auto-submitting files...</h2>
              <div style={{ maxWidth: '600px', width: '100%', background: 'rgba(255,255,255,0.9)', borderRadius: '12px', padding: '24px', textAlign: 'left', border: '1px solid rgba(255,255,255,0.5)', color: '#333' }}>
                {autoSubmitLogs.map((log, idx) => {
                  let logColor = '#666';
                  if (log.includes('Success') || log.includes('Found')) logColor = '#15803d'; // dark green
                  else if (log.includes('Failed') || log.includes('Not Found') || log.includes('error')) logColor = '#b91c1c'; // dark red
                  
                  return (
                    <div key={idx} style={{ fontSize: '14px', fontFamily: 'monospace', color: logColor, marginBottom: '8px', fontWeight: 600 }}>
                      {log}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {endReason === 'time_up' && (autoSubmitStatus === 'success' || autoSubmitStatus === 'failed') && (
            <>
              <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>Time is over, exam finalized</h2>
              <p style={{ fontSize: '18px', color: 'white', marginBottom: '32px', opacity: 0.9 }}>Here is the summary of your auto-submitted files.</p>
              
              <div style={{ maxWidth: '500px', width: '100%', background: 'rgba(255,255,255,0.9)', borderRadius: '12px', padding: '16px 24px', textAlign: 'left', color: '#333' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Code size={24} style={{ color: '#555' }} />
                    <span style={{ fontWeight: 600, fontSize: '16px' }}>main.ipynb</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: nbSubmitStatus === 'success' ? '#15803d' : '#b91c1c', fontWeight: 700 }}>
                    {nbSubmitStatus === 'success' ? <Check size={20} /> : <X size={20} />}
                    {nbSubmitStatus === 'success' ? 'Submitted' : nbSubmitStatus === 'not_found' ? 'Not Found' : 'Failed'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FileText size={24} style={{ color: '#555' }} />
                    <span style={{ fontWeight: 600, fontSize: '16px' }}>submission.csv</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: csvSubmitStatus === 'success' ? '#15803d' : '#b91c1c', fontWeight: 700 }}>
                    {csvSubmitStatus === 'success' ? <Check size={20} /> : <X size={20} />}
                    {csvSubmitStatus === 'success' ? 'Submitted' : csvSubmitStatus === 'not_found' ? 'Not Found' : 'Failed'}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '16px', color: 'white', marginTop: '32px', opacity: 0.9 }}>You may safely close this tab.</p>
            </>
          )}

          {endReason === 'manual' && (
            <>
              <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px' }}>You have successfully submitted, your exam is over</h2>
              <p style={{ fontSize: '18px', color: 'white', marginBottom: '32px', opacity: 0.9 }}>Your submission has been finalized. You may safely close this tab.</p>
            </>
          )}
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
              <div style={{ marginTop: '24px', padding: '16px', background: 'var(--info-light, rgba(59,130,246,0.1))', border: '1px solid var(--info, #3b82f6)', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <AlertTriangle size={24} style={{ color: 'var(--info, #3b82f6)', flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontWeight: 700, color: 'var(--info, #3b82f6)', marginBottom: '4px', fontSize: '15px' }}>Important: Auto-Submission Naming Convention</h4>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    When the exam time runs out, the system will automatically submit your work. For auto-submission to work, you <strong>must</strong> name your files exactly <code>main.ipynb</code> and <code>submission.csv</code>. Any other file names will be ignored!
                  </p>
                </div>
              </div>
            </div>

          {/* Coding View */}
          <div style={{ display: activeView === 'coding' ? 'block' : 'none', height: '100%', width: '100%' }}>
            {!isActuallyWaiting && (
              <iframe
                src={`/ide/index.html?examId=${examId}&token=${token}&apiBaseUrl=${encodeURIComponent(API_BASE_URL)}`}
                title="JupyterLite Coding Environment"
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="cross-origin-isolated; clipboard-read; clipboard-write"
              />
            )}
          </div>

          {/* Result View */}
          <div style={{ display: activeView === 'result' ? 'block' : 'none', maxWidth: '700px', margin: 'auto', width: '100%', background: 'var(--bg-surface)', padding: '40px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Submit Your Work</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Upload your generated <code>submission.csv</code> and Jupyter <code>.ipynb</code> notebook.</p>
              
              <div style={{ padding: '16px', background: 'var(--warning-light, rgba(245,158,11,0.1))', border: '1px solid var(--warning, #f59e0b)', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '32px' }}>
                <AlertTriangle size={24} style={{ color: 'var(--warning, #f59e0b)', flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontWeight: 700, color: 'var(--warning, #f59e0b)', marginBottom: '4px', fontSize: '15px' }}>Auto-Submission Notice</h4>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    If time runs out, the system will auto-submit files named exactly <code>main.ipynb</code> and <code>submission.csv</code> from your workspace or output folder. If your files are named differently, they will <strong>not</strong> be submitted!
                  </p>
                </div>
              </div>
              
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
