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
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '8px' }}>
          Welcome back!
        </h2>
        <p style={{ color: '#86868b' }}>Please enter your details</p>
      </div>

      {error && (
        <div style={{ 
          background: 'var(--danger-light)', 
          border: '1px solid var(--border-medium)', 
          color: 'var(--danger)', 
          padding: '12px 16px', 
          borderRadius: '12px', 
          marginBottom: '24px' 
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '8px', color: '#1d1d1f' }}>
            Email
          </label>
          <AuthInput
            type="email"
            placeholder="student@kiet.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            required
            style={{ 
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid #d2d2d7',
              borderRadius: 0,
              padding: '12px 0',
              color: '#1d1d1f'
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '8px', color: '#1d1d1f' }}>
            Password
          </label>
          <AuthInput
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            required
            endIcon={showPassword ? EyeOff : Eye}
            onEndIconClick={() => setShowPassword(!showPassword)}
            style={{ 
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid #d2d2d7',
              borderRadius: 0,
              padding: '12px 0',
              color: '#1d1d1f'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', fontSize: '0.85rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#86868b' }}>
            <input type="checkbox" style={{ accentColor: '#1d1d1f' }} />
            Remember for 30 days
          </label>
          <a href="/forgot-password" style={{ color: '#86868b', textDecoration: 'none' }}>
            Forgot password?
          </a>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            width: '100%', 
            padding: '14px', 
            borderRadius: '24px', 
            backgroundColor: '#1E1E1E', 
            color: 'white', 
            border: 'none', 
            fontWeight: 600, 
            fontSize: '1rem', 
            cursor: 'pointer',
            marginBottom: '16px'
          }}
        >
          {loading ? 'Logging In...' : 'Log In'}
        </button>
      </form>
      
      <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '0.85rem', color: '#86868b' }}>
        Don't have an account? <a href="/signup" style={{ color: '#1E1E1E', fontWeight: 600, textDecoration: 'none' }}>Sign Up</a>
      </div>
    </div>
  );
};

export default LoginForm;
