'use client';

import { useEffect, useRef } from 'react';

interface AnimatedLogoProps {
  width?: number;
  height?: number;
  fontSize?: number;
  numParticles?: number;
  className?: string;
}

export function AnimatedLogo({
  width = 120,
  height = 50,
  fontSize = 24,
  numParticles = 200,
  className,
}: AnimatedLogoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    const cx = width / 2;
    const cy = height / 2;
    const fg = '#ffffff';
    const bg = 'var(--background)';
    const scatterRadius = height * 0.7;
    const collapseSpeed = 0.22;
    const trailFade = 0.12;

    // Sample text pixels
    function getTextPoints() {
      const off = document.createElement('canvas');
      off.width = width;
      off.height = height;
      const octx = off.getContext('2d')!;
      octx.fillStyle = '#fff';
      octx.font = `900 ${fontSize}px 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`;
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.fillText('VEX', cx, cy);

      const data = octx.getImageData(0, 0, width, height).data;
      const points: { x: number; y: number }[] = [];
      const step = Math.max(
        2,
        Math.floor(Math.sqrt((width * height) / (numParticles * 3))),
      );

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          if ((data[(y * width + x) * 4 + 3] ?? 0) > 128) {
            points.push({ x, y });
          }
        }
      }

      while (points.length > numParticles) {
        points.splice(Math.floor(Math.random() * points.length), 1);
      }
      return points;
    }

    const targets = getTextPoints();

    const particles = targets.map((t) => ({
      tx: t.x,
      ty: t.y,
      angle: Math.random() * Math.PI * 2,
      radius: scatterRadius * 0.4 + Math.random() * scatterRadius * 0.6,
      speed: 0.001 + Math.random() * 0.005,
      phase: Math.random() * Math.PI * 2,
      size: 0.4 + Math.random() * 0.8,
    }));

    let time = 0;

    function render() {
      if (!ctx) return;

      // Trail fade
      ctx.fillStyle = bg;
      ctx.globalAlpha = trailFade;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;

      // Collapse cycle
      const raw = Math.sin(time * collapseSpeed) * 0.5 + 0.5;
      const collapse = Math.pow(raw, 0.25);

      ctx.fillStyle = fg;

      particles.forEach((p) => {
        p.angle += p.speed;

        const ox = cx + Math.cos(p.angle + p.phase) * p.radius;
        const oy = cy + Math.sin(p.angle + p.phase) * p.radius;

        const x = ox + (p.tx - ox) * collapse;
        const y = oy + (p.ty - oy) * collapse;

        const alpha = 0.05 + collapse * 0.88;
        const size = p.size * (0.2 + collapse * 0.8);

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      time += 0.01;
      animRef.current = requestAnimationFrame(render);
    }

    // Init
    ctx.fillStyle = bg;
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, width, height);
    render();

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [width, height, fontSize, numParticles]);

  return (
    <canvas ref={canvasRef} className={className} style={{ width, height }} />
  );
}
