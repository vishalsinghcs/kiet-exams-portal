import React from 'react';
import { Search, Bell, Moon, Sun, User } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import Input from '../ui/Input';

const Topbar = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="topbar">
      <Input 
        icon={Search} 
        shortcut="Ctrl K" 
        placeholder="Search across workspace..." 
        style={{ width: '360px' }}
      />
      
      <div className="topbar-actions">
        <button className="icon-btn">
          <Bell size={18} />
        </button>
        
        <div className="theme-toggle">
          <button 
            className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} 
            onClick={() => setTheme('dark')}
          >
            <Moon size={14} />
          </button>
          <button 
            className={`theme-btn ${theme === 'light' ? 'active' : ''}`} 
            onClick={() => setTheme('light')}
          >
            <Sun size={14} />
          </button>
        </div>
        
        <button className="profile-btn">
          <div className="avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--border-light)' }}>
            <User size={16} color="var(--text-secondary)" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default Topbar;
