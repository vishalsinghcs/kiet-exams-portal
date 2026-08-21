import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, PlayCircle, Lock, LayoutDashboard, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../utils/api';
import OtpInput from './ui/OtpInput';

const Dashboard = () => {
  const navigate = useNavigate();
  const { logout, token, user: authUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [user, setUser] = useState(authUser);
  const [exams, setExams] = useState([]);
  const [activeTab, setActiveTab] = useState('ongoing');
  const [profileDropdown, setProfileDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Passkey modal state
  const [passkeyModal, setPasskeyModal] = useState({ open: false, examId: null, examCode: '' });
  const [otp, setOtp] = useState('');
  const [passkeyError, setPasskeyError] = useState('');
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  
  const [logoutError, setLogoutError] = useState('');
  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          logout();
          navigate('/login');
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      }
    };

    const fetchExams = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users/me/exams`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const mapped = data.map(ex => ({
              id: ex.id,
              code: ex.subject_code || ex.code,
              subject: ex.subject,
              examName: ex.exam_name,
              duration: ex.duration,
              startTime: ex.start_time,
              status: ex.status === 'submitted' ? 'completed' : ex.status,
            }));
            setExams(mapped);
          }
        }
      } catch (err) {
        console.error('Failed to fetch exams', err);
      }
    };

    if (token) {
      fetchProfile();
      fetchExams();
    }
  }, [token, logout, navigate]);

  const handleStartExam = (exam) => {
    setOtp('');
    setPasskeyError('');
    setPasskeyModal({ open: true, examId: exam.id, examCode: exam.code });
  };
  
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const submitPasskey = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (otp.length !== 6) return;
    
    setPasskeyLoading(true);
    setPasskeyError('');
    
    try {
      const res = await fetch(`${API_BASE_URL}/users/me/exams/${passkeyModal.examId}/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code: otp })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        // We now rely purely on the backend database (ExamEnrollment) to verify access, so no token is needed in sessionStorage.
        // Ensure a fresh IDE environment by clearing the browser's IndexedDB
        const req = indexedDB.deleteDatabase('PyExDB');
        
        req.onsuccess = () => {
          setPasskeyModal({ open: false, examId: null, examCode: '' });
          navigate(`/exam/${passkeyModal.examId}`);
        };
        req.onerror = () => {
          // Fallback if deletion fails for some reason
          setPasskeyModal({ open: false, examId: null, examCode: '' });
          navigate(`/exam/${passkeyModal.examId}`);
        };
      } else {
        setPasskeyError(data.detail || 'Invalid passkey. Please try again.');
        setOtp('');
      }
    } catch (err) {
      setPasskeyError('Connection error. Please try again.');
    } finally {
      setPasskeyLoading(false);
    }
  }, [otp, passkeyModal.examId, token, navigate]);

  // Auto-submit when passkey reaches 6 digits
  useEffect(() => {
    if (otp.length === 6 && !passkeyLoading && passkeyModal.open) {
      submitPasskey();
    }
  }, [otp, passkeyLoading, passkeyModal.open, submitPasskey]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const getExamCategory = (exam) => {
    if (exam.status === 'completed') return 'completed';
    const utcString = exam.startTime.endsWith('Z') ? exam.startTime : `${exam.startTime}Z`;
    const examStart = new Date(utcString);
    const deadline = new Date(examStart.getTime() + exam.duration * 60000);
    const now = new Date();

    if (now > deadline) return 'completed';
    if (now >= examStart && now <= deadline) return 'ongoing';
    // If exam starts in 30 mins or less, show in ongoing
    if (examStart.getTime() - now.getTime() <= 30 * 60000 && examStart.getTime() > now.getTime()) return 'ongoing';
    return 'upcoming';
  };

  const filteredExams = exams.filter(ex => getExamCategory(ex) === activeTab);

  const formatISTTime = (isoString) => {
    const utcString = isoString.endsWith('Z') ? isoString : `${isoString}Z`;
    return new Date(utcString).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Topbar */}
      <header style={{ 
        height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
        padding: '0 32px', borderBottom: '1px solid var(--border-light)', 
        backgroundColor: 'var(--bg-surface-glass)', backdropFilter: 'blur(24px)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/codeml_logo_trans.png" alt="CodeML" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-0.5px' }}>CodeML</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            style={{
              background: 'var(--bg-base)', border: '1px solid var(--border-light)',
              borderRadius: '50%', width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{user.name}</span>
              </div>
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <button 
                  onClick={() => setProfileDropdown(!profileDropdown)} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'transform 0.2s cubic-bezier(0.2, 1, 0.4, 1)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0) scale(1)'}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)'}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {user.name.charAt(0)}
                  </div>
                </button>
                {profileDropdown && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 12px)', right: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', padding: '8px', minWidth: '220px', zIndex: 50 }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-light)', marginBottom: '4px' }}>
                      <p style={{ fontWeight: 600, fontSize: '14px', margin: 0 }}>{user.name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>{user.email}</p>
                    </div>
                    <button onClick={() => { setProfileDropdown(false); navigate('/forgot-password'); }} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', borderRadius: '6px', color: 'var(--text-primary)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-base)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      Reset Password
                    </button>
                    <button onClick={async () => {
                      try {
                        await logout();
                        navigate('/');
                      } catch (err) {
                        setLogoutError(err.message);
                      }
                    }} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', borderRadius: '6px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--danger-light)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <LogOut size={16} /> Log Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '40px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px' }}>My Exams</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Manage and participate in your enrolled examinations.</p>

        {/* Segmented Controls */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-surface)', padding: '6px', borderRadius: '14px', width: 'fit-content', border: '1px solid var(--border-light)', marginBottom: '32px' }}>
          {['ongoing', 'upcoming', 'completed'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: activeTab === tab ? '600' : '500',
                background: activeTab === tab ? 'var(--bg-base)' : 'transparent',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.04)' : 'none'
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Exams Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {filteredExams.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-medium)', gridColumn: '1 / -1' }}>
              No {activeTab} exams found.
            </div>
          ) : (
            filteredExams.map(exam => (
              <div key={exam.id} style={{
                background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', padding: '24px',
                border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '16px',
                boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s', cursor: 'default'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-light)', padding: '4px 10px', borderRadius: '6px' }}>
                      {exam.code}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{exam.duration} mins</span>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{exam.examName}</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{exam.subject}</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', background: 'var(--bg-base)', padding: '10px 14px', borderRadius: '8px' }}>
                  <Clock size={16} /> {formatISTTime(exam.startTime)}
                </div>

                {activeTab === 'ongoing' && (() => {
                  const utcString = exam.startTime.endsWith('Z') ? exam.startTime : `${exam.startTime}Z`;
                  const examStart = new Date(utcString);
                  const isStarted = currentTime >= examStart;
                  
                  if (!isStarted) {
                    const diffMs = examStart - currentTime;
                    const m = Math.floor((diffMs / 60000) % 60);
                    const s = Math.floor((diffMs / 1000) % 60);
                    return (
                      <button onClick={() => handleStartExam(exam)} style={{
                        marginTop: 'auto', background: 'var(--text-primary)', color: 'var(--bg-base)', border: 'none', padding: '12px', borderRadius: '10px',
                        fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      >
                        <Lock size={16} /> Enter Passkey (Starts in {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')})
                      </button>
                    );
                  }
                  
                  return (
                    <button onClick={() => handleStartExam(exam)} style={{
                      marginTop: 'auto', background: 'var(--text-primary)', color: 'var(--bg-base)', border: 'none', padding: '12px', borderRadius: '10px',
                      fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <PlayCircle size={18} /> Start Exam
                    </button>
                  );
                })()}
                {activeTab === 'upcoming' && (
                  <button disabled style={{
                    marginTop: 'auto', background: 'var(--bg-base)', color: 'var(--text-tertiary)', border: '1px solid var(--border-medium)', padding: '12px', borderRadius: '10px',
                    fontWeight: 600, fontSize: '14px', cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}>
                    Starts Later
                  </button>
                )}
                {activeTab === 'completed' && (
                  <button disabled style={{
                    marginTop: 'auto', background: 'var(--success-light)', color: 'var(--success)', border: 'none', padding: '12px', borderRadius: '10px',
                    fontWeight: 600, fontSize: '14px', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}>
                    Completed
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Passkey Modal */}
      {passkeyModal.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', padding: '20px'
        }} onClick={() => setPasskeyModal({ open: false, examId: null, examCode: '' })}>
          <div style={{
            background: 'var(--bg-surface)', padding: '40px', borderRadius: 'var(--radius-lg)', maxWidth: '400px', width: '100%',
            boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', alignItems: 'center'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <Lock size={24} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', textAlign: 'center' }}>Enter Passkey</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', marginBottom: '32px' }}>
              Enter the 6-digit security passkey for <strong>{passkeyModal.examCode}</strong> provided by your invigilator.
            </p>
            
            <form onSubmit={submitPasskey} style={{ width: '100%' }}>
              <OtpInput
                length={6}
                value={otp}
                onChange={setOtp}
                hasError={!!passkeyError}
                isPassword={true}
              />
              {passkeyError && <p style={{ color: 'var(--danger)', fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>{passkeyError}</p>}
              
              <button 
                type="submit" 
                disabled={otp.length !== 6 || passkeyLoading}
                style={{
                  width: '100%', padding: '14px', borderRadius: '10px', background: 'var(--text-primary)', color: 'var(--bg-base)', border: 'none',
                  fontWeight: 600, fontSize: '15px', marginTop: '32px', cursor: (otp.length !== 6 || passkeyLoading) ? 'not-allowed' : 'pointer',
                  opacity: (otp.length !== 6 || passkeyLoading) ? 0.7 : 1, transition: 'all 0.2s'
                }}
              >
                {passkeyLoading ? 'Verifying...' : 'Unlock Exam'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Logout Error Modal */}
      {logoutError && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg-surface)', padding: '32px', borderRadius: '16px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-medium)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--danger-light)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Lock size={32} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>Action Blocked</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
              {logoutError}
            </p>
            <button 
              onClick={() => setLogoutError('')}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'var(--danger)', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              Okay, I understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
