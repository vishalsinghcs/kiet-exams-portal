import React from "react";

const Input = ({
  icon: Icon,
  endIcon: EndIcon,
  onEndIconClick,
  shortcut,
  className = "",
  containerClassName = "",
  ...props
}) => {
  // If it has an icon, endIcon, or shortcut, we use the custom layout
  if (Icon || EndIcon || shortcut) {
    return (
      <div className={`auth-input-wrapper ${containerClassName}`}>
        {Icon && <Icon className="auth-input-icon" size={18} />}
        <input
          className={`auth-input ${Icon ? "with-icon" : ""} ${className}`}
          style={{ paddingRight: EndIcon || shortcut ? "44px" : "16px" }}
          {...props}
        />
        {shortcut && <span className="search-shortcut">{shortcut}</span>}
        {EndIcon && (
          <button
            type="button"
            className="auth-input-end-action"
            onClick={onEndIconClick}
            tabIndex="-1"
          >
            <EndIcon size={18} />
          </button>
        )}
      </div>
    );
  }

  // Standard input
  return <input className={`auth-input ${className}`} {...props} />;
};

export default Input;
