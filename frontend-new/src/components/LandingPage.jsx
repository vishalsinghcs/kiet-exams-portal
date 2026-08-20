import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#e6e6e6', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ 
        backgroundColor: '#ffffff', 
        padding: '60px 40px', 
        borderRadius: '24px', 
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)', 
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', color: '#1d1d1f' }}>
          Under Construction
        </h1>
        <p style={{ fontSize: '1.1rem', marginBottom: '32px', color: '#86868b' }}>
          We are currently building the next generation of the CodeML Assessment portal.
          <br /><br />
          Stay tuned.
        </p>
        
        <Link to="/login" style={{ 
          display: 'inline-block', 
          textDecoration: 'none', 
          backgroundColor: '#1E1E1E',
          color: 'white',
          padding: '14px 24px',
          borderRadius: '24px',
          fontWeight: 600
        }}>
          Go to Login
        </Link>
      </div>
    </div>
  );
};

export default LandingPage;
