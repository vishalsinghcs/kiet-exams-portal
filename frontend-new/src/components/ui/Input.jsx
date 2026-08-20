import React from 'react';

const Input = ({ 
  icon: Icon, 
  shortcut, 
  className = '', 
  containerClassName = '',
  ...props 
}) => {
  // If it has an icon or shortcut, we use the search-container style from the template
  if (Icon || shortcut) {
    return (
      <div className={`search-container ${containerClassName}`}>
        {Icon && <Icon className="search-icon" size={16} />}
        <input 
          className={`search-input ${className}`} 
          style={{ paddingLeft: Icon ? '36px' : '12px', paddingRight: shortcut ? '36px' : '12px' }}
          {...props} 
        />
        {shortcut && <span className="search-shortcut">{shortcut}</span>}
      </div>
    );
  }

  // Standard input
  return (
    <input 
      className={`search-input ${className}`} 
      style={{ paddingLeft: '12px' }}
      {...props} 
    />
  );
};

export default Input;
