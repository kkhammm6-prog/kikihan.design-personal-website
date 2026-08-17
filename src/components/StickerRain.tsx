"use client";

import { useEffect, useRef } from "react";

const stickers = ["1", "2", "3", "4", "5", "6", "7", "9", "10", "11", "12"].map((name) => `/stickers/user-cut/${name}.png`);

type Particle = {
  element: HTMLSpanElement;
  image: HTMLImageElement;
  x: number;
  y: number;
  startY: number;
  speed: number;
  size: number;
  angle: number;
  rotationSpeed: number;
  windPhase: number;
  windAmplitude: number;
  oneShot: boolean;
};

const random = (min: number, max: number) => min + Math.random() * (max - min);

export function StickerRain({
  speedMultiplier = 1,
  startFromTop = false,
  emitting = true,
}: {
  speedMultiplier?: number;
  startFromTop?: boolean;
  emitting?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef(speedMultiplier);
  const emittingRef = useRef(emitting);

  useEffect(() => { speedRef.current = speedMultiplier; }, [speedMultiplier]);
  useEffect(() => { emittingRef.current = emitting; }, [emitting]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let previousTime = performance.now();
    let particles: Particle[] = [];

    const bounds = () => root.getBoundingClientRect();
    const particleCount = () => (window.innerWidth < 720 ? 7 : stickers.length);

    const release = (particle: Particle, oneShot = particle.oneShot, origin?: { x: number; y: number }) => {
      const area = bounds();
      const size = random(window.innerWidth < 720 ? 38 : 52, window.innerWidth < 720 ? 76 : 110);
      particle.size = size;
      particle.oneShot = oneShot;
      particle.x = origin ? origin.x + random(-size * 0.8, size * 0.8) : random(size * 0.2, Math.max(size, area.width - size * 1.2));
      particle.y = origin ? origin.y + random(-size, size * 0.15) : -size - Math.random() * area.height * 0.42;
      particle.startY = particle.y;
      particle.speed = random(area.height * 0.085, area.height * 0.15);
      particle.angle = random(-24, 24);
      particle.rotationSpeed = random(-34, 34);
      particle.windPhase = random(0, Math.PI * 2);
      particle.windAmplitude = random(6, Math.min(38, area.width * 0.05));
      const src = stickers[Math.floor(Math.random() * stickers.length)];
      particle.image.src = src;
      particle.element.style.setProperty("--sticker-art", `url("${src}")`);
      particle.element.style.width = `${size}px`;
    };

    const createParticle = (oneShot = false, origin?: { x: number; y: number }) => {
      const element = document.createElement("span");
      element.className = "sticker-rain-item";
      const image = document.createElement("img");
      image.alt = "";
      image.draggable = false;
      element.appendChild(image);
      root.appendChild(element);
      const particle = { element, image, x: 0, y: 0, startY: 0, speed: 0, size: 0, angle: 0, rotationSpeed: 0, windPhase: 0, windAmplitude: 0, oneShot };
      release(particle, oneShot, origin);
      return particle;
    };

    const reset = () => {
      particles.forEach((particle) => particle.element.remove());
      particles = Array.from({ length: particleCount() }, () => createParticle());
      if (startFromTop) return;

      const area = bounds();
      particles.forEach((particle, index) => {
        const src = stickers[index % stickers.length];
        particle.image.src = src;
        particle.element.style.setProperty("--sticker-art", `url("${src}")`);
        particle.y = random(-particle.size * 0.2, area.height * 0.88);
        particle.startY = particle.y;
      });
    };

    const draw = (now: number) => {
      const delta = Math.min((now - previousTime) / 1000, 0.1);
      previousTime = now;
      const area = bounds();

      particles = particles.filter((particle) => {
        if (!emittingRef.current) particle.oneShot = true;

        if (!prefersReducedMotion) {
          particle.y += particle.speed * delta * speedRef.current;
          particle.x += Math.sin(now * 0.0003 + particle.windPhase) * particle.windAmplitude * delta * speedRef.current;
          particle.angle += particle.rotationSpeed * delta * speedRef.current;
        }

        const entered = Math.min(1, Math.max(0, (particle.y + particle.size) / (particle.size * 1.4)));
        const exited = Math.min(1, Math.max(0, (area.height - particle.y) / (particle.size * 1.4)));
        particle.element.style.opacity = `${Math.min(entered, exited)}`;
        particle.element.style.transform = `translate3d(${particle.x}px, ${particle.y}px, 0) rotate(${particle.angle}deg)`;

        if (particle.y <= area.height + particle.size) return true;
        if (particle.oneShot) {
          particle.element.remove();
          return false;
        }
        release(particle);
        return true;
      });

      if (emittingRef.current) {
        const missing = particleCount() - particles.length;
        for (let index = 0; index < missing; index += 1) particles.push(createParticle());
      }

      frame = window.requestAnimationFrame(draw);
    };

    reset();
    frame = window.requestAnimationFrame(draw);
    window.addEventListener("resize", reset);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", reset);
      particles.forEach((particle) => particle.element.remove());
    };
  }, [startFromTop]);

  return <div ref={rootRef} className="sticker-rain" aria-hidden="true" />;
}
