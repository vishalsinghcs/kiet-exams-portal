import React, { useEffect, useState, useRef } from "react";
import { Routes, Route, Navigate, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../utils/api";

import AdminDashboardHome from "./admin/AdminDashboardHome";
import CreateExam from "./admin/CreateExam";
import AssignExam from "./admin/AssignExam";
import ViewExams from "./admin/ViewExams";
import TeacherManagement from "./admin/TeacherManagement";
import ViewResults from "./admin/ViewResults";

// We'll create these later, importing placeholders for now
const PlaceholderComponent = ({ title }) => (
  <div className="admin-card"><h2>{title}</h2><p>Component under construction in next phase.</p></div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { logout, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (!data.is_admin) { navigate("/dashboard"); return; }
          setUser(data);
        } else {
          logout();
        }
      } catch (error) {
        console.error("Auth check failed", error);
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchAdminProfile();
    else logout();
  }, [token, navigate, logout]);

  if (loading) return <div style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "#1B2A4A", color: "white" }}>Checking Secure Access...</div>;
  if (!user) return null;

  return (
    <Routes>
      <Route path="/" element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<AdminDashboardHome />} />
      <Route path="create-exam" element={<CreateExam />} />
      <Route path="assign-exam" element={<AssignExam />} />
      <Route path="my-exams" element={<ViewExams />} />
      <Route path="results" element={<ViewResults />} />
      <Route path="manage-teachers" element={<TeacherManagement />} />
    </Routes>
  );
};

export default AdminDashboard;