import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser, API_BASE_URL } from '../utils/api';
import InteractiveCharacters from './ui/InteractiveCharacters';
import LoginForm from './ui/LoginForm';

let hasSeenLoaderThisSession = false;

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Loading states
  const [initialLoading, setInitialLoading] = useState(() => !hasSeenLoaderThisSession);
  const [formLoading, setFormLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // Animation Interaction states
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [focusedField, setFocusedField] = useState(null);
  const [loginFailed, setLoginFailed] = useState(false);

  // Mouse Tracking
  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  // Initial Check & Loader
  useEffect(() => {
    const checkRoleAndRedirect = async () => {
      if (isAuthenticated) {
        const token = localStorage.getItem("token");
        try {
          const profileRes = await fetch(`${API_BASE_URL}/users/me`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            if (profileData.role === "admin" || profileData.role === "teacher") {
              navigate("/admin", { replace: true });
              return;
            }
            navigate("/dashboard", { replace: true });
          } else {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          }
        } catch (e) {
          console.error("Profile check failed:", e);
        }
      }
      
      // Check if we've already shown the loader this session
      if (!hasSeenLoaderThisSession) {
        setTimeout(() => {
          setInitialLoading(false);
          hasSeenLoaderThisSession = true;
        }, 1500); 
      } else {
        setInitialLoading(false);
      }
    };

    checkRoleAndRedirect();
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("All fields are required");
      setLoginFailed(true);
      setTimeout(() => setLoginFailed(false), 2000);
      return;
    }
    setError("");
    setFormLoading(true);
    setLoginFailed(false);
    
    try {
      const data = await loginUser(email, password);
      login(data.access_token);
      
      const profileRes = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { "Authorization": `Bearer ${data.access_token}` }
      });
      
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.role === "admin" || profileData.role === "teacher") {
          navigate("/admin");
          return;
        }
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
      setLoginFailed(true);
      setTimeout(() => setLoginFailed(false), 2000);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <>
      {/* Initial Page Loader */}
      <div id="loader" style={{ opacity: initialLoading ? 1 : 0, visibility: initialLoading ? 'visible' : 'hidden' }}>
        <div className="loader-content">
          <div className="loader-ring-wrapper">
            <div className="loader-ring"></div>
            <div className="loader-ring-spin"></div>
          </div>
          <div className="loader-text">Loading</div>
        </div>
      </div>

      <div className="split-login-container" onMouseMove={handleMouseMove}>
        
        {/* Left Side: Animated Characters */}
        <div className="split-left">
           {!initialLoading && (
             <InteractiveCharacters 
               mousePos={mousePos}
               isPasswordVisible={showPassword}
               focusedField={focusedField}
               loginFailed={loginFailed}
             />
           )}
        </div>

        {/* Right Side: Form */}
        <div className="split-right" style={{ flexDirection: 'column' }}>
          <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '8px' }}>
             <img src="/codeml_logo_trans.png" alt="Logo" className="auth-logo" style={{ width: '32px', height: '32px' }} />
          </div>

          <LoginForm 
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            handleLogin={handleLogin}
            loading={formLoading}
            error={error}
            setFocusedField={setFocusedField}
          />
        </div>
      </div>
    </>
  );
};

export default Login;
