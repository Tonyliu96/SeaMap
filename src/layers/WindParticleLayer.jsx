import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { screenVectorFromBearing } from "../utils/mapVectors.js";

const PARTICLE_COUNT = 190;
const PARTICLE_COLOR = "rgba(56, 189, 248, 0.95)";
const PARTICLE_LINE_WIDTH = 2.0;

export default function WindParticleLayer({ enabled, direction, speed }) {
  const map = useMap();
  const animationRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    if (!enabled || !Number.isFinite(direction)) return undefined;

    const canvas = L.DomUtil.create("canvas", "mhl-wind-particles");
    const pane = map.getPanes().overlayPane;
    pane.appendChild(canvas);

    const ctx = canvas.getContext("2d", { alpha: true });

    const updateCanvasPosition = () => {
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, topLeft);
    };

    const resize = () => {
      const size = map.getSize();
      // 考虑 retina 高分屏缩放 (DPR)
      const dpr = window.devicePixelRatio || 1;
      canvas.width = size.x * dpr;
      canvas.height = size.y * dpr;
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;

      if (ctx) ctx.scale(dpr, dpr);

      updateCanvasPosition();

      if (particlesRef.current.length === 0) {
        particlesRef.current = createParticles(size.x, size.y);
      }
    };

    const reset = () => {
      const size = map.getSize();
      updateCanvasPosition();
      particlesRef.current = createParticles(size.x, size.y);
    };

    const draw = () => {
      if (!ctx) return;

      const size = map.getSize();
      const velocity = Math.max(0.45, Math.min((speed ?? 12) / 18, 2.2));
      const movement = screenVectorFromBearing(direction);

      ctx.clearRect(0, 0, size.x, size.y);
      ctx.strokeStyle = PARTICLE_COLOR;
      ctx.lineWidth = PARTICLE_LINE_WIDTH;
      ctx.lineCap = "round";

      for (let i = 0; i < particlesRef.current.length; i++) {
        const particle = particlesRef.current[i];

        const previousX = particle.x;
        const previousY = particle.y;

        particle.x += movement.x * velocity * particle.speed;
        particle.y += movement.y * velocity * particle.speed;
        particle.life -= 1;

        if (isExpired(particle, size.x, size.y)) {
          resetParticleInPlace(particle, size.x, size.y);
          continue;
        }

        ctx.globalAlpha = particle.alpha * Math.max(particle.life / particle.maxLife, 0);
        ctx.beginPath();
        ctx.moveTo(
            previousX - movement.x * particle.length,
            previousY - movement.y * particle.length
        );
        ctx.lineTo(particle.x, particle.y);
        ctx.stroke();
      }

      animationRef.current = window.requestAnimationFrame(draw);
    };

    resize();


    map.on("resize", resize);
    map.on("move", updateCanvasPosition); // Smoothly follow during dragging
    map.on("zoomend viewreset", reset);  // Reset particles after scaling

    animationRef.current = window.requestAnimationFrame(draw);

    return () => {
      map.off("resize", resize);
      map.off("move", updateCanvasPosition);
      map.off("zoomend viewreset", reset);

      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
      canvas.remove();
      particlesRef.current = [];
    };
  }, [enabled, map, direction, speed]);

  return null;
}

function createParticles(width, height) {
  return Array.from({ length: PARTICLE_COUNT }, () => randomParticle(width, height));
}

function randomParticle(width, height) {
  const maxLife = 48 + Math.random() * 96;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    speed: 0.65 + Math.random() * 1.25,
    length: 9 + Math.random() * 18,
    life: maxLife,
    maxLife,
    alpha: 0.46 + Math.random() * 0.44
  };
}

// Optimization: Directly modify object properties to avoid garbage collection overhead caused by Object.assign.
function resetParticleInPlace(particle, width, height) {
  const maxLife = 48 + Math.random() * 96;
  particle.x = Math.random() * width;
  particle.y = Math.random() * height;
  particle.speed = 0.65 + Math.random() * 1.25;
  particle.length = 9 + Math.random() * 18;
  particle.life = maxLife;
  particle.maxLife = maxLife;
  particle.alpha = 0.46 + Math.random() * 0.44;
}

function isExpired(particle, width, height) {
  return (
      particle.life <= 0 ||
      particle.x < -20 ||
      particle.x > width + 20 ||
      particle.y < -20 ||
      particle.y > height + 20
  );
}