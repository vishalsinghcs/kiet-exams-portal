import React, { useEffect, useRef } from "react";
import gsap from "gsap";

// Easing for eyes tracking
const trackingEase = 0.15;

const InteractiveCharacters = ({
  mousePos = { x: 0, y: 0 },
  isPasswordVisible = false,
  focusedField = null,
  loginFailed = false,
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
  const yellowMouthRef = useRef(null);

  // Refs for sad/normal face states
  const purpleNormalMouthRef = useRef(null);
  const purpleSadMouthRef = useRef(null);
  const purpleSadEyesRef = useRef(null);

  const blackNormalMouthRef = useRef(null);
  const blackSadMouthRef = useRef(null);
  const blackSadEyesRef = useRef(null);

  const yellowNormalMouthRef = useRef(null);
  const yellowSadMouthRef = useRef(null);
  const yellowSadEyesRef = useRef(null);

  const orangeNormalMouthRef = useRef(null);
  const orangeSadMouthRef = useRef(null);
  const orangeSadEyesRef = useRef(null);

  // Initial Entrance Animation
  useEffect(() => {
    const tl = gsap.timeline();

    // Initial states: Push far off screen to guarantee they are hidden
    gsap.set(blackBodyRef.current, {
      y: -2000,
      rotation: 180,
      transformOrigin: "50% 50%",
    });
    gsap.set(purpleBodyRef.current, {
      x: -2000,
      y: 0,
      transformOrigin: "50% 50%",
    });
    gsap.set(orangeBodyRef.current, {
      x: -2000,
      y: 300,
      scale: 0.8,
      transformOrigin: "50% 50%",
    });
    gsap.set(yellowBodyRef.current, { y: 2000, transformOrigin: "50% 50%" });

    // Black character complex jump and flip
    tl.to(blackBodyRef.current, {
      y: 0,
      scaleY: 0.6,
      scaleX: 1.4,
      duration: 0.4,
      ease: "power2.in",
    }) // Drop and squash
      .to(blackBodyRef.current, {
        y: -300,
        scaleY: 1.2,
        scaleX: 0.8,
        rotation: 90,
        duration: 0.4,
        ease: "power2.out",
      }) // Jump and stretch
      .to(blackBodyRef.current, {
        y: 0,
        scaleY: 1,
        scaleX: 1,
        rotation: 0,
        duration: 0.8,
        ease: "elastic.out(1.5, 0.5)",
      }); // Land upright

    // Others slide in with elastic easing
    tl.to(
      purpleBodyRef.current,
      { x: 0, y: 0, duration: 1.2, ease: "elastic.out(1, 0.7)" },
      0.6,
    )
      .to(
        yellowBodyRef.current,
        { y: 0, duration: 1.2, ease: "elastic.out(1, 0.7)" },
        0.7,
      )
      .to(
        orangeBodyRef.current,
        { x: 0, y: 0, scale: 1, duration: 1.2, ease: "elastic.out(1, 0.7)" },
        0.8,
      );
  }, []);

  // Random Blinking Animation
  useEffect(() => {
    let timeoutCall;

    const blink = () => {
      // Pick a random interval between 2s and 6s
      const nextBlink = Math.random() * 4 + 2;

      // Blink animation (faster)
      gsap.to(
        [
          purpleEyesRef.current,
          blackEyesRef.current,
          orangeEyesRef.current,
          yellowEyesRef.current,
        ],
        {
          scaleY: 0.1,
          transformOrigin: "center center",
          duration: 0.05, // Reduced from 0.1 for faster blink
          yoyo: true,
          repeat: 1,
          onComplete: () => {
            timeoutCall = gsap.delayedCall(nextBlink, blink);
          },
        },
      );
    };

    timeoutCall = gsap.delayedCall(2, blink);

    return () => {
      if (timeoutCall) timeoutCall.kill();
      gsap.killTweensOf(
        [
          purpleEyesRef.current,
          blackEyesRef.current,
          orangeEyesRef.current,
          yellowEyesRef.current,
        ],
        "scaleY",
      );
    };
  }, []);

  // Chatting Animation Loop (When Focused)
  const chatTimelineRef = useRef(null);

  useEffect(() => {
    if (focusedField === "email") {
      // Kill any lingering delayed mouse tracking tweens so they don't wake up and overwrite us
      gsap.killTweensOf([purpleEyesRef.current, blackEyesRef.current, orangeEyesRef.current, yellowEyesRef.current, yellowMouthRef.current], "x,y");
      
      // 1. Initial stare at form (one-time snap, NOT in the loop so it doesn't cause jump-cuts on repeat)
      gsap.to(purpleEyesRef.current, { x: 60, y: 0, duration: 0.3 });
      gsap.to(blackEyesRef.current, { x: 60, y: 0, duration: 0.3 });
      gsap.to(orangeEyesRef.current, { x: 60, y: -35, duration: 0.3 });
      gsap.to([yellowEyesRef.current, yellowMouthRef.current], {
        x: 60,
        y: -25,
        duration: 0.3,
      });

      // 2. The looping timeline for their conversation
      const tl = gsap.timeline({ repeat: -1, delay: 2.5 });

      // Interact with each other
      tl.fromTo(purpleEyesRef.current, { x: 60, y: 0 }, { x: 15, y: 30, duration: 0.3, immediateRender: false }, 0) // Purple looks DOWN and RIGHT
        .fromTo(blackEyesRef.current, { x: 60, y: 0 }, { x: -10, y: 40, duration: 0.3, immediateRender: false }, 0) // Black looks DOWN and LEFT

        // Orange and Yellow nod "yes" enthusiastically
        .fromTo(
          orangeEyesRef.current,
          { x: 60, y: -35 },
          { x: 60, y: -10, duration: 0.15, yoyo: true, repeat: 3, immediateRender: false },
          0.1,
        )
        .fromTo(
          [yellowEyesRef.current, yellowMouthRef.current],
          { x: 60, y: -25 },
          { x: 60, y: 0, duration: 0.15, yoyo: true, repeat: 3, immediateRender: false },
          0.2,
        );

      // 3. Look back at the input form
      tl.to(purpleEyesRef.current, { x: 60, y: 0, duration: 0.3 }, 1.5).to(
        blackEyesRef.current,
        { x: 60, y: 0, duration: 0.3 },
        1.5,
      );

      // 4. Hold the stare before repeating the loop
      tl.to({}, { duration: 2.5 });

      chatTimelineRef.current = tl;
    } else if (focusedField === "password") {
      // Kill any lingering delayed mouse tracking tweens so they don't wake up and overwrite us
      gsap.killTweensOf([purpleEyesRef.current, blackEyesRef.current, orangeEyesRef.current, yellowEyesRef.current, yellowMouthRef.current], "x,y");

      // 1. Initial stare FAR LEFT (away from password)
      gsap.to(purpleEyesRef.current, { x: -60, y: 0, duration: 0.3 });
      gsap.to(blackEyesRef.current, { x: -60, y: 0, duration: 0.3 });
      gsap.to(orangeEyesRef.current, { x: -60, y: -10, duration: 0.3 });
      gsap.to([yellowEyesRef.current, yellowMouthRef.current], {
        x: -60,
        y: -10,
        duration: 0.3,
      });

      // 2. The looping timeline for their conversation
      const tl = gsap.timeline({ repeat: -1, delay: 2.5 });

      // Interact with each other (keeping eyes to the left)
      tl.fromTo(purpleEyesRef.current, { x: -60, y: 0 }, { x: -40, y: -20, duration: 0.3, immediateRender: false }, 0) // Purple looks UP and LEFT
        .fromTo(blackEyesRef.current, { x: -60, y: 0 }, { x: -40, y: 30, duration: 0.3, immediateRender: false }, 0) // Black looks DOWN and LEFT

        // Orange and Yellow bob head slightly
        .fromTo(
          orangeEyesRef.current,
          { x: -60, y: -10 },
          { x: -60, y: 10, duration: 0.15, yoyo: true, repeat: 3, immediateRender: false },
          0.1,
        )
        .fromTo(
          [yellowEyesRef.current, yellowMouthRef.current],
          { x: -60, y: -10 },
          { x: -60, y: 10, duration: 0.15, yoyo: true, repeat: 3, immediateRender: false },
          0.2,
        );

      // 3. Look back LEFT
      tl.to(purpleEyesRef.current, { x: -60, y: 0, duration: 0.3 }, 1.5).to(
        blackEyesRef.current,
        { x: -60, y: 0, duration: 0.3 },
        1.5,
      );

      // 4. Hold the stare before repeating the loop
      tl.to({}, { duration: 2.5 });

      chatTimelineRef.current = tl;
    } else {
      if (chatTimelineRef.current) {
        chatTimelineRef.current.kill();
        chatTimelineRef.current = null;
      }
    }

    return () => {
      if (chatTimelineRef.current) chatTimelineRef.current.kill();
    };
  }, [focusedField]);

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
    let targetX = moveX * 40; // Increased for more noticeable tracking
    let targetY = moveY * 40;

    let yellowTargetY = targetY;
    let orangeTargetY = targetY;

    // 1. Determine body state based on ALL conditions
    let targetScaleY = loginFailed ? 0.9 : 1;
    let targetRotation = 0;
    let targetScale = 1;

    if (focusedField === "email") {
      targetRotation = 8;
      targetScale = 1.03;
    }

    // Apply body state
    gsap.to(
      [
        purpleBodyRef.current,
        blackBodyRef.current,
        orangeBodyRef.current,
        yellowBodyRef.current,
      ],
      {
        rotation: targetRotation,
        scale: targetScale,
        scaleY: targetScaleY,
        duration: 0.4,
        ease: loginFailed ? "back.out(2)" : "power2.out",
      },
    );

    // 2. Determine eye positions
    if (loginFailed) {
      // Look down sad (default sad gaze, can be overridden by focus)
      targetX = 0;
      targetY = 20;
      yellowTargetY = 20;
      orangeTargetY = 20;
    }

    if (isPasswordVisible || focusedField === "password") {
      // Only animate eyes here if NOT focused on password (otherwise chat loop handles eyes)
      if (focusedField !== "password") {
        gsap.to([purpleEyesRef.current, blackEyesRef.current, orangeEyesRef.current], { x: -60, y: 0, duration: 0.4 });
        gsap.to([yellowEyesRef.current, yellowMouthRef.current], { x: -60, y: 0, duration: 0.4 });
      }

      return; // Skip normal tracking
    } else if (focusedField === "email") {
      // Skip the mouse tracking eye movements below, the chatTimeline handles eyes during focus!
      return;
    }

    // Apply eye movements (only runs if NOT focused)
    gsap.to(purpleEyesRef.current, {
      x: targetX,
      y: targetY,
      duration: 0.3,
      ease: "power2.out",
    });
    gsap.to(blackEyesRef.current, {
      x: targetX,
      y: targetY,
      duration: 0.3,
      ease: "power2.out",
      delay: 0.05,
    });
    gsap.to(orangeEyesRef.current, {
      x: targetX,
      y: orangeTargetY,
      duration: 0.3,
      ease: "power2.out",
      delay: 0.1,
    });
    gsap.to([yellowEyesRef.current, yellowMouthRef.current], {
      x: targetX,
      y: yellowTargetY,
      duration: 0.3,
      ease: "power2.out",
      delay: 0.02,
    });
  }, [mousePos, isPasswordVisible, focusedField, loginFailed]);

  // Sad Face Animation on Error
  useEffect(() => {
    const normalMouths = [
      purpleNormalMouthRef.current,
      blackNormalMouthRef.current,
      yellowNormalMouthRef.current,
      orangeNormalMouthRef.current,
    ];
    const sadElements = [
      purpleSadMouthRef.current,
      blackSadMouthRef.current,
      yellowSadMouthRef.current,
      orangeSadMouthRef.current,
      purpleSadEyesRef.current,
      blackSadEyesRef.current,
      yellowSadEyesRef.current,
      orangeSadEyesRef.current,
    ];

    if (loginFailed && !focusedField) {
      gsap.to(normalMouths, { opacity: 0, duration: 0.3, ease: "power2.inOut" });
      gsap.to(sadElements, { opacity: 1, duration: 0.3, ease: "power2.inOut", delay: 0.1 });
    } else {
      gsap.to(normalMouths, { opacity: 1, duration: 0.3, ease: "power2.inOut" });
      gsap.to(sadElements, { opacity: 0, duration: 0.3, ease: "power2.inOut" });
    }
  }, [loginFailed, focusedField]);
  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 600 800"
        preserveAspectRatio="xMidYMid meet"
      >
        <g transform="translate(50, 200)">
          {/* Purple Character */}
          <g transform="translate(0, 0)">
            <g ref={purpleBodyRef}>
              <rect width="200" height="500" fill="#6930C3" rx="10" />
              <g ref={purpleEyesRef}>
                <circle cx="90" cy="60" r="12" fill="white" />
                <circle cx="90" cy="60" r="4" fill="black" />
                <circle cx="150" cy="60" r="12" fill="white" />
                <circle cx="150" cy="60" r="4" fill="black" />
                {/* Sad Eyelids - Angled UP on the inside to look sad, not angry */}
                <g ref={purpleSadEyesRef} opacity="0">
                  <rect x="75" y="45" width="30" height="15" fill="#6930C3" transform="rotate(-20, 90, 60)" />
                  <rect x="135" y="45" width="30" height="15" fill="#6930C3" transform="rotate(20, 150, 60)" />
                </g>
                {/* Mouth */}
                <rect
                  ref={purpleNormalMouthRef}
                  x="120"
                  y="65"
                  width="10"
                  height="40"
                  fill="black"
                  rx="5"
                />
                <path ref={purpleSadMouthRef} d="M 115 85 Q 125 70 135 85" stroke="black" strokeWidth="10" strokeLinecap="round" fill="none" opacity="0" />
              </g>
            </g>
          </g>

          {/* Black Character */}
          <g transform="translate(150, 120)">
            <g ref={blackBodyRef}>
              <rect width="140" height="450" fill="#1E1E1E" rx="10" />{" "}
              {/* Extended height from 380 to 450 */}
              <g ref={blackEyesRef}>
                <circle cx="50" cy="70" r="14" fill="white" />
                <circle cx="50" cy="70" r="5" fill="black" />
                <circle cx="90" cy="70" r="14" fill="white" />
                <circle cx="90" cy="70" r="5" fill="black" />
                
                {/* Sad Eyelids - Angled UP on the inside to look sad */}
                <g ref={blackSadEyesRef} opacity="0">
                  <rect x="30" y="50" width="35" height="20" fill="#1E1E1E" transform="rotate(-20, 50, 70)" />
                  <rect x="75" y="50" width="35" height="20" fill="#1E1E1E" transform="rotate(20, 90, 70)" />
                </g>

                {/* Mouth (Black has no mouth, but we keep refs empty so GSAP doesn't crash) */}
                <g ref={blackNormalMouthRef}></g>
                <g ref={blackSadMouthRef}></g>
              </g>
            </g>
          </g>

          {/* Yellow Character */}
          <g transform="translate(250, 200)">
            <g ref={yellowBodyRef}>
              <defs>
                <clipPath id="yellowBodyClip">
                  <path d="M 0 350 L 0 100 A 70 70 0 0 1 140 100 L 140 350 Z" />{" "}
                  {/* Extended bottom to 350 */}
                </clipPath>
              </defs>
              <path
                d="M 0 350 L 0 100 A 70 70 0 0 1 140 100 L 140 350 Z"
                fill="#F4D03F"
              />

              <g clipPath="url(#yellowBodyClip)">
                <g ref={yellowEyesRef}>
                  <circle cx="50" cy="90" r="5" fill="black" />
                  <circle cx="115" cy="90" r="5" fill="black" />
                  
                  {/* Sad Eyelids (Yellow just has plain dots for sad eyes) */}
                  <g ref={yellowSadEyesRef} opacity="0"></g>
                </g>
              </g>

              <g ref={yellowMouthRef}>
                <rect
                  ref={yellowNormalMouthRef}
                  x="40"
                  y="110"
                  width="80"
                  height="10"
                  fill="#1E1E1E"
                  rx="5"
                />
                <path ref={yellowSadMouthRef} d="M 45 115 Q 65 130 85 115 T 125 125" stroke="#1E1E1E" strokeWidth="8" strokeLinecap="round" fill="none" opacity="0" />
              </g>
            </g>
          </g>

          {/* Orange Character */}
          <g transform="translate(-70, 250)">
            <g ref={orangeBodyRef}>
              <path
                d="M 0 320 L 0 200 A 150 150 0 0 1 300 200 L 300 320 Z"
                fill="#F39C12"
              />{" "}
              {/* Extended bottom to 320 */}
              <g ref={orangeEyesRef}>
                <circle cx="110" cy="130" r="8" fill="#1E1E1E" />
                <circle cx="190" cy="130" r="8" fill="#1E1E1E" />
                
                {/* Sad Eyelids - Straight horizontal cut for a depressed look */}
                <g ref={orangeSadEyesRef} opacity="0">
                  <rect x="95" y="115" width="30" height="15" fill="#F39C12" />
                  <rect x="175" y="115" width="30" height="15" fill="#F39C12" />
                </g>

                {/* Mouths */}
                <path ref={orangeNormalMouthRef} d="M 135 150 Q 150 170 165 150 Z" fill="#1E1E1E" />
                <path ref={orangeSadMouthRef} d="M 140 160 Q 150 155 160 160" stroke="#1E1E1E" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0" />
              </g>
            </g>
          </g>

          {/* Invisible Masking Strip (The "Floor") - Hides the tilting bottoms! */}
          <rect x="-200" y="500" width="1000" height="400" fill="#e6e6e6" />
        </g>
      </svg>
    </div>
  );
};

export default InteractiveCharacters;
