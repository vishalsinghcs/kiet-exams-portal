import { createContext, useContext, useState, useEffect } from "react";
import { API_BASE_URL } from "../utils/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("token"));

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setIsAuthenticated(false);
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  // Called after a successful API login/signup — stores the real JWT
  const login = (access_token, userData = null) => {
    setToken(access_token);
    if (userData) setUser(userData);
  };

  const logout = async (skipApi = false) => {
    let apiError = null;
    if (token && !skipApi) {
      try {
        const res = await fetch(`${API_BASE_URL}/logout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          apiError = new Error(data.detail || "Cannot logout at this moment.");
        }
      } catch (err) {
        apiError = err;
      }
    }
    
    // Always clear local state regardless of API success
    setToken(null);
    setUser(null);
    
    if (apiError) {
      throw apiError;
    }
    return true;
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, user, setUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
