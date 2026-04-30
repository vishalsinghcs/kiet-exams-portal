import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route 
            path="/login" 
            element={
              <div className="center-content" style={{ minHeight: '100vh', width: '100%' }}>
                <h1>Login UI Pending...</h1>
              </div>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
