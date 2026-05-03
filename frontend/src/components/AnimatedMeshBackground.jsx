import { useEffect, useRef } from "react";

export default function AnimatedMeshBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set canvas dimensions
    const setDimensions = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    setDimensions();
    window.addEventListener("resize", setDimensions);

    // Mesh Properties
    const particles = [];
    const particleCount = Math.floor(
      ((canvas.width || window.innerWidth) * (canvas.height || window.innerHeight)) / 10000,
    );
    const maxDistance = 120;
    const colors = [
      "rgba(0, 0, 0, 0.08)",
      "rgba(0, 0, 0, 0.12)",
      "rgba(26, 115, 232, 0.15)",
    ];

    // Particle Class
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.radius = Math.random() * 3 + 1;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.z = Math.random() * 2; // Pseudo 3D depth factor
      }

      update() {
        // Apply depth to velocity for parallax effect
        this.x += this.vx * (this.z * 0.5 + 0.5);
        this.y += this.vy * (this.z * 0.5 + 0.5);

        // Bounce off edges smoothly
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(
          this.x,
          this.y,
          this.radius * (this.z * 0.5 + 0.5),
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = this.color;
        ctx.fill();
      }
    }

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Animation Loop
    let animationFrameId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDistance) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            const opacity = 1 - distance / maxDistance;
            const avgZ = (particles[i].z + particles[j].z) / 2;
            ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 0.15 * (avgZ * 0.5 + 0.5)})`;
            ctx.lineWidth = 1 * (avgZ * 0.5 + 0.5);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", setDimensions);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        background: "transparent",
      }}
    />
  );
}
