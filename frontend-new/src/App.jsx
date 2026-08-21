import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Signup from './components/Signup';
import TeacherLogin from './components/teacher/TeacherLogin';
import TeacherSetPassword from './components/teacher/TeacherSetPassword';
import ForgotPassword from './components/ForgotPassword';
import Dashboard from './components/Dashboard';
import ExamEnvironment from './components/ExamEnvironment';
import StudentRouteGuard from './components/guards/StudentRouteGuard';
import ExamGuard from './components/guards/ExamGuard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Teacher Portal Routes */}
        <Route path="/teacher" element={<Navigate to="/teacher/login" replace />} />
        <Route path="/teacher/login" element={<TeacherLogin />} />
        <Route path="/teacher/set-password" element={<TeacherSetPassword />} />
        <Route path="/teacher/dashboard" element={<div style={{color:'black', padding:'50px'}}>Teacher Dashboard Placeholder</div>} />

        {/* Secure Student Routes */}
        <Route element={<StudentRouteGuard />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route element={<ExamGuard />}>
            <Route path="/exam/:examId" element={<ExamEnvironment />} />
          </Route>
        </Route>

        <Route path="/admin" element={<div style={{color:'black', padding:'50px'}}>Admin Placeholder</div>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
