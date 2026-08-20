import React, { useRef, useEffect } from 'react';

const OtpInput = ({ length = 6, value = "", onChange, onFocus, onBlur, hasError }) => {
  const inputRefs = useRef([]);

  const handleChange = (e, index) => {
    const val = e.target.value;
    
    // Handle paste or multiple chars inside a single box
    if (val.length > 1) {
      const pastedData = val.replace(/\D/g, '').slice(0, length);
      onChange(pastedData);
      
      // Focus the last filled input or the end
      const nextIndex = Math.min(pastedData.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    // Normal single character typing
    const currentVal = val.replace(/\D/g, '');
    
    // Build new OTP string
    let newOtpArray = value.split('');
    // Fill empty spaces if jumping ahead
    for (let i = 0; i < length; i++) {
      if (!newOtpArray[i]) newOtpArray[i] = " ";
    }
    
    newOtpArray[index] = currentVal || " ";
    const finalOtp = newOtpArray.join('').trimEnd();
    
    onChange(finalOtp.replace(/\s/g, ''));

    // Move to next input if a number was typed
    if (currentVal && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    // If backspace pressed and current input is empty, move to previous
    if (e.key === 'Backspace') {
      if (!value[index] || value[index] === " ") {
        if (index > 0) {
          inputRefs.current[index - 1]?.focus();
        }
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, length);
    onChange(pastedData);
    
    const nextIndex = Math.min(pastedData.length, length - 1);
    if (inputRefs.current[nextIndex]) {
      inputRefs.current[nextIndex].focus();
    }
  };

  return (
    <div 
      className="otp-container" 
      onFocus={onFocus} 
      onBlur={onBlur}
    >
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength="2" // Allow 2 to catch rapid typing / pasting
          className={`otp-box ${hasError ? 'has-error' : ''} ${value[index] ? 'has-value' : ''}`}
          value={value[index] && value[index] !== " " ? value[index] : ''}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          placeholder="•"
        />
      ))}
    </div>
  );
};

export default OtpInput;
