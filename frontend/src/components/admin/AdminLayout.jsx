import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  FileEdit,
  Users,
  FolderOpen,
  BarChart3,
  ShieldCheck,
  Bell,
  LogOut,
  Activity
} from "lucide-react";
import "./admin.css";
import { API_BASE_URL } from "../../utils/api";
import logoTrans from "../../assets/examly_logo_trans.png";

const AdminLayout = ({ children, title = "Dashboard" }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/admin");
  };

  // While profile is loading, show a minimal placeholder so layout doesn't crash
  const displayName = user?.name ?? "Admin";
  const isAdmin = user?.role === "admin" || user?.is_admin === true;
  const displayRole = isAdmin ? "Admin" : (user?.role ?? "");

  const navItems = [
    { label: "GENERAL", isSection: true },
    { path: "/admin/dashboard", icon: <LayoutDashboard size={18} />, text: "Dashboard" },
    { path: "/admin/create-exam", icon: <FileEdit size={18} />, text: "Create Exam" },
    { path: "/admin/assign-exam", icon: <Users size={18} />, text: "Assign Exam" },
    { path: "/admin/my-exams", icon: <FolderOpen size={18} />, text: "My Exams" },
    { path: "/admin/results", icon: <BarChart3 size={18} />, text: "Results" },
  ];

  if (isAdmin) {
    navItems.push({ label: "ADMIN", isSection: true });
    navItems.push({ path: "/admin/manage-teachers", icon: <ShieldCheck size={18} />, text: "Manage Teachers" });
  }

  return (
    <div className="admin-layout-container">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <img src={logoTrans} alt="CodeML Logo" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }} />
          <span className="admin-sidebar-title">CodeML Admin</span>
        </div>

        <nav className="admin-nav-menu">
          {navItems.map((item, index) => {
            if (item.isSection) {
              return (
                <div key={index} className="admin-nav-section">
                  <div className="admin-nav-label">{item.label}</div>
                </div>
              );
            }

            const isActive = location.pathname === item.path ||
                             (item.path === '/admin/dashboard' && location.pathname === '/admin');

            return (
              <Link
                key={index}
                to={item.path}
                className={`admin-nav-item ${isActive ? "active" : ""}`}
              >
                {item.icon}
                <span>{item.text}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', padding: '0 16px', marginBottom: '16px' }}>
          <div style={{ height: '1px', background: 'var(--admin-sidebar-border)', margin: '0 0 16px 0' }}></div>
          <Link
            to="/dashboard"
            className="admin-nav-item"
            style={{ color: '#94A3B8' }}
          >
            <Activity size={18} />
            <span>Student View</span>
          </Link>
        </div>

        <div className="admin-sidebar-profile" onClick={handleLogout}>
          <div className="admin-profile-info">
            <div className="admin-profile-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="admin-profile-name">{displayName}</span>
              <span className="admin-profile-role">
                {displayRole.charAt(0).toUpperCase() + displayRole.slice(1)}
              </span>
            </div>
          </div>
          <LogOut size={16} color="#64748B" />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main-wrapper">
        <header className="admin-topbar">
          <h1 className="admin-page-title">{title}</h1>
          <div className="admin-topbar-actions">
            <button className="admin-icon-btn">
              <Bell size={20} />
              <span className="notification-badge"></span>
            </button>
            <div className="admin-profile-avatar" style={{width: '32px', height: '32px', fontSize: '0.85rem'}}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="admin-content-area">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
