"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";

type AIGCIPProjectDetailProps = {
  isTransitioning: boolean;
  onBack: () => void;
};

const trailImageNames = [
  "ChatGPT Image 2026年8月1日 10_47_13 (1).png",
  "ChatGPT Image 2026年8月1日 10_47_13 (2).png",
  "ChatGPT Image 2026年8月1日 10_47_13 (3).png",
  "ChatGPT Image 2026年8月1日 11_20_56.png",
  "ChatGPT Image 2026年8月1日 11_34_10 (2).png",
  "ChatGPT Image 2026年8月1日 11_44_22.png",
  "ChatGPT Image 2026年8月1日 11_49_06.png",
  "ChatGPT Image 2026年8月1日 12_03_09.png",
  "ChatGPT Image 2026年8月1日 12_23_39.png",
  "ChatGPT Image 2026年8月1日 12_53_52.png",
  "ChatGPT Image 2026年8月1日 13_02_19.png",
  "ChatGPT Image 2026年8月1日 13_05_06.png",
  "ChatGPT Image 2026年8月1日 14_47_32.png",
  "ChatGPT Image 2026年8月1日 17_21_47 (2).png",
  "ChatGPT Image 2026年8月1日 17_21_47 (3).png",
  "ChatGPT Image 2026年8月1日 17_21_47 (4).png",
  "ChatGPT Image 2026年8月1日 17_21_48 (5).png",
  "ChatGPT Image 2026年8月1日 17_21_48 (6).png",
  "ChatGPT Image 2026年8月1日 17_21_48 (7).png",
  "ChatGPT Image 2026年8月1日 17_21_48 (8).png",
  "ChatGPT Image 2026年8月1日 17_22_17.png",
  "Gemini_Generated_Image_3agshs3agshs3ags.png",
  "Gemini_Generated_Image_3q7e6v3q7e6v3q7e.png",
  "Gemini_Generated_Image_4ok4y24ok4y24ok4.png",
  "Gemini_Generated_Image_827a67827a67827a.png",
  "Gemini_Generated_Image_c180v9c180v9c180.png",
  "Gemini_Generated_Image_c7urgac7urgac7ur 1.png",
  "Gemini_Generated_Image_cgefvicgefvicgef.png",
  "Gemini_Generated_Image_f31mif31mif31mif.png",
  "Gemini_Generated_Image_fz6mcpfz6mcpfz6m.png",
  "Gemini_Generated_Image_ncrc7oncrc7oncrc.png",
  "Gemini_Generated_Image_qzvtufqzvtufqzvt.png",
  "Gemini_Generated_Image_rzw6trzw6trzw6tr.png",
  "Gemini_Generated_Image_s1s51gs1s51gs1s5.png",
  "Gemini_Generated_Image_s20u93s20u93s20u.png",
  "Gemini_Generated_Image_tjj90ttjj90ttjj9.png",
  "Gemini_Generated_Image_ux6qtgux6qtgux6q.png",
  "Gemini_Generated_Image_woyoi5woyoi5woyo.png",
  "Gemini_Generated_Image_zi383zzi383zzi38.png",
] as const;

const trailImages = trailImageNames.map((name) =>
  `/projects/aigc-ip/trail/${encodeURIComponent(name)}`,
);

function shuffleTrailImages() {
  const shuffled = [...trailImages];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

type TrailImage = {
  id: number;
  image: string;
  x: number;
  y: number;
  rotation: number;
  isLeaving: boolean;
};

export function AIGCIPProjectDetail({
  isTransitioning,
  onBack,
}: AIGCIPProjectDetailProps) {
  const backRef = useRef<HTMLButtonElement>(null);
  const finalVideoRef = useRef<HTMLVideoElement>(null);
  const trailSectionRef = useRef<HTMLElement>(null);
  const finalStartedRef = useRef(false);
  const lastTrailPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastAutoTrailTimeRef = useRef(0);
  const trailQueueRef = useRef<string[]>([]);
  const trailIdRef = useRef(0);
  const trailTimersRef = useRef<number[]>([]);
  const [trailImagesOnScreen, setTrailImagesOnScreen] = useState<TrailImage[]>([]);

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

  useEffect(() => {
    const activeTimers = trailTimersRef.current;
    return () => activeTimers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    const video = finalVideoRef.current;
    if (!video) return;

    const startFinalFilm = () => {
      if (finalStartedRef.current) return;
      finalStartedRef.current = true;

      const play = () => {
        video.currentTime = 0;
        void video.play().catch(() => {
          finalStartedRef.current = false;
        });
      };

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) play();
      else video.addEventListener("canplay", play, { once: true });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) startFinalFilm();
      },
      { threshold: 0.35 },
    );
    observer.observe(video);

    return () => observer.disconnect();
  }, []);

  const holdFinalFrame = useCallback(() => {
    const video = finalVideoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.pause();
    video.currentTime = Math.max(0, video.duration - 0.04);
  }, []);

  const emitTrailImage = useCallback((x: number, y: number) => {
    const id = ++trailIdRef.current;
    if (trailQueueRef.current.length === 0) {
      trailQueueRef.current = shuffleTrailImages();
    }

    const nextImage = trailQueueRef.current.pop();
    if (!nextImage) return;
    const image: TrailImage = {
      id,
      image: nextImage,
      x,
      y,
      rotation: ((id * 13) % 17) - 8,
      isLeaving: false,
    };

    setTrailImagesOnScreen((current) => [...current.slice(-5), image]);

    const fadeTimer = window.setTimeout(() => {
      setTrailImagesOnScreen((current) =>
        current.map((item) => (item.id === id ? { ...item, isLeaving: true } : item)),
      );
    }, 500);
    const removeTimer = window.setTimeout(() => {
      setTrailImagesOnScreen((current) => current.filter((item) => item.id !== id));
    }, 1_250);

    trailTimersRef.current.push(fadeTimer, removeTimer);
  }, []);

  const handleTrailPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "mouse") return;

      const bounds = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      const previous = lastTrailPointRef.current;
      if (previous && Math.hypot(x - previous.x, y - previous.y) < 84) return;

      lastTrailPointRef.current = { x, y };
      emitTrailImage(x, y);
    },
    [emitTrailImage],
  );

  useEffect(() => {
    const createScrollTrail = () => {
      const section = trailSectionRef.current;
      if (!section) return;

      const bounds = section.getBoundingClientRect();
      const visibleTop = Math.max(0, bounds.top);
      const visibleBottom = Math.min(window.innerHeight, bounds.bottom);
      if (visibleBottom - visibleTop < 120) return;

      const now = performance.now();
      if (now - lastAutoTrailTimeRef.current < 220) return;
      lastAutoTrailTimeRef.current = now;

      const id = trailIdRef.current + 1;
      const x = bounds.width * (0.2 + ((id * 0.173) % 0.6));
      const y = Math.max(90, Math.min(bounds.height - 90, window.innerHeight / 2 - bounds.top));
      emitTrailImage(x, y);
    };

    window.addEventListener("scroll", createScrollTrail, true);
    return () => window.removeEventListener("scroll", createScrollTrail, true);
  }, [emitTrailImage]);

  const resetTrailPoint = useCallback(() => {
    lastTrailPointRef.current = null;
  }, []);

  return (
    <section
      className="project-detail-view aigc-ip-detail"
      role="dialog"
      aria-modal="true"
      aria-labelledby="aigc-ip-title"
      data-node-id="91:123"
    >
      <header className="project-detail-header aigc-ip-detail-header">
        <button
          className="project-detail-back"
          ref={backRef}
          type="button"
          onClick={onBack}
          disabled={isTransitioning}
        >
          <span aria-hidden="true">&larr;</span> Back
        </button>
        <p>04 / 06</p>
      </header>

      <main>
        <section className="aigc-ip-hero" aria-label="Potty IP introduction">
          <img
            className="aigc-ip-hero-character"
            src="/projects/aigc-ip/potty-hero.png"
            alt="Potty, a smiling flower-pot character"
            draggable={false}
            data-node-id="91:130"
          />

          <div className="aigc-ip-logo-crop" data-node-id="91:132">
            <img src="/projects/aigc-ip/ipark-logo.png" alt="i-Park" draggable={false} />
          </div>

          <div className="aigc-ip-intro-copy">
            <h1 id="aigc-ip-title" data-node-id="91:124">&ndash;AIGC IP Design</h1>
            <p data-node-id="91:125">
              Potty is the central character IP of the i-Park Urban Park project. Drawing
              inspiration from the image of a potted plant, the design features a friendly and
              lively character that appears across multiple touchpoints—including mobile app
              interfaces, interactive installations, visual communications, and merchandise—to
              build a unified and scalable brand experience system that offers users an urban park
              experience rich in companionship and exploration.
            </p>
          </div>
        </section>

        <section
          className="aigc-ip-image-trail"
          ref={trailSectionRef}
          aria-label="Move your cursor to reveal Potty image studies"
          onPointerMove={handleTrailPointerMove}
          onPointerLeave={resetTrailPoint}
          data-node-id="98:9"
        >
          {trailImagesOnScreen.map((image) => (
            <img
              className={`aigc-ip-trail-image${image.isLeaving ? " is-leaving" : ""}`}
              src={image.image}
              alt=""
              aria-hidden="true"
              draggable={false}
              key={image.id}
              style={{
                left: `${image.x}px`,
                top: `${image.y}px`,
                zIndex: image.id,
                "--trail-rotation": `${image.rotation}deg`,
              } as CSSProperties}
            />
          ))}
        </section>

        <section className="aigc-ip-final-film" aria-label="Potty Park final film" data-node-id="92:152">
          <video
            ref={finalVideoRef}
            src="/projects/aigc-ip/Video-1786454078808.mp4"
            muted
            playsInline
            preload="auto"
            onEnded={holdFinalFrame}
            aria-label="Potty Park campaign film"
          />
        </section>
      </main>
    </section>
  );
}
