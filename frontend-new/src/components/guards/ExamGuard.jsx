import React from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';

const ExamGuard = () => {
  const { examId } = useParams();
  
  // Check if we have a cryptographic exam token for this specific exam
  const examToken = sessionStorage.getItem(`exam_token_${examId}`);

  if (!examToken) {
    // If no token exists, they either skipped the passkey or refreshed in a new tab without context
    return <Navigate to="/dashboard" replace />;
  }

  // Token exists, proceed to the Exam Environment.
  // The backend will enforce actual verification on any API calls made inside.
  return <Outlet />;
};

export default ExamGuard;
