import React from 'react';

const Loader = ({ text = "Loading..." }) => {
  return (
    <div id="loader">
      <div className="loader-content">
        <div className="loader-ring-wrapper">
          <div className="loader-ring"></div>
          <div className="loader-ring-spin"></div>
        </div>
        <div className="loader-text">{text}</div>
      </div>
    </div>
  );
};

export default Loader;
