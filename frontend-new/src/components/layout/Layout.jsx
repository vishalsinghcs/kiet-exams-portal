import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const Layout = ({ sidebarLinks, brandName }) => {
  return (
    <div id="app" className="loaded">
      <Sidebar links={sidebarLinks} brandName={brandName} />
      
      <div className="main-content">
        <Topbar />
        
        <div className="pages-container">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
