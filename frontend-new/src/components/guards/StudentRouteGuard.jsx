import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const StudentRouteGuard = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    const payloadStr = atob(token.split('.')[1]);
    const payload = JSON.parse(payloadStr);
    
    if (payload.role !== 'student') {
      return <Navigate to="/login" replace />;
    }
  } catch (err) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default StudentRouteGuard;
