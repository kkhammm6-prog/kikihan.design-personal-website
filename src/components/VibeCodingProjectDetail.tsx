"use client";

import { useEffect, useRef, type CSSProperties } from "react";

type VibeCodingProjectDetailProps = {
  isTransitioning: boolean;
  onBack: () => void;
};

type RainStream = {
  y: number;
  rate: number;
  burnout: number;
  alpha: number;
  chars: string[];
};

type RainColumn = {
  streams: RainStream[];
  releaseAt: number;
};

const rainCharacters = [..."ｱｲｳｴｵｶｷｸ0123456789ABCDEFｸｿﾝ"];

function AsciiRain({ style }: { style?: CSSProperties }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!wrap || !canvas || !context) return;

    const glyphSize = 10;
    const speed = 6;
    const density = 50;
    const trailLength = 18;
    const gap = glyphSize * (1 + (50 - density) / 12);
    const rate = speed * glyphSize;
    const pickCharacter = () => rainCharacters[Math.floor(Math.random() * rainCharacters.length)];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let alive = true;
    let animationFrame = 0;
    let lastTime = 0;
    let width = 0;
    let height = 0;
    let span = 0;
    let columns: RainColumn[] = [];

    const spawn = (y: number): RainStream => ({
      y,
      rate: rate * (0.75 + Math.random() * 0.5),
      burnout: Math.random() < 0.35 ? Number.POSITIVE_INFINITY : 0.75 + Math.random() * 0.25,
      alpha: 1,
      chars: Array.from({ length: trailLength }, pickCharacter),
    });

    const nextRelease = () => span * (0.3 + Math.random() * 0.5);

    const layout = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = Math.max(1, wrap.clientWidth);
      height = Math.max(1, wrap.clientHeight);
      span = Math.hypot(width, height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Array.from({ length: Math.max(1, Math.ceil(span / gap)) }, () => ({
        streams: [spawn(Math.random() * span)],
        releaseAt: nextRelease(),
      }));
    };

    const draw = (deltaTime: number) => {
      context.clearRect(0, 0, width, height);
      context.save();
      context.translate(width / 2, height / 2);
      context.font = `${glyphSize}px ui-monospace, Menlo, Consolas, monospace`;
      context.textAlign = "center";
      context.textBaseline = "middle";

      const lead = trailLength * glyphSize;
      for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
        const column = columns[columnIndex];
        const x = -span / 2 + columnIndex * gap + gap / 2;

        for (const stream of column.streams) {
          stream.y += stream.rate * deltaTime;
          if (stream.burnout !== Number.POSITIVE_INFINITY && stream.y / span > stream.burnout) {
            stream.alpha -= deltaTime * 1.5;
          }
          if (Math.random() < 0.25) {
            stream.chars[Math.floor(Math.random() * stream.chars.length)] = pickCharacter();
          }

          const headY = -span / 2 + stream.y;
          const streamAlpha = Math.max(0, Math.min(1, stream.alpha));
          for (let glyphIndex = 0; glyphIndex < trailLength; glyphIndex += 1) {
            const y = headY - glyphIndex * glyphSize;
            if (y < -span / 2 - glyphSize || y > span / 2 + glyphSize) continue;
            const taper = glyphIndex === 0 ? 1 : 1 - glyphIndex / trailLength;
            context.globalAlpha = streamAlpha * taper;
            context.fillStyle = glyphIndex === 0 ? "#ffffff" : "#8b6d48";
            context.fillText(stream.chars[glyphIndex], x, y);
          }
        }

        column.streams = column.streams.filter(
          (stream) => stream.alpha > 0 && stream.y - lead <= span,
        );
        const newest = column.streams[column.streams.length - 1];
        if (!newest || newest.y >= column.releaseAt) {
          column.streams.push(spawn(-lead));
          column.releaseAt = nextRelease();
        }
      }

      context.globalAlpha = 1;
      context.restore();
    };

    const loop = (time: number) => {
      if (!alive) return;
      const deltaTime = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 1 / 60;
      lastTime = time;
      draw(deltaTime);
      if (!reducedMotion) animationFrame = requestAnimationFrame(loop);
    };

    layout();
    animationFrame = requestAnimationFrame(loop);
    const resizeObserver = new ResizeObserver(layout);
    resizeObserver.observe(wrap);

    return () => {
      alive = false;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="vibe-ascii-rain" ref={wrapRef} style={style} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}

export function VibeCodingProjectDetail({
  isTransitioning,
  onBack,
}: VibeCodingProjectDetailProps) {
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    backRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || isTransitioning) return;
      event.preventDefault();
      onBack();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTransitioning, onBack]);

  return (
    <section
      className="project-detail-view vibe-coding-detail"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vibe-coding-title"
      data-node-id="71:20"
    >
      <header className="project-detail-header vibe-coding-detail-header">
        <button
          className="project-detail-back"
          ref={backRef}
          type="button"
          onClick={onBack}
          disabled={isTransitioning}
        >
          <span aria-hidden="true">←</span> Back
        </button>
        <p>06 / 06</p>
      </header>

      <main>
        <section className="vibe-rain-hero" aria-label="Automatic ASCII data rain animation">
          <AsciiRain />
        </section>

        <section className="vibe-coding-intro">
          <h1 id="vibe-coding-title" data-node-id="71:21">
            MOOCKYAI
            <span>-Online Learning Platform</span>
          </h1>
          <p data-node-id="71:22">
            MOOCKY is an AI-enhanced online learning platform rebuilt from high-fidelity
            Figma designs with Next.js. I translated the design system into responsive,
            interactive pages, including theme persistence, course exploration, profile
            states, and animated UI interactions. The platform integrates OpenRouter-powered
            AI chat to guide learners toward relevant content and provides a production
            deployment workflow through GitHub and Vercel.
          </p>
        </section>

        <a
          className="vibe-site-entry"
          href="https://moocky-figma-rebuild.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open the MOOCKY online learning platform in a new tab"
          data-node-id="71:33"
        >
          <img
            src="/projects/vibe-coding-site.png"
            alt="MOOCKY online learning platform homepage"
            draggable={false}
          />
          <span>Open live site ↗</span>
        </a>
      </main>
    </section>
  );
}
