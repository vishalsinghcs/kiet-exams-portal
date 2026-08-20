import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

// Easing for eyes tracking
const trackingEase = 0.15;

const InteractiveCharacters = ({
  mousePos = { x: 0, y: 0 },
  isPasswordVisible = false,
  focusedField = null,
  loginFailed = false
}) => {
  const containerRef = useRef(null);
  
  // Refs for characters bodies
  const purpleBodyRef = useRef(null);
  const blackBodyRef = useRef(null);
  const orangeBodyRef = useRef(null);
  const yellowBodyRef = useRef(null);

  // Refs for eyes
  const purpleEyesRef = useRef(null);
  const blackEyesRef = useRef(null);
  const orangeEyesRef = useRef(null);
  const yellowEyesRef = useRef(null);

  // Initial Entrance Animation
  useEffect(() => {
    const tl = gsap.timeline();
    
    // Initial states: Push far off screen to guarantee they are hidden
    gsap.set(blackBodyRef.current, { y: -2000, rotation: 180, transformOrigin: "50% 50%" });
    gsap.set(purpleBodyRef.current, { x: -2000, y: 0 });
    gsap.set(orangeBodyRef.current, { x: -2000, y: 300, scale: 0.8 });
    gsap.set(yellowBodyRef.current, { y: 2000 });

    // Black character complex jump and flip
    tl.to(blackBodyRef.current, { y: 0, scaleY: 0.6, scaleX: 1.4, duration: 0.4, ease: "power2.in" }) // Drop and squash
      .to(blackBodyRef.current, { y: -300, scaleY: 1.2, scaleX: 0.8, rotation: 90, duration: 0.4, ease: "power2.out" }) // Jump and stretch
      .to(blackBodyRef.current, { y: 0, scaleY: 1, scaleX: 1, rotation: 0, duration: 0.8, ease: "elastic.out(1.5, 0.5)" }); // Land upright

    // Others slide in with elastic easing
    tl.to(purpleBodyRef.current, { x: 0, y: 0, duration: 1.2, ease: "elastic.out(1, 0.7)" }, 0.6)
      .to(yellowBodyRef.current, { y: 0, duration: 1.2, ease: "elastic.out(1, 0.7)" }, 0.7)
      .to(orangeBodyRef.current, { x: 0, y: 0, scale: 1, duration: 1.2, ease: "elastic.out(1, 0.7)" }, 0.8);

  }, []);

  // Mouse Tracking & State Reactions
  useEffect(() => {
    const bounds = containerRef.current.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    
    // Calculate normalized mouse offset (-1 to 1)
    let moveX = (mousePos.x - centerX) / (bounds.width / 2);
    let moveY = (mousePos.y - centerY) / (bounds.height / 2);

    // Limit extreme values
    moveX = Math.max(-1, Math.min(1, moveX));
    moveY = Math.max(-1, Math.min(1, moveY));

    // Determine target eye positions
    let targetX = moveX * 15; // Max 15px movement
    let targetY = moveY * 15;

    // OVERRIDES based on state
    if (loginFailed) {
      // Look down sad
      targetX = 0;
      targetY = 20;
      gsap.to([purpleBodyRef.current, blackBodyRef.current, orangeBodyRef.current, yellowBodyRef.current], {
        scaleY: 0.9, duration: 0.4, ease: "back.out(2)"
      });
    } else if (isPasswordVisible) {
      // Look away (trying not to peek)
      gsap.to(purpleEyesRef.current, { x: -20, y: -10, duration: 0.4 });
      gsap.to(blackEyesRef.current, { x: 10, y: -25, duration: 0.4 });
      gsap.to(orangeEyesRef.current, { x: -25, y: 10, duration: 0.4 });
      gsap.to(yellowEyesRef.current, { x: 25, y: 15, duration: 0.4 });
      
      gsap.to([purpleBodyRef.current, orangeBodyRef.current], { rotation: -5, duration: 0.4 });
      gsap.to([blackBodyRef.current, yellowBodyRef.current], { rotation: 5, duration: 0.4 });
      return; // Skip normal tracking
    } else if (focusedField === 'email' || focusedField === 'password') {
      // Stare intensely at the right side (where form is)
      targetX = 25;
      targetY = 0;
      // Bob up slightly to look closely
      gsap.to([purpleBodyRef.current, yellowBodyRef.current], { rotation: 2, scale: 1.02, duration: 0.3 });
      gsap.to(blackBodyRef.current, { rotation: 5, duration: 0.3 });
    } else {
      // Reset body transforms when not interacting
      gsap.to([purpleBodyRef.current, yellowBodyRef.current, orangeBodyRef.current], { rotation: 0, scale: 1, scaleY: 1, duration: 0.4 });
      gsap.to(blackBodyRef.current, { rotation: 0, scale: 1, scaleY: 1, duration: 0.4 });
    }

    // Apply eye movements
    gsap.to(purpleEyesRef.current, { x: targetX, y: targetY, duration: 0.3, ease: "power2.out" });
    gsap.to(blackEyesRef.current, { x: targetX, y: targetY, duration: 0.3, ease: "power2.out", delay: 0.05 });
    gsap.to(orangeEyesRef.current, { x: targetX, y: targetY, duration: 0.3, ease: "power2.out", delay: 0.1 });
    gsap.to(yellowEyesRef.current, { x: targetX, y: targetY, duration: 0.3, ease: "power2.out", delay: 0.02 });

  }, [mousePos, isPasswordVisible, focusedField, loginFailed]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg width="100%" height="100%" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid meet">
        <g transform="translate(50, 200)">
          {/* Purple Character */}
          <g transform="translate(0, 0)">
            <g ref={purpleBodyRef}>
              <rect width="200" height="500" fill="#6930C3" rx="10" />
              <g ref={purpleEyesRef}>
                <circle cx="90" cy="80" r="12" fill="white" />
                <circle cx="90" cy="80" r="4" fill="black" />
                <circle cx="150" cy="80" r="12" fill="white" />
                <circle cx="150" cy="80" r="4" fill="black" />
                {/* Mouth */}
                <rect x="120" y="85" width="10" height="40" fill="black" rx="5" />
              </g>
            </g>
          </g>

          {/* Black Character */}
          <g transform="translate(150, 120)">
            <g ref={blackBodyRef}>
              <rect width="140" height="380" fill="#1E1E1E" rx="10" />
              <g ref={blackEyesRef}>
                <circle cx="90" cy="70" r="14" fill="white" />
                <circle cx="90" cy="70" r="5" fill="black" />
                <circle cx="130" cy="70" r="14" fill="white" />
                <circle cx="130" cy="70" r="5" fill="black" />
              </g>
            </g>
          </g>

          {/* Yellow Character */}
          <g transform="translate(250, 200)">
            <g ref={yellowBodyRef}>
              <path d="M 0 300 L 0 100 A 70 70 0 0 1 140 100 L 140 300 Z" fill="#F4D03F" />
              <g ref={yellowEyesRef}>
                <circle cx="50" cy="130" r="5" fill="black" />
                <rect x="80" y="150" width="80" height="10" fill="#1E1E1E" rx="5" />
              </g>
            </g>
          </g>

          {/* Orange Character */}
          <g transform="translate(-20, 250)">
            <g ref={orangeBodyRef}>
              <path d="M 0 250 L 0 200 A 150 150 0 0 1 300 200 L 300 250 Z" fill="#F39C12" />
              <g ref={orangeEyesRef}>
                <circle cx="110" cy="130" r="8" fill="#1E1E1E" />
                <circle cx="190" cy="130" r="8" fill="#1E1E1E" />
                <path d="M 135 150 Q 150 170 165 150 Z" fill="#1E1E1E" />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
};

export default InteractiveCharacters;
