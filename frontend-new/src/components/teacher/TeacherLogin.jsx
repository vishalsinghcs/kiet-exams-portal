import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loginUser, API_BASE_URL } from '../../utils/api';
import InteractiveCharacters from '../ui/InteractiveCharacters';
import LoginForm from '../ui/LoginForm';

const TeacherLogin = () => {
  const { login, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [formLoading, setFormLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [focusedField, setFocusedField] = useState(null);
  const [loginFailed, setLoginFailed] = useState(false);

  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    const checkRoleAndRedirect = async () => {
      if (isAuthenticated) {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.role === "teacher") {
            navigate("/teacher/dashboard", { replace: true });
          } else if (payload.role === "admin") {
            navigate("/admin/dashboard", { replace: true });
          } else if (payload.role === "student") {
            navigate("/dashboard", { replace: true });
          } else {
            logout();
          }
        } catch (e) {
          console.error("Profile check failed:", e);
        }
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
      
      // Decode JWT to check role before officially logging in
      let role = "";
      try {
        const payload = JSON.parse(atob(data.access_token.split('.')[1]));
        role = payload.role;
      } catch (e) {
        console.error("Failed to parse token");
      }

      if (role !== "teacher") {
        // Destroy the session on the backend
        await fetch(`${API_BASE_URL}/logout`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${data.access_token}` }
        });
        setError("Invalid email or password");
        setLoginFailed(true);
        setTimeout(() => setLoginFailed(false), 2000);
        return;
      }
      
      login(data.access_token);
      navigate("/teacher/dashboard");
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
      <div className="split-login-container" onMouseMove={handleMouseMove}>
        <div className="split-left">
          <InteractiveCharacters 
            mousePos={mousePos}
            isPasswordVisible={showPassword}
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
              background: 'var(--accent-light)', 
              color: 'var(--accent)', 
              padding: '4px 12px', 
              borderRadius: '20px', 
              fontSize: '0.85rem', 
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Faculty Portal
            </span>
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
            hideSignup={true}
          />
        </div>
      </div>
    </>
  );
};

export default TeacherLogin;
