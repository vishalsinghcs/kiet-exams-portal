import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Menu, FileText, Code, UploadCloud, ChevronRight } from "lucide-react";
import "./ExamEnvironment.css";

const ExamEnvironment = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  // Sidebar state
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  
  // View state: 'question' | 'coding' | 'result'
  const [activeView, setActiveView] = useState("question");

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
