import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const AuthSelect = ({
  className = "",
  containerClassName = "",
  label = "",
  hasError = false,
  value,
  onChange,
  onFocus,
  onBlur,
  children,
  disabled,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  // Remove the useEffect mousedown listener since we'll use a fixed overlay layer instead

  // Parse children options (ignoring hidden options like the empty placeholder)
  const options = React.Children.toArray(children)
    .filter((child) => child.type === "option" && !child.props.hidden)
    .map((child) => ({
      value: child.props.value,
      label: child.props.children,
      disabled: child.props.disabled,
    }));

  const hasValue = value !== "" && value !== null && value !== undefined;
  
  // Find selected label
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : "";

  const handleSelect = (optionValue) => {
    if (onChange) {
      // Mock event object for onChange
      onChange({ target: { value: optionValue } });
    }
    setIsOpen(false);
    if (onBlur) onBlur();
  };

  return (
    <div 
      className={`floating-input-group ${containerClassName}`} 
      ref={dropdownRef}
      style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
    >
      <div
        className={`floating-input floating-select-custom ${hasError ? 'has-error' : ''} ${hasValue ? 'has-value' : ''} ${isOpen ? 'is-focused' : ''} ${className}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen && onFocus) onFocus();
            if (isOpen && onBlur) onBlur();
          }
        }}
        style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: "37px" }}
        {...props}
      >
        <span>{displayLabel}</span>
        <ChevronDown size={16} style={{ color: "var(--text-secondary)", transition: "transform 0.3s ease", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
      </div>
      
      {label && <label className="floating-label">{label}</label>}

      {isOpen && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
            if (onBlur) onBlur();
          }}
        />
      )}

      {isOpen && (
        <div className="custom-dropdown-menu" style={{ zIndex: 100 }}>
          {options.map((opt, i) => (
            <div
              key={i}
              className={`custom-dropdown-item ${opt.value === value ? 'selected' : ''}`}
              onClick={() => !opt.disabled && handleSelect(opt.value)}
              style={{ cursor: opt.disabled ? "not-allowed" : "pointer", opacity: opt.disabled ? 0.5 : 1 }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuthSelect;
