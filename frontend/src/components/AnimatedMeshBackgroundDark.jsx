import { useEffect, useRef } from "react";

export default function AdvancedMeshBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let mouse = { x: null, y: null };

    const setDimensions = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    setDimensions();
    window.addEventListener("resize", setDimensions);

    window.addEventListener("mousemove", (e) => {
      mouse.x = e.x;
      mouse.y = e.y;
    });

    const particles = [];
    const maxParticles = 120;
    const particleCount = Math.min(
      Math.floor((canvas.width * canvas.height) / 12000),
      maxParticles
    );

    const maxDistance = 130;

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = (Math.random() - 0.5) * 0.6;
        this.radius = Math.random() * 2 + 1;
        this.z = Math.random() * 2;
      }

      update() {
        // Parallax effect
        if (mouse.x && mouse.y) {
          const dx = this.x - mouse.x;
          const dy = this.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            this.x += dx * 0.01;
            this.y += dy * 0.01;
          }
        }

        this.x += this.vx * (this.z * 0.5 + 0.5);
        this.y += this.vy * (this.z * 0.5 + 0.5);

        // Wrap instead of bounce
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(
          this.x,
          this.y,
          this.radius * (this.z * 0.5 + 0.5),
          0,
          Math.PI * 2
        );

        ctx.fillStyle = "rgba(80, 80, 200, 0.6)";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(100,100,255,0.5)";
        ctx.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    let animationFrameId;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      // Optimized linking (limit neighbors)
      for (let i = 0; i < particles.length; i++) {
        let connections = 0;

        for (let j = i + 1; j < particles.length; j++) {
          if (connections > 5) break;

          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = dx * dx + dy * dy;

          if (dist < maxDistance * maxDistance) {
            connections++;

            const opacity = 1 - dist / (maxDistance * maxDistance);

            const gradient = ctx.createLinearGradient(
              particles[i].x,
              particles[i].y,
              particles[j].x,
              particles[j].y
            );

            gradient.addColorStop(0, `rgba(120,120,255,${opacity})`);
            gradient.addColorStop(1, `rgba(80,80,200,${opacity})`);

            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1;
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
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}