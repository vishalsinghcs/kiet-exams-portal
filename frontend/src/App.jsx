import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AnimatedMeshBackground from './components/ui/AnimatedMeshBackground';
import { APP_NAME } from './utils/constants';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <AnimatedMeshBackground />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route 
            path="/login" 
            element={
              <div className="center-content" style={{ minHeight: '100vh', width: '100%', flexDirection: 'column', gap: '1rem', position: 'relative', zIndex: 1 }}>
                <h1 style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '-0.05em', color: 'var(--accent-color)', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                  {APP_NAME}
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Login UI Pending...</p>
              </div>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
