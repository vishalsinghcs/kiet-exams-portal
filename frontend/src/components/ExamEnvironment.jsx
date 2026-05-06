import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Menu, FileText, Code, UploadCloud, ChevronRight, Lock, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import "./ExamEnvironment.css";

const ExamEnvironment = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  // Access Gate State
  const [codeVerified, setCodeVerified] = useState(false);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef([]);

  // Sidebar state
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  
  // View state: 'question' | 'coding' | 'result'
  const [activeView, setActiveView] = useState("question");

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return; // Only 1 digit
    if (!/^\d*$/.test(value)) return; // Only numbers
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError("");

    // Auto focus next
    if (value !== "" && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && code[index] === "" && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const verifyCode = (e) => {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }
    
    setIsVerifying(true);
    
    // Mock backend verification
    setTimeout(() => {
      setIsVerifying(false);
      // Hardcoded mock pass code
      if (fullCode === "123456") {
        setCodeVerified(true);
      } else {
        setError("Incorrect code. Please ask your invigilator.");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0].focus();
      }
    }, 1000);
  };

  if (!codeVerified) {
    return (
      <div className="exam-environment-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A' }}>
        <AnimatePresence>
          <motion.div 
            className="gate-container"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ 
              background: '#1E293B', padding: '40px', borderRadius: '24px', 
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)', maxWidth: '500px', width: '90%',
              textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div style={{ width: '64px', height: '64px', background: 'rgba(59,130,246,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Lock size={32} color="#3B82F6" />
            </div>
            
            <h1 style={{ color: '#F8FAFC', margin: '0 0 8px', fontSize: '1.8rem' }}>Enter Exam Code</h1>
            <p style={{ color: '#94A3B8', margin: '0 0 24px', fontSize: '1rem' }}>Please enter the 6-digit access code provided by your invigilator.</p>
            
            <div style={{ background: 'rgba(15,23,42,0.5)', padding: '16px', borderRadius: '12px', marginBottom: '32px' }}>
              <h3 style={{ margin: '0 0 4px', color: '#E2E8F0', fontSize: '1.1rem' }}>Machine Learning — Mid Semester</h3>
              <p style={{ margin: 0, color: '#64748B', fontSize: '0.9rem' }}>CS401 · CSE AI · Section B</p>
            </div>

            <form onSubmit={verifyCode}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    style={{
                      width: '50px', height: '60px', fontSize: '24px', textAlign: 'center',
                      background: '#0F172A', border: `2px solid ${error ? '#EF4444' : '#334155'}`,
                      color: '#F8FAFC', borderRadius: '12px', fontWeight: 'bold', outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = error ? '#EF4444' : '#3B82F6'}
                    onBlur={(e) => e.target.style.borderColor = error ? '#EF4444' : '#334155'}
                  />
                ))}
              </div>
              
              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  style={{ color: '#EF4444', fontSize: '0.9rem', margin: '0 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <AlertCircle size={16} /> {error}
                </motion.p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#F59E0B', fontSize: '0.9rem', marginBottom: '32px', padding: '12px', background: 'rgba(245,158,11,0.1)', borderRadius: '8px' }}>
                <AlertCircle size={18} />
                <span>You have <strong>3 Hours</strong> to complete this exam once started.</span>
              </div>

              <button 
                type="submit" 
                disabled={isVerifying}
                style={{ 
                  width: '100%', padding: '16px', borderRadius: '12px', background: '#3B82F6', 
                  color: 'white', fontWeight: 'bold', fontSize: '1.1rem', border: 'none', cursor: 'pointer',
                  opacity: isVerifying ? 0.7 : 1
                }}
              >
                {isVerifying ? "Verifying..." : "Unlock Exam"}
              </button>
            </form>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

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
      </div>

      {/* Main Content Area */}
      <div className={`exam-main-content${isSidebarPinned ? ' sidebar-pinned' : ''}`}>
        
        {/* Fixed Start Coding Button - Only visible in question view */}
        {activeView === 'question' && (
          <button className="start-coding-btn-fixed" onClick={() => setActiveView("coding")}>
            Start Coding <ChevronRight size={16} />
          </button>
        )}

        {/* Question View */}
        <div 
          className="view-container question-view" 
          style={{ display: activeView === "question" ? "block" : "none" }}
        >
            <div className="question-header">
              <div>
                <h1>AI309E_ICV_MSE2</h1>
                <p style={{ color: "var(--text-muted)", marginTop: "8px" }}>Second Mid-Semester Examination, Introduction to Computer Vision, Department of CSE (AI & AIML), KIET Group of Institutions</p>
              </div>
            </div>
            <div className="question-body">
              
              <div className="question-section">
                <h2>Overview</h2>
                <p>The <strong>Department of Computer Science and Engineering (AI & AIML) at KIET Group of Institutions</strong> proudly presents the Mid-Semester Computer Vision Competition — a practical, performance-driven challenge hosted on Kaggle.</p>
                <p>This competition serves as part of the Mid-Semester Evaluation and is designed to assess your technical skills and conceptual understanding in the field of Computer Vision.</p>
                <p>In this competition, you are provided with an image dataset containing two categories: cats and dogs. The training dataset consists of labeled images organized into respective class folders, while the test dataset contains a shuffled mix of unlabeled images. Your task is to develop a Convolutional Neural Network (CNN)-based model that accurately classifies each image as either a cat or a dog. Participants are encouraged to design, train, and optimize CNN architectures to achieve the best possible performance.</p>
                <p>All the necessary details regarding this Examination are given below.</p>
              </div>

              <div className="question-section">
                <h2>Objectives</h2>
                <p>Your task is to build a Convolutional Neural Network (CNN) model capable of accurately classifying images as either cats or dogs using the given dataset.</p>
                <p>You are required to write code for:</p>
                <ul>
                  <li>Data Loading and Image Preprocessing.</li>
                  <li>Data Visualization and Exploratory Analysis.</li>
                  <li>Image Resizing and Normalization.</li>
                  <li>Data Augmentation (to improve generalization).</li>
                  <li>Splitting Training and Validation sets.</li>
                  <li>Model Building using CNN Architecture.</li>
                  <li>Model Training.</li>
                  <li>Evaluation of Model Performance (Accuracy/Loss).</li>
                  <li>Hyper-parameter Tuning (e.g., layers, filters, learning rate, batch size).</li>
                  <li>Generating Predictions for Test Dataset.</li>
                </ul>
              </div>

              <div className="question-section">
                <h2>Deliverables</h2>
                <p>You must submit the following:</p>
                <ol style={{ marginLeft: "20px", color: "var(--text-muted)", marginBottom: "15px" }}>
                  <li style={{ marginBottom: "8px" }}><strong>Prediction.csv:</strong> (both through Competition Webpage and Google form): Final CSV containing predictions for the test data.</li>
                  <li style={{ marginBottom: "8px" }}><strong>Notebook(.ipynb):</strong> (through Google Form): Clear and documented code including all the steps mentioned above.</li>
                  <li style={{ marginBottom: "8px" }}><strong>Quiz:</strong> (through Google Form): Completed form with answers reflecting conceptual understanding.</li>
                </ol>
              </div>

              <div className="question-section">
                <h2>Evaluation Metric</h2>
                <p>Submissions will be evaluated using the Accuracy metric.</p>
                <p>A higher Accuracy value indicates better model performance.</p>
              </div>

              <div className="question-section">
                <h2>Submission Format for Prediction CSV</h2>
                <p>Your final submission must be a CSV file structured as follows:</p>
                <div className="code-block">
                  id,class<br/>
                  1.jpg,Cat<br/>
                  2.jpg,Cat<br/>
                  3.jpg,Cat<br/>
                  ...
                </div>
              </div>

              <div className="question-section">
                <h2>Marking Scheme (Total: 40 Marks)</h2>
                <table className="evaluation-table">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Data Preprocessing and Augmentation</td>
                      <td>10</td>
                    </tr>
                    <tr>
                      <td>Model Selection/Algorithm</td>
                      <td>10</td>
                    </tr>
                    <tr>
                      <td>Results and Evaluation</td>
                      <td>10</td>
                    </tr>
                    <tr>
                      <td>Google Form Submission</td>
                      <td>10</td>
                    </tr>
                  </tbody>
                </table>
                <p style={{ marginTop: "15px", fontSize: "0.9rem" }}><strong>Note:</strong> Google Form Submission is mandatory for evaluation. Failure to do this will result in Zero marks.</p>
              </div>

            </div>
          </div>

        {/* Coding View */}
        <div 
          className="view-container coding-view" 
          style={{ display: activeView === "coding" ? "flex" : "none" }}
        >
          <iframe 
            src="https://piyushmtech2252.github.io/ML_ARENA/lab/index.html" 
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
          <div className="result-card">
            <h2>Submit Your Work</h2>
            <p>Upload your generated <code>submission.csv</code> file for evaluation.</p>
            <div className="upload-area">
              <UploadCloud size={48} className="upload-icon" />
              <p>Drag and drop your CSV file here, or click to browse.</p>
              <input type="file" accept=".csv" className="file-input" />
            </div>
            <button className="submit-exam-btn">Submit Final Exam</button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExamEnvironment;
