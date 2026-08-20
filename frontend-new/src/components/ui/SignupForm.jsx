import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthInput from './AuthInput';
import AuthSelect from './AuthSelect';
import OtpInput from './OtpInput';

const branches = ["CSE AI", "CSE AIML", "Minor Degree"];

const branchSections = {
  "CSE AI": ["A", "B", "C", "D"],
  "CSE AIML": ["A", "B", "C", "D", "E"],
  "Minor Degree": ["A"]
};

const SignupForm = ({
  step,
  name, setName,
  email, setEmail,
  branch, setBranch,
  section, setSection,
  enrollmentYear, setEnrollmentYear,
  registrationNumber, setRegistrationNumber,
  password, setPassword,
  showPassword, setShowPassword,
  otp, setOtp,
  handleSignupDetails,
  handleVerifyOtp,
  loading,
  isResending,
  error,
  resendTimer,
  canResend,
  setFocusedField
}) => {
  const getAvailableSections = () => {
    return branchSections[branch] || [];
  };

  if (step === 2) {
    return (
      <div className="auth-form-container">
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Verify Email
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>We've sent a 6-digit OTP to your email.</p>
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

        <form onSubmit={handleVerifyOtp}>
          <OtpInput
            length={6}
            value={otp}
            onChange={(val) => setOtp(val)}
            onFocus={() => setFocusedField('otp')}
            onBlur={() => setFocusedField(null)}
            hasError={!!error}
          />

          <button type="submit" disabled={loading || isResending} className="auth-primary-btn" style={{ marginTop: '16px' }}>
            {loading ? "Verifying..." : "Verify & Create Account"}
          </button>
          
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button 
              type="button" 
              disabled={!canResend || loading || isResending}
              onClick={handleSignupDetails}
              className="auth-secondary-link"
              style={{ background: 'none', border: 'none', cursor: (!canResend || loading || isResending) ? 'not-allowed' : 'pointer', fontSize: '0.9rem' }}
            >
              {isResending ? "Resending..." : canResend ? "Resend OTP" : `Resend OTP in ${resendTimer}s`}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Step 1: Details
  return (
    <div className="auth-form-container">
      <div style={{ textAlign: 'center', marginBottom: '64px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Create Account
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>Enter your details to get started</p>
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

      <form onSubmit={handleSignupDetails}>
        <AuthInput
          type="text"
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => setFocusedField('name')}
          onBlur={() => setFocusedField(null)}
          required
        />

        <AuthInput
          type="email"
          label="KIET Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
          required
        />

        <div className="form-row-split">
          <AuthInput
            type="text"
            label="Registration Number"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value.replace(/\D/g, '').slice(0, 15))}
            onFocus={() => setFocusedField('registrationNumber')}
            onBlur={() => setFocusedField(null)}
            maxLength="15"
            required
          />

          <AuthSelect
            label="Year of Admission"
            value={enrollmentYear}
            onChange={(e) => setEnrollmentYear(e.target.value)}
            onFocus={() => setFocusedField('enrollmentYear')}
            onBlur={() => setFocusedField(null)}
            required
          >
            <option value="" disabled hidden></option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </AuthSelect>
        </div>

        <div className="form-row-split">
          <AuthSelect
            label="Branch"
            value={branch}
            onChange={(e) => {
              const newBranch = e.target.value;
              setBranch(newBranch);
              if (newBranch === "Minor Degree") {
                setSection("A");
              } else {
                setSection(""); 
              }
            }}
            onFocus={() => setFocusedField('branch')}
            onBlur={() => setFocusedField(null)}
            required
          >
            <option value="" disabled hidden></option>
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </AuthSelect>

          <AuthSelect
            label="Section"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            onFocus={() => setFocusedField('section')}
            onBlur={() => setFocusedField(null)}
            required
            disabled={!branch || branch === "Minor Degree"}
          >
            <option value="" disabled hidden></option>
            {getAvailableSections().map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </AuthSelect>
        </div>

        <AuthInput
          type={showPassword ? "text" : "password"}
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
          required
          minLength="8"
          endIcon={showPassword ? EyeOff : Eye}
          onEndIconClick={() => setShowPassword(!showPassword)}
          hasError={!!error}
        />

        <button type="submit" disabled={loading} className="auth-primary-btn" style={{ marginTop: '16px' }}>
          {loading ? "Sending OTP..." : "Sign Up"}
        </button>

        <p className="switch-auth-split" style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Already have an account? <Link to="/login" className="auth-primary-link">Login here</Link>
        </p>
      </form>
    </div>
  );
};

export default SignupForm;
