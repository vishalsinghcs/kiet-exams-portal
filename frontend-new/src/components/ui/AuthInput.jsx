import React from "react";

const Input = ({
  icon: Icon,
  endIcon: EndIcon,
  onEndIconClick,
  shortcut,
  className = "",
  containerClassName = "",
  label = "",
  hasError = false,
  ...props
}) => {
  return (
    <div className={`floating-input-group ${containerClassName}`}>
      <input
        className={`floating-input ${hasError ? 'has-error' : ''} ${className}`}
        placeholder=" "
        style={{ paddingRight: EndIcon || shortcut ? "32px" : "0px" }}
        {...props}
      />
      {label && <label className="floating-label">{label}</label>}
      
      {shortcut && <span className="search-shortcut">{shortcut}</span>}
      
      {EndIcon && (
        <button
          type="button"
          className="floating-input-icon"
          onClick={onEndIconClick}
          tabIndex="-1"
        >
          <EndIcon size={18} />
        </button>
      )}
    </div>
  );
};

export default Input;
