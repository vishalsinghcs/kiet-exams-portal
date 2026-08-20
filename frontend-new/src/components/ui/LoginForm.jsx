import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import AuthInput from './AuthInput';

const LoginForm = ({ 
  email, 
  setEmail, 
  password, 
  setPassword, 
  showPassword, 
  setShowPassword, 
  handleLogin, 
  loading, 
  error,
  setFocusedField 
}) => {
  return (
    <div className="auth-form-container">
      <div style={{ textAlign: 'center', marginBottom: '64px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Welcome back!
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>Please enter your details</p>
      </div>

      {error && (
        <div style={{ 
          background: 'var(--danger-light)', 
          border: '1px solid var(--border-medium)', 
          color: 'var(--danger)', 
          padding: '12px 16px', 
          borderRadius: '12px', 
          marginBottom: '44px' 
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin}>
        <AuthInput
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
          hasError={!!error}
          required
        />

        <AuthInput
          type={showPassword ? "text" : "password"}
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
          hasError={!!error}
          required
          endIcon={showPassword ? EyeOff : Eye}
          onEndIconClick={() => setShowPassword(!showPassword)}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '32px', fontSize: '0.85rem' }}>
          <a href="/forgot-password" className="auth-secondary-link">
            Forgot password?
          </a>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="auth-primary-btn"
        >
          {loading ? 'Logging In...' : 'Log In'}
        </button>
      </form>
      
      <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Don't have an account? <a href="/signup" className="auth-primary-link">Sign Up</a>
      </div>
    </div>
  );
};

export default LoginForm;
