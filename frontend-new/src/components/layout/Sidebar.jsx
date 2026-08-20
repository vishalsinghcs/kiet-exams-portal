import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Zap } from 'lucide-react';

const Sidebar = ({ brandName = "Aegis AI", links = [] }) => {
  const [highlightStyle, setHighlightStyle] = useState({});
  const location = useLocation();
  const navRef = useRef(null);

  useEffect(() => {
    // Small delay to allow DOM to render active class
    setTimeout(() => {
      if (!navRef.current) return;
      const activeEl = navRef.current.querySelector('.nav-item.active');
      if (activeEl) {
        setHighlightStyle({
          top: activeEl.offsetTop + 'px',
          height: activeEl.offsetHeight + 'px',
          opacity: 1
        });
      } else {
        setHighlightStyle({ opacity: 0 });
      }
    }, 50);
  }, [location.pathname]);

  return (
    <div className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Zap size={20} />
        </div>
        <div className="brand-text">{brandName}</div>
      </div>
      
      <div className="nav-section" ref={navRef}>
        <div className="nav-label">Main Menu</div>
        <div className="nav-highlight" style={highlightStyle}></div>
        
        {links.map((link) => (
          <NavLink 
            key={link.to} 
            to={link.to} 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {link.icon && <link.icon size={18} />}
            {link.label}
          </NavLink>
        ))}
      </div>
      
      <div className="spacer"></div>
    </div>
  );
};

export default Sidebar;
