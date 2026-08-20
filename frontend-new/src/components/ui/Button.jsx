import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  icon: Icon, 
  className = '', 
  ...props 
}) => {
  const baseClass = variant === 'secondary' ? 'btn-secondary' : 'btn-primary';
  
  return (
    <button className={`${baseClass} ${className}`} {...props}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

export default Button;
