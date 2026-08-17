"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type AppWearableProjectDetailProps = {
  isTransitioning: boolean;
  onBack: () => void;
};

const explosionFrames = Array.from(
  { length: 25 },
  (_, index) => `/projects/app-wearable/explosion/frame-${String(index + 1).padStart(2, "0")}.png`,
);

const appScreens = Array.from(
  { length: 9 },
  (_, index) => `/projects/app-wearable/screens/screen-${String(index + 1).padStart(2, "0")}.png`,
);

export function AppWearableProjectDetail({
  isTransitioning,
  onBack,
}: AppWearableProjectDetailProps) {
  const rootRef = useRef<HTMLElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const explosionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardsRef = useRef<HTMLElement>(null);
  const activeScreenRef = useRef(0);
  const [activeScreen, setActiveScreen] = useState(0);

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

  useGSAP(
    () => {
      const root = rootRef.current;
      const explosion = explosionRef.current;
      const canvas = canvasRef.current;
      const cardJourney = cardsRef.current;
      if (!root || !explosion || !canvas || !cardJourney) return;

      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return;

      const images = explosionFrames.map((source) => {
        const image = new Image();
        image.decoding = "async";
        image.src = source;
        return image;
      });

      let currentFrame = 0;
      let canvasWidth = 0;
      let canvasHeight = 0;

      const drawFrame = (index: number) => {
        currentFrame = Math.max(0, Math.min(images.length - 1, index));
        const image = images[currentFrame];
        if (!image.complete || image.naturalWidth === 0 || canvasWidth === 0 || canvasHeight === 0) return;

        const imageRatio = image.naturalWidth / image.naturalHeight;
        const canvasRatio = canvasWidth / canvasHeight;
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = image.naturalWidth;
        let sourceHeight = image.naturalHeight;

        if (imageRatio > canvasRatio) {
          sourceWidth = image.naturalHeight * canvasRatio;
          sourceX = (image.naturalWidth - sourceWidth) / 2;
        } else {
          sourceHeight = image.naturalWidth / canvasRatio;
          sourceY = (image.naturalHeight - sourceHeight) / 2;
        }

        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.drawImage(
          image,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          canvasWidth,
          canvasHeight,
        );
      };

      const resizeCanvas = () => {
        const bounds = canvas.getBoundingClientRect();
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
        canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
        canvasWidth = canvas.width;
        canvasHeight = canvas.height;
        drawFrame(currentFrame);
      };

      images.forEach((image) => {
        image.onload = () => drawFrame(currentFrame);
      });

      const resizeObserver = new ResizeObserver(resizeCanvas);
      resizeObserver.observe(canvas);
      resizeCanvas();

      const explosionTrigger = ScrollTrigger.create({
        id: "resteasy-explosion-sequence",
        trigger: explosion,
        scroller: root,
        start: "top top",
        end: "bottom bottom",
        invalidateOnRefresh: true,
        refreshPriority: 1,
        onUpdate: (self) => {
          drawFrame(Math.round(self.progress * (images.length - 1)));
        },
      });

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const cards = gsap.utils.toArray<HTMLElement>(".app-bounce-card");
      let cardsTrigger: ScrollTrigger | undefined;

      if (reducedMotion) {
        drawFrame(0);
      } else {
        const cardTimeline = gsap.timeline({ paused: true });
        const cardProgress = { value: 0 };
        const cardDelay = 0.1125;
        const animationEnd = (cards.length - 1) * cardDelay + 0.5;
        const motionPaths = [
          { y: [10, 50, -10, 10], rotation: [20, -10, -45, 20] },
          { y: [0, 47.5, -10, 15], rotation: [-25, 15, -45, 30] },
          { y: [0, 52.5, -10, 5], rotation: [15, -5, -40, 60] },
          { y: [0, 50, 30, -80], rotation: [20, -10, 60, 5] },
          { y: [0, 55, -15, 30], rotation: [25, -15, 60, 95] },
        ];

        cardTimeline.to(cardProgress, {
          value: animationEnd,
          duration: animationEnd,
          ease: "none",
          onUpdate: () => {
            cards.forEach((card, index) => {
              const individualProgress = gsap.utils.clamp(
                0,
                1,
                (cardProgress.value - index * cardDelay) * 2,
              );

              if (individualProgress <= 0) {
                gsap.set(card, { autoAlpha: 0 });
                return;
              }

              const motion = motionPaths[index % motionPaths.length];
              const pathProgress = individualProgress * 3;
              const pathIndex = Math.min(Math.floor(pathProgress), motion.y.length - 2);
              const pathRatio = pathProgress - pathIndex;
              const exitXPercent = -(
                window.innerWidth / Math.max(card.offsetWidth, 1) + 3.5
              ) * 100;

              gsap.set(card, {
                xPercent: gsap.utils.interpolate(25, exitXPercent, individualProgress),
                yPercent: gsap.utils.interpolate(
                  motion.y[pathIndex],
                  motion.y[pathIndex + 1],
                  pathRatio,
                ),
                rotation: gsap.utils.interpolate(
                  motion.rotation[pathIndex],
                  motion.rotation[pathIndex + 1],
                  pathRatio,
                ),
                autoAlpha: 1,
              });
            });

            const nearestIndex = gsap.utils.clamp(
              0,
              cards.length - 1,
              Math.round((cardProgress.value - 0.23) / cardDelay),
            );
            if (nearestIndex === activeScreenRef.current) return;
            activeScreenRef.current = nearestIndex;
            setActiveScreen(nearestIndex);
          },
        });

        cardsTrigger = ScrollTrigger.create({
          id: "resteasy-interface-cards",
          animation: cardTimeline,
          trigger: cardJourney,
          scroller: root,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          invalidateOnRefresh: true,
          refreshPriority: 2,
        });
      }

      document.fonts?.ready.then(() => ScrollTrigger.refresh());

      return () => {
        resizeObserver.disconnect();
        images.forEach((image) => { image.onload = null; });
        explosionTrigger.kill();
        cardsTrigger?.kill();
      };
    },
    { scope: rootRef },
  );

  return (
    <section
      className="project-detail-view app-wearable-detail"
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-wearable-title"
      data-node-id="62:51"
    >
      <header className="project-detail-header app-wearable-detail-header">
        <button
          className="project-detail-back"
          ref={backRef}
          type="button"
          onClick={onBack}
          disabled={isTransitioning}
        >
          <span aria-hidden="true">←</span> Back
        </button>
        <p>02 / 06</p>
      </header>

      <main>
        <section
          className="app-explosion-journey"
          ref={explosionRef}
          aria-label="Exploded view of the RestEasy wearable controlled by scrolling"
          data-node-id="63:56"
        >
          <div className="app-explosion-scene">
            <canvas className="app-explosion-canvas" ref={canvasRef} />
            <p className="sr-only">Scroll to separate the wearable into its component layers.</p>
          </div>
        </section>

        <section className="app-wearable-intro">
          <h1 id="app-wearable-title" data-node-id="62:53">
            RestEasy Sleep Guard
            <span>– Stroke Monitor</span>
          </h1>
          <p data-node-id="62:54">
            This product is a sleep aid and monitoring system designed for stroke-risk
            individuals living alone and their families. It alleviates sleep-related
            psychological stress, detects stroke events during sleep, and automatically
            alerts emergency contacts and hospitals to provide timely assistance.
          </p>
        </section>

        <section
          className="app-card-journey"
          ref={cardsRef}
          aria-label="RestEasy mobile application screens controlled by scrolling"
        >
          <div className="app-card-scene">
            <h2 aria-hidden="true">RESTEASY</h2>
            <div className="app-card-stack">
              {appScreens.map((source, index) => (
                <figure
                  className="app-bounce-card"
                  key={source}
                  style={{ "--app-card-order": index + 1 } as CSSProperties}
                >
                  <img
                    src={source}
                    alt={`RestEasy mobile interface screen ${index + 1}`}
                    draggable={false}
                  />
                </figure>
              ))}
            </div>
            <p className="app-card-progress" aria-live="polite">
              <span>{String(activeScreen + 1).padStart(2, "0")} / 09</span>
              <strong>Mobile interface</strong>
            </p>
          </div>
        </section>
      </main>
    </section>
  );
}
