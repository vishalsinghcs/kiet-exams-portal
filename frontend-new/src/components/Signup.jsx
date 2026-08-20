import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signupUser, verifyOtp } from '../utils/api';
import InteractiveCharacters from './ui/InteractiveCharacters';
import SignupForm from './ui/SignupForm';

 
const Signup = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

 
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Form states
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [branch, setBranch] = useState("");
  const [section, setSection] = useState("");
  const [enrollmentYear, setEnrollmentYear] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Animation Interaction states
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [focusedField, setFocusedField] = useState(null);
  const [authFailed, setAuthFailed] = useState(false);

  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    let interval;
    if (step === 2 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (step === 2 && resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const handleSignupDetails = async (e) => {
    e?.preventDefault();
    if (!name || !email || !password || !branch || !section || !enrollmentYear || !registrationNumber) {
      setError("All fields are required");
      setAuthFailed(true);
      setTimeout(() => setAuthFailed(false), 2000);
      return;
    }
    if (!email.endsWith("@kiet.edu")) {
      setError("Only @kiet.edu email addresses are allowed");
      setAuthFailed(true);
      setTimeout(() => setAuthFailed(false), 2000);
      return;
    }
    if (registrationNumber.length !== 15 || !/^\d+$/.test(registrationNumber)) {
      setError("Registration number must be exactly 15 digits");
      setAuthFailed(true);
      setTimeout(() => setAuthFailed(false), 2000);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      setAuthFailed(true);
      setTimeout(() => setAuthFailed(false), 2000);
      return;
    }
    setError("");
    if (step === 2) {
      setIsResending(true);
    } else {
      setLoading(true);
    }
    setAuthFailed(false);
    try {
      await signupUser(name, email, password, branch, section, parseInt(enrollmentYear), registrationNumber);
      setStep(2);
      setResendTimer(60);
      setCanResend(false);
    } catch (err) {
      setError(err.message || "Signup failed. Please try again.");
      setAuthFailed(true);
      setTimeout(() => setAuthFailed(false), 2000);
    } finally {
      setLoading(false);
      setIsResending(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError("Please enter the OTP");
      setAuthFailed(true);
      setTimeout(() => setAuthFailed(false), 2000);
      return;
    }
    setError("");
    setLoading(true);
    setAuthFailed(false);
    try {
      const tokenData = await verifyOtp(name, email, password, branch, section, parseInt(enrollmentYear), registrationNumber, otp);
      login(tokenData.access_token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid OTP. Please try again.");
      setAuthFailed(true);
      setTimeout(() => setAuthFailed(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>

      <div className="split-login-container" onMouseMove={handleMouseMove}>
        {/* Left Side: Interactive Characters */}
        <div className="split-left">
          <InteractiveCharacters 
            mousePos={mousePos}
            isPasswordVisible={showPassword}
            focusedField={focusedField}
            loginFailed={authFailed}
          />
        </div>

        {/* Right Side: Form */}
        <div className="split-right" style={{ flexDirection: 'column', overflowY: 'auto', padding: '20px' }}>
          <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <img src="/codeml_logo_trans.png" alt="Logo" className="auth-logo" style={{ width: '32px', height: '32px' }} />
          </div>

          <SignupForm 
            step={step}
            name={name} setName={setName}
            email={email} setEmail={setEmail}
            branch={branch} setBranch={setBranch}
            section={section} setSection={setSection}
            enrollmentYear={enrollmentYear} setEnrollmentYear={setEnrollmentYear}
            registrationNumber={registrationNumber} setRegistrationNumber={setRegistrationNumber}
            password={password} setPassword={setPassword}
            showPassword={showPassword} setShowPassword={setShowPassword}
            otp={otp} setOtp={setOtp}
            handleSignupDetails={handleSignupDetails}
            handleVerifyOtp={handleVerifyOtp}
            loading={loading}
            isResending={isResending}
            error={error}
            resendTimer={resendTimer}
            canResend={canResend}
            setFocusedField={setFocusedField}
          />
        </div>
      </div>
    </>
  );
};

export default Signup;
