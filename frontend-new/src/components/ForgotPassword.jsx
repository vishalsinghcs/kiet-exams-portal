import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { API_BASE_URL } from '../utils/api';
import InteractiveCharacters from './ui/InteractiveCharacters';
import AuthInput from './ui/AuthInput';
import OtpInput from './ui/OtpInput';

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [focusedField, setFocusedField] = useState(null);
  const [authFailed, setAuthFailed] = useState(false);

  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Email is required");
      setAuthFailed(true);
      setTimeout(() => setAuthFailed(false), 2000);
      return;
    }

    setError("");
    setLoading(true);
    setAuthFailed(false);

    try {
      const res = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Failed to send OTP");
      }

      setStep(2);
      setSuccessMsg("An OTP has been sent to your email.");
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      setError(err.message || "Failed to send OTP. Please try again.");
      setAuthFailed(true);
      setTimeout(() => setAuthFailed(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword) {
      setError("OTP and New Password are required");
      setAuthFailed(true);
      setTimeout(() => setAuthFailed(false), 2000);
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      setAuthFailed(true);
      setTimeout(() => setAuthFailed(false), 2000);
      return;
    }

    setError("");
    setLoading(true);
    setAuthFailed(false);

    try {
      const res = await fetch(`${API_BASE_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, new_password: newPassword })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Failed to reset password");
      }

      setSuccessMsg("Password reset successfully! Redirecting...");
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setError(err.message || "Invalid OTP or request failed.");
      setAuthFailed(true);
      setTimeout(() => setAuthFailed(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-login-container" onMouseMove={handleMouseMove}>
      <div className="split-left">
        <InteractiveCharacters 
          mousePos={mousePos}
          isPasswordVisible={showPassword}
          focusedField={focusedField}
          loginFailed={authFailed}
        />
      </div>

      <div className="split-right" style={{ flexDirection: 'column' }}>
        <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '8px' }}>
           <img src="/codeml_logo_trans.png" alt="Logo" className="auth-logo" style={{ width: '32px', height: '32px' }} />
        </div>

        <div className="auth-form-container">
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Reset Password
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              {step === 1 ? "Enter your email to receive an OTP." : "Enter the OTP and your new password."}
            </p>
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

          {successMsg && (
            <div style={{ 
              background: 'var(--success-light)', 
              border: '1px solid var(--success)', 
              color: 'var(--success)', 
              padding: '12px 16px', 
              borderRadius: '12px', 
              marginBottom: '32px',
              textAlign: 'center'
            }}>
              {successMsg}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp}>
              <AuthInput
                type="email"
                label="Registered Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                hasError={!!error}
                required
              />

              <button 
                type="submit" 
                disabled={loading}
                className="auth-primary-btn"
                style={{ marginTop: '16px' }}
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '0.9rem' }}>
                <a href="/login" className="auth-secondary-link">Back to Login</a>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>
                  Enter 6-Digit OTP
                </label>
                <OtpInput
                  length={6}
                  value={otp}
                  onChange={(val) => setOtp(val)}
                  onFocus={() => setFocusedField('otp')}
                  onBlur={() => setFocusedField(null)}
                  hasError={!!error}
                />
              </div>

              <AuthInput
                type={showPassword ? "text" : "password"}
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                hasError={!!error}
                required
                minLength={8}
                endIcon={showPassword ? EyeOff : Eye}
                onEndIconClick={() => setShowPassword(!showPassword)}
              />

              <button 
                type="submit" 
                disabled={loading}
                className="auth-primary-btn"
                style={{ marginTop: '16px' }}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              
              <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '0.9rem' }}>
                <a href="/login" className="auth-secondary-link">Back to Login</a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
