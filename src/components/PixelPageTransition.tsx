"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

type PixelPageTransitionProps = {
  onCovered: () => void;
  onComplete: () => void;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function PixelPageTransition({ onCovered, onComplete }: PixelPageTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCoveredRef = useRef(onCovered);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCoveredRef.current = onCovered;
    onCompleteRef.current = onComplete;
  }, [onComplete, onCovered]);

  useGSAP(
    () => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;

      const motion = { progress: 0 };
      let width = 0;
      let height = 0;
      let cellSize = 16;

      const draw = () => {
        context.clearRect(0, 0, width, height);
        if (motion.progress <= 0) return;

        const columns = Math.ceil(width / cellSize);
        const rows = Math.ceil(height / cellSize);
        const centerX = columns / 2;
        const centerY = rows / 2;
        const furthestDistance = Math.hypot(centerX, centerY) || 1;

        context.fillStyle = "#292929";

        for (let row = 0; row < rows; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            const distance = Math.hypot(column + 0.5 - centerX, row + 0.5 - centerY);
            const normalizedDistance = Math.min(distance / furthestDistance, 1);
            const start = (1 - normalizedDistance) * 0.78;
            const localProgress = clamp01((motion.progress - start) / 0.22);
            if (localProgress <= 0) continue;

            const easedProgress = 1 - Math.pow(1 - localProgress, 3);
            const pixelSize = cellSize * easedProgress;
            const x = column * cellSize + (cellSize - pixelSize) / 2;
            const y = row * cellSize + (cellSize - pixelSize) / 2;
            context.fillRect(x, y, Math.ceil(pixelSize + 0.35), Math.ceil(pixelSize + 0.35));
          }
        }
      };

      const resize = () => {
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        cellSize = width <= 720 ? 12 : 16;
        canvas.width = Math.ceil(width * pixelRatio);
        canvas.height = Math.ceil(height * pixelRatio);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.imageSmoothingEnabled = false;
        draw();
      };

      resize();
      window.addEventListener("resize", resize);

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const timeline = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => onCompleteRef.current(),
      });

      if (reducedMotion) {
        timeline
          .set(motion, { progress: 1, onUpdate: draw })
          .call(() => onCoveredRef.current())
          .set(motion, { progress: 0, onUpdate: draw });
      } else {
        timeline
          .addLabel("collapse")
          .to(motion, {
            progress: 1,
            duration: 0.92,
            ease: "power2.inOut",
            onUpdate: draw,
          }, "collapse")
          .call(() => onCoveredRef.current())
          .addLabel("reveal", "+=0.1")
          .to(motion, {
            progress: 0,
            duration: 1.02,
            ease: "power2.inOut",
            onUpdate: draw,
          }, "reveal");
      }

      return () => {
        window.removeEventListener("resize", resize);
        timeline.kill();
      };
    },
    { scope: canvasRef },
  );

  return <canvas className="pixel-page-transition" ref={canvasRef} aria-hidden="true" />;
}
