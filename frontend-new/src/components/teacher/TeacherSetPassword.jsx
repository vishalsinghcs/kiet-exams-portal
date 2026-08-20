import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { API_BASE_URL } from '../../utils/api';
import InteractiveCharacters from '../ui/InteractiveCharacters';
import AuthInput from '../ui/AuthInput';

const TeacherSetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get("token");

  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [focusedField, setFocusedField] = useState(null);
  const [loginFailed, setLoginFailed] = useState(false);

  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing invitation token.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      setLoginFailed(true);
      setTimeout(() => setLoginFailed(false), 2000);
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoginFailed(true);
      setTimeout(() => setLoginFailed(false), 2000);
      return;
    }

    setError("");
    setLoading(true);
    setLoginFailed(false);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/set-teacher-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token, new_password: password })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || "Failed to set password");
      }
      
      setSuccess(true);
      setTimeout(() => {
        navigate("/teacher/login");
      }, 3000);
      
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoginFailed(true);
      setTimeout(() => setLoginFailed(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-login-container" onMouseMove={handleMouseMove}>
      <div className="split-left">
        <InteractiveCharacters 
          mousePos={mousePos}
          isPasswordVisible={showPassword || showConfirmPassword}
          focusedField={focusedField}
          loginFailed={loginFailed}
        />
      </div>

      <div className="split-right" style={{ flexDirection: 'column' }}>
        <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '8px' }}>
           <img src="/codeml_logo_trans.png" alt="Logo" className="auth-logo" style={{ width: '32px', height: '32px' }} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span style={{ 
            background: 'var(--success-light)', 
            color: 'var(--success)', 
            padding: '4px 12px', 
            borderRadius: '20px', 
            fontSize: '0.85rem', 
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Faculty Invitation
          </span>
        </div>

        <div className="auth-form-container">
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Activate Account
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>Set your password to log in.</p>
          </div>

          {error && (
            <div style={{ 
              background: 'var(--danger-light)', 
              border: '1px solid var(--border-medium)', 
              color: 'var(--danger)', 
              padding: '12px 16px', 
              borderRadius: '12px', 
              marginBottom: '32px' 
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ 
              background: 'var(--success-light)', 
              border: '1px solid var(--success)', 
              color: 'var(--success)', 
              padding: '12px 16px', 
              borderRadius: '12px', 
              marginBottom: '32px',
              textAlign: 'center'
            }}>
              Password set successfully! Redirecting to login...
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit}>
              <AuthInput
                type={showPassword ? "text" : "password"}
                label="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                hasError={!!error}
                required
                minLength={8}
                endIcon={showPassword ? EyeOff : Eye}
                onEndIconClick={() => setShowPassword(!showPassword)}
                disabled={!token}
              />

              <AuthInput
                type={showConfirmPassword ? "text" : "password"}
                label="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                hasError={!!error}
                required
                endIcon={showConfirmPassword ? EyeOff : Eye}
                onEndIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={!token}
              />

              <button 
                type="submit" 
                disabled={loading || !token}
                className="auth-primary-btn"
                style={{ marginTop: '16px' }}
              >
                {loading ? 'Activating...' : 'Set Password & Activate'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherSetPassword;
