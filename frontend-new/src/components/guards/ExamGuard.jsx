import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { API_BASE_URL } from '../../utils/api';

const ExamGuard = () => {
  const { examId } = useParams();
  const [status, setStatus] = useState('loading');
  
  useEffect(() => {
    const checkEnrollment = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setStatus('unauthorized');
        return;
      }
      
      try {
        const res = await fetch(`${API_BASE_URL}/users/me/exams/${examId}/verify-enrollment`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.ok) {
          setStatus('authorized');
        } else {
          setStatus('unauthorized');
        }
      } catch (err) {
        setStatus('error');
      }
    };
    
    checkEnrollment();
  }, [examId]);

  if (status === 'loading') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Verifying exam access...</p>
      </div>
    );
  }

  if (status === 'unauthorized' || status === 'error') {
    // If they bypass passkey or fetch fails, boot them back to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // Enrollment exists and is in_progress, proceed to the Exam Environment.
  return <Outlet />;
};

export default ExamGuard;
