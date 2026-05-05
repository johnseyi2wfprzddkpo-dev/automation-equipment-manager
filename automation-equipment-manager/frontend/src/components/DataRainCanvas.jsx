import { useEffect, useRef } from "react";

const STREAM_COLOR = "#00f3ff";
const FIELD_RADIUS = 80;
const CHARS = "010101101011001101001111ABCDEF";

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

function createParticle(width, height, index, total) {
  const baseX = ((index + Math.random() * 0.4) / total) * width;
  return {
    baseX,
    x: baseX,
    y: Math.random() * height,
    vx: 0,
    speed: 1.1 + Math.random() * 2.6,
    size: 13 + Math.random() * 7,
    alpha: 0.34 + Math.random() * 0.62,
    char: randomChar(),
    switchAt: 0,
  };
}

function drawParticle(ctx, particle, now) {
  if (now > particle.switchAt) {
    particle.char = randomChar();
    particle.switchAt = now + 90 + Math.random() * 260;
  }

  ctx.font = `${particle.size}px Consolas, Monaco, monospace`;
  ctx.fillStyle = `rgba(0, 243, 255, ${particle.alpha})`;
  ctx.shadowColor = STREAM_COLOR;
  ctx.shadowBlur = 12;
  ctx.fillText(particle.char, particle.x, particle.y);
}

function moveParticle(particle, width, height, mouse) {
  if (mouse.active) {
    const dx = particle.x - mouse.x;
    const dy = particle.y - mouse.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 0 && distance < FIELD_RADIUS) {
      const direction = dx >= 0 ? 1 : -1;
      const force = (1 - distance / FIELD_RADIUS) ** 2;
      particle.vx += direction * force * 9.5;
    }
  }

  particle.x += particle.vx;
  particle.y += particle.speed;
  particle.vx *= 0.84;
  particle.x += (particle.baseX - particle.x) * 0.026;

  if (particle.y > height + 24) {
    particle.y = -24 - Math.random() * height * 0.3;
    particle.baseX = Math.random() * width;
    particle.x = particle.baseX;
    particle.vx = 0;
    particle.speed = 1.1 + Math.random() * 2.6;
  }
}

export default function DataRainCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const mouse = { x: -999, y: -999, active: false };
    let animationFrame = 0;
    let particles = [];
    let width = 0;
    let height = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      const total = Math.max(80, Math.floor(width / 8));
      particles = Array.from({ length: total }, (_, index) => createParticle(width, height, index, total));
    }

    function updateMouse(event) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
      mouse.active = true;
    }

    function leaveMouse() {
      mouse.active = false;
    }

    function animate(now) {
      ctx.fillStyle = "rgba(2, 12, 24, 0.18)";
      ctx.fillRect(0, 0, width, height);
      ctx.shadowBlur = 0;

      particles.forEach((particle) => {
        moveParticle(particle, width, height, mouse);
        drawParticle(ctx, particle, now);
      });

      animationFrame = requestAnimationFrame(animate);
    }

    resize();
    canvas.addEventListener("pointermove", updateMouse);
    canvas.addEventListener("pointerleave", leaveMouse);
    window.addEventListener("resize", resize);
    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
      canvas.removeEventListener("pointermove", updateMouse);
      canvas.removeEventListener("pointerleave", leaveMouse);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="digital-rain-canvas" />;
}
