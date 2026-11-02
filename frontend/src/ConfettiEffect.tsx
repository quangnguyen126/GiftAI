import { useEffect, useRef } from "react";

interface ConfettiEffectProps {
  active: boolean;
  durationMs?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  shape: "rect" | "circle" | "heart" | "star";
  alpha: number;
  wobble: number;
  wobbleSpeed: number;
}

const COLORS = [
  "#f43f5e", // Rose
  "#ec4899", // Pink
  "#a855f7", // Purple
  "#3b82f6", // Blue
  "#eab308", // Gold
  "#10b981", // Emerald
  "#f97316", // Orange
  "#ffffff", // White
];

export function ConfettiEffect({ active, durationMs = 4500 }: ConfettiEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particles: Particle[] = [];
    const count = 160;

    // Create burst of particles from center
    const originX = width / 2;
    const originY = height * 0.45;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 7 + Math.random() * 14;
      const shapes: Array<"rect" | "circle" | "heart" | "star"> = [
        "rect",
        "circle",
        "heart",
        "star",
      ];
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed * (0.8 + Math.random() * 0.6),
        vy: Math.sin(angle) * speed * (0.8 + Math.random() * 0.6) - 5,
        size: 7 + Math.random() * 9,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        alpha: 1,
        wobble: Math.random() * 10,
        wobbleSpeed: 0.05 + Math.random() * 0.08,
      });
    }

    let animationId: number;
    const startTime = Date.now();

    const drawHeart = (c: CanvasRenderingContext2D, size: number) => {
      const topCurveHeight = size * 0.3;
      c.beginPath();
      c.moveTo(0, topCurveHeight);
      c.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight);
      c.bezierCurveTo(-size / 2, (size + topCurveHeight) / 2, 0, size, 0, size * 1.2);
      c.bezierCurveTo(0, size, size / 2, (size + topCurveHeight) / 2, size / 2, topCurveHeight);
      c.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight);
      c.closePath();
      c.fill();
    };

    const drawStar = (c: CanvasRenderingContext2D, r: number) => {
      c.beginPath();
      for (let i = 0; i < 5; i++) {
        c.lineTo(
          Math.cos(((18 + i * 72) * Math.PI) / 180) * r,
          -Math.sin(((18 + i * 72) * Math.PI) / 180) * r
        );
        c.lineTo(
          Math.cos(((54 + i * 72) * Math.PI) / 180) * (r / 2),
          -Math.sin(((54 + i * 72) * Math.PI) / 180) * (r / 2)
        );
      }
      c.closePath();
      c.fill();
    };

    const render = () => {
      const elapsed = Date.now() - startTime;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22; // gravity
        p.vx *= 0.985; // friction
        p.rotation += p.rotationSpeed;
        p.wobble += p.wobbleSpeed;

        if (elapsed > durationMs * 0.6) {
          p.alpha = Math.max(0, 1 - (elapsed - durationMs * 0.6) / (durationMs * 0.4));
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.translate(p.x + Math.sin(p.wobble) * 4, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.7);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === "heart") {
          drawHeart(ctx, p.size * 0.8);
        } else if (p.shape === "star") {
          drawStar(ctx, p.size * 0.8);
        }

        ctx.restore();
      }

      if (elapsed < durationMs) {
        animationId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, [active, durationMs]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 99999,
      }}
    />
  );
}
export default ConfettiEffect;
