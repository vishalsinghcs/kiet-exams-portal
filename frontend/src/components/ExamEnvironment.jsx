import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Menu, FileText, Code, UploadCloud, ChevronRight, Clock } from "lucide-react";
import MDEditor from "@uiw/react-md-editor";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../utils/api";
import "./ExamEnvironment.css";

const ExamEnvironment = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  // Sidebar state
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);

  // View state: 'question' | 'coding' | 'result'
  const [activeView, setActiveView] = useState("question");

  // Exam data from backend
  const [exam, setExam] = useState(null);
  const [examLoading, setExamLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null); // seconds remaining

  // Submission state
  const [submissionFile, setSubmissionFile] = useState(null);
  const [notebookFile, setNotebookFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

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
      // Step 1: Upload CSV
      const csvData = new FormData();
      csvData.append("file_type", "csv");
      csvData.append("file", submissionFile);
      const resCsv = await fetch(`${API_BASE_URL}/users/me/exams/${examId}/upload`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: csvData
      });
      if (!resCsv.ok) throw new Error("Failed to upload CSV. Please try again.");

      // Step 2: Upload Notebook
      const nbData = new FormData();
      nbData.append("file_type", "ipynb");
      nbData.append("file", notebookFile);
      const resNb = await fetch(`${API_BASE_URL}/users/me/exams/${examId}/upload`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: nbData
      });
      if (!resNb.ok) throw new Error("Failed to upload Notebook. Please try again.");

      // Step 3: Finalize Submission
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

  // --- Fetch exam metadata on mount ---
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users/me/exams`, {
          headers: { "Authorization": `Bearer ${token}` }
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

  // --- Countdown timer ---
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
      if (remaining === 0) clearInterval(interval);
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

  // --- Loading state ---
  if (examLoading) {
    return (
      <div className="exam-environment-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A' }}>
        <p style={{ color: '#94A3B8', fontSize: '1.1rem' }}>Loading exam...</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="exam-environment-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#EF4444', fontSize: '1.1rem', marginBottom: '12px' }}>Exam not found or you are not enrolled.</p>
          <button onClick={() => navigate("/dashboard")} style={{ color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const examName = exam.exam_name || exam.examName || "";
  const examCode = exam.subject_code || exam.code || "";
  const examSubject = exam.subject || "";

  return (
    <div className="exam-environment-page">
      {/* Sidebar */}
      <div className={`exam-sidebar ${isSidebarPinned ? 'pinned' : ''}`}>
        <button
          className="hamburger-btn"
          onClick={() => setIsSidebarPinned(!isSidebarPinned)}
        >
          <Menu size={24} />
        </button>

        <div className="sidebar-nav">
          <div
            className={`sidebar-nav-item ${activeView === 'question' ? 'active' : ''}`}
            onClick={() => setActiveView("question")}
          >
            <FileText size={20} className="nav-icon" />
            <span className="nav-text">Question</span>
          </div>

          <div
            className={`sidebar-nav-item ${activeView === 'coding' ? 'active' : ''}`}
            onClick={() => setActiveView("coding")}
          >
            <Code size={20} className="nav-icon" />
            <span className="nav-text">Coding</span>
          </div>

          <div
            className={`sidebar-nav-item ${activeView === 'result' ? 'active' : ''}`}
            onClick={() => setActiveView("result")}
          >
            <UploadCloud size={20} className="nav-icon" />
            <span className="nav-text">Result</span>
          </div>
        </div>

        {/* Timer in expanded sidebar */}
        {isSidebarPinned && (
          <div style={{
            marginTop: 'auto', padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: '8px',
            color: timeLeft !== null && timeLeft < 600 ? '#EF4444' : '#94A3B8',
            fontSize: '0.95rem', fontWeight: 700, fontFamily: 'monospace'
          }}>
            <Clock size={16} />
            <span>{formatTime(timeLeft)}</span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className={`exam-main-content${isSidebarPinned ? ' sidebar-pinned' : ''}`}>

        {/* Timer bar at the top */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '8px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span style={{ color: '#64748B', fontSize: '0.9rem' }}>
            {examCode} — {examSubject}
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            color: timeLeft !== null && timeLeft < 600 ? '#EF4444' : '#F8FAFC',
            fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem'
          }}>
            <Clock size={18} />
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Question View — renders Markdown overview from DB */}
        <div
          className="view-container question-view"
          style={{ display: activeView === "question" ? "block" : "none" }}
        >
          <div className="question-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1>{examName}</h1>
              <p style={{ color: "var(--text-muted)", marginTop: "8px" }}>
                {examCode} · {examSubject} · {exam.duration} minutes
              </p>
            </div>
            <button 
              className="start-coding-btn-fixed" 
              onClick={() => setActiveView("coding")}
              style={{ position: 'static', marginTop: '10px' }}
            >
              Start Coding <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="question-body" style={{ display: 'flex', flexDirection: 'column', gap: '32px', background: 'transparent', boxShadow: 'none', border: 'none', padding: '0' }}>
            {(() => {
              try {
                const extras = typeof exam.exam_sections === 'string' 
                  ? JSON.parse(exam.exam_sections) 
                  : (exam.exam_sections || []);
                  
                if (extras.length === 0) {
                    return (
                      <div className="question-card">
                        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                          No questions or content have been added for this exam yet.
                        </p>
                      </div>
                    );
                }

                return extras.map((section, idx) => (
                  <div key={idx} data-color-mode="light" className="question-card" style={{ 
                      background: 'transparent', 
                      padding: '0', 
                      border: 'none',
                  }}>
                    <h3 style={{ color: '#1E293B', marginBottom: '16px', fontSize: '1.45rem', fontWeight: '800', paddingBottom: '12px', borderBottom: '1px solid #E2E8F0' }}>
                      {section.title}
                    </h3>
                    <div style={{ color: '#334155', fontSize: '1.05rem', lineHeight: '1.8' }}>
                      <MDEditor.Markdown source={section.content} style={{ background: 'transparent', color: 'inherit' }} />
                    </div>
                  </div>
                ));
              } catch (e) {
                return null;
              }
            })()}
          </div>
        </div>

        {/* Coding View */}
        <div
          className="view-container coding-view"
          style={{ display: activeView === "coding" ? "flex" : "none" }}
        >
          <iframe
            src={`/ide/index.html?examId=${examId}&token=${token}&apiBaseUrl=${encodeURIComponent(API_BASE_URL)}`}
            title="JupyterLite Coding Environment"
            className="coding-iframe"
            allow="cross-origin-isolated; clipboard-read; clipboard-write"
          />
        </div>

        {/* Result View */}
        <div
          className="view-container result-view"
          style={{ display: activeView === "result" ? "flex" : "none" }}
        >
          <div className="result-card" style={{ maxWidth: '600px' }}>
            <h2>Submit Your Work</h2>
            <p>Upload your generated <code>submission.csv</code> and Jupyter <code>.ipynb</code> notebook.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div className="upload-area" style={{ marginBottom: 0 }}>
                <UploadCloud size={36} className="upload-icon" />
                <p style={{ fontSize: '0.9rem' }}>Upload CSV File</p>
                <input 
                  type="file" 
                  accept=".csv" 
                  className="file-input" 
                  onChange={handleSubmissionFileChange}
                />
                {submissionFile && <p style={{ marginTop: '10px', color: '#10B981', fontWeight: 'bold', fontSize: '0.85rem' }}>{submissionFile.name}</p>}
              </div>

              <div className="upload-area" style={{ marginBottom: 0 }}>
                <FileText size={36} className="upload-icon" />
                <p style={{ fontSize: '0.9rem' }}>Upload Notebook (.ipynb)</p>
                <input 
                  type="file" 
                  accept=".ipynb" 
                  className="file-input" 
                  onChange={handleNotebookFileChange}
                />
                {notebookFile && <p style={{ marginTop: '10px', color: '#10B981', fontWeight: 'bold', fontSize: '0.85rem' }}>{notebookFile.name}</p>}
              </div>
            </div>

            {submissionError && <p style={{ color: '#EF4444', marginTop: '10px', marginBottom: '10px' }}>{submissionError}</p>}
            <button 
              className="submit-exam-btn" 
              onClick={handleSubmission}
              disabled={isSubmitting || (!submissionFile && !notebookFile)}
              style={{ opacity: (isSubmitting || (!submissionFile && !notebookFile)) ? 0.7 : 1, cursor: (isSubmitting || (!submissionFile && !notebookFile)) ? 'not-allowed' : 'pointer' }}
            >
              {isSubmitting ? "Submitting..." : "Submit Final Exam"}
            </button>
            {submissionSuccess && <p style={{ color: '#10B981', marginTop: '10px' }}>Exam submitted successfully! You may close this tab.</p>}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExamEnvironment;
