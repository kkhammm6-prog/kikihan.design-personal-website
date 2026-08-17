"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type WebDesignProjectDetailProps = {
  isTransitioning: boolean;
  onBack: () => void;
};

type CarouselProject = {
  title: string;
  slug: string;
};

const carouselProjects: CarouselProject[] = [
  { title: "Algorithm of Joy", slug: "algorithm-of-joy" },
  { title: "Cyber Omikuji", slug: "cyber-omikuji" },
  { title: "Mfers × Hokusai", slug: "mfers-hokusai" },
  { title: "Midnight Star Seeker", slug: "midnight-star-seeker" },
  { title: "Pepe's Midnight Scream", slug: "pepes-midnight-scream" },
  { title: "Pocket Sun & Moon", slug: "pocket-sun-moon" },
  { title: "The Pump God's Favor", slug: "pump-gods-favor" },
  { title: "Van Gogh's Doge Chronicles", slug: "van-goghs-doge-chronicles" },
];

const assetPath = (slug: string, suffix: "front.png" | "back.png" | "mp4") =>
  suffix === "mp4"
    ? `/projects/web-design/carousel/${slug}.mp4`
    : `/projects/web-design/carousel/${slug}-${suffix}`;

export function WebDesignProjectDetail({
  isTransitioning,
  onBack,
}: WebDesignProjectDetailProps) {
  const rootRef = useRef<HTMLElement>(null);
  const carouselRef = useRef<HTMLElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const activeIndexRef = useRef(0);
  const carouselActiveRef = useRef(false);
  const resolvedRef = useRef(carouselProjects.map(() => false));
  const [activeIndex, setActiveIndex] = useState(0);
  const [resolved, setResolved] = useState(carouselProjects.map(() => false));
  const [flipped, setFlipped] = useState(carouselProjects.map(() => false));

  const stopUnresolvedVideo = useCallback((index: number) => {
    if (resolvedRef.current[index]) return;
    const video = videoRefs.current[index];
    if (!video) return;
    video.pause();
    try {
      video.currentTime = 0;
    } catch {
      // The media metadata may not have loaded yet; loadeddata will still show frame zero.
    }
    gsap.set(video, { autoAlpha: 1 });
  }, []);

  const playVideo = useCallback((index: number) => {
    if (!carouselActiveRef.current || resolvedRef.current[index]) return;
    const video = videoRefs.current[index];
    if (!video) return;
    video.muted = false;
    video.volume = 0.5;
    gsap.set(video, { autoAlpha: 1 });
    void video.play().catch(() => {
      // A rapid scroll can cancel play() while the previous card is being reset.
    });
  }, []);

  const selectProject = useCallback((nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(carouselProjects.length - 1, nextIndex));
    const previousIndex = activeIndexRef.current;
    if (previousIndex !== boundedIndex) stopUnresolvedVideo(previousIndex);
    activeIndexRef.current = boundedIndex;
    setActiveIndex(boundedIndex);
    playVideo(boundedIndex);
  }, [playVideo, stopUnresolvedVideo]);

  const handleVideoEnded = useCallback((index: number) => {
    if (resolvedRef.current[index]) return;
    resolvedRef.current[index] = true;

    const video = videoRefs.current[index];
    if (!video) {
      setResolved((current) => current.map((value, itemIndex) => itemIndex === index || value));
      return;
    }
    gsap.to(video, {
      autoAlpha: 0,
      duration: 0.6,
      ease: "power2.out",
      overwrite: "auto",
      onComplete: () => {
        setResolved((current) => current.map((value, itemIndex) => itemIndex === index || value));
      },
    });
  }, []);

  const toggleCard = useCallback((index: number) => {
    if (index !== activeIndexRef.current || !resolvedRef.current[index]) return;
    setFlipped((current) => current.map((value, itemIndex) => (
      itemIndex === index ? !value : value
    )));
  }, []);

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
      const carousel = carouselRef.current;
      const ring = ringRef.current;
      if (!root || !carousel || !ring) return;

      const card = ring.querySelector<HTMLElement>(".web-carousel-card");
      if (!card) return;

      const updateRadius = () => {
        // Origin UI RoundCarousel geometry: place equally spaced faces on a cylinder.
        const spacingFactor = 1 + 2.8 * 0.15;
        const radius = (card.offsetWidth * spacingFactor)
          / (2 * Math.tan(Math.PI / carouselProjects.length));
        ring.style.setProperty("--web-ring-radius", `${radius}px`);
        gsap.set(ring, { z: -radius });
      };

      updateRadius();
      const resizeObserver = new ResizeObserver(updateRadius);
      resizeObserver.observe(card);

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const scrollProgress = { value: 0 };
      const edgeHold = 0.12;
      const lastIndex = carouselProjects.length - 1;
      const travelRange = 1 - edgeHold * 2;
      const snapPoints = carouselProjects.map((_, index) => (
        edgeHold + (index / lastIndex) * travelRange
      ));

      const snapToNearestCard = (progress: number) => snapPoints.reduce(
        (nearest, point) => (
          Math.abs(point - progress) < Math.abs(nearest - progress) ? point : nearest
        ),
        snapPoints[0],
      );

      const scrollTween = gsap.to(scrollProgress, {
        value: 1,
        ease: "none",
        paused: reducedMotion,
        onUpdate: () => {
          const indexPosition = Math.max(
            0,
            Math.min(lastIndex, ((scrollProgress.value - edgeHold) / travelRange) * lastIndex),
          );
          gsap.set(ring, { rotationY: indexPosition * -45 });
          selectProject(Math.round(indexPosition));
        },
        scrollTrigger: {
          trigger: carousel,
          scroller: root,
          start: "top top",
          end: "bottom bottom",
          scrub: reducedMotion ? false : 0.45,
          snap: reducedMotion ? undefined : {
            snapTo: snapToNearestCard,
            directional: false,
            duration: { min: 0.18, max: 0.42 },
            delay: 0.08,
            ease: "power1.inOut",
          },
          invalidateOnRefresh: true,
          onEnter: () => {
            carouselActiveRef.current = true;
            selectProject(activeIndexRef.current);
          },
          onEnterBack: () => {
            carouselActiveRef.current = true;
            selectProject(activeIndexRef.current);
          },
          onLeave: () => {
            carouselActiveRef.current = false;
            stopUnresolvedVideo(activeIndexRef.current);
          },
          onLeaveBack: () => {
            carouselActiveRef.current = false;
            stopUnresolvedVideo(activeIndexRef.current);
          },
        },
      });

      document.fonts?.ready.then(() => ScrollTrigger.refresh());

      return () => {
        resizeObserver.disconnect();
        scrollTween.kill();
        videoRefs.current.forEach((video, index) => {
          if (!resolvedRef.current[index]) {
            video?.pause();
          }
        });
      };
    },
    { scope: rootRef },
  );

  return (
    <section
      className="project-detail-view web-design-detail"
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="web-design-title"
    >
      <header className="project-detail-header web-design-detail-header">
        <button
          className="project-detail-back"
          ref={backRef}
          type="button"
          onClick={onBack}
          disabled={isTransitioning}
        >
          <span aria-hidden="true">←</span> Back
        </button>
        <p>01 / 06</p>
      </header>

      <main>
        <figure className="web-design-hero" data-node-id="57:11">
          <img
            src="/projects/web-design/pumpbox-hero.png"
            alt="PumpBox online blind box website displayed on a laptop"
            draggable={false}
          />
        </figure>

        <section className="web-design-intro" data-node-id="57:12">
          <h1 id="web-design-title">
            PumpBox
            <span>Online Blind Box Website Design</span>
          </h1>
          <p>
            Project goal: to build an online blind box platform with &quot;low entry
            barriers, high emotional value, and short transaction processes&quot; that
            allows users to obtain online assets through surprise blind box draws,
            providing rich emotional value and a safe, reliable investment experience.
          </p>
        </section>

        <section
          id="pumpbox-carousel"
          className="web-carousel-journey"
          ref={carouselRef}
          aria-label="Eight PumpBox collections controlled by scrolling"
        >
          <div className="web-carousel-scene">
            <div className="web-carousel-stage">
              <div className="web-carousel-ring" ref={ringRef}>
                {carouselProjects.map((project, index) => (
                  <button
                    className={`web-carousel-card${index === activeIndex ? " is-active" : ""}${flipped[index] ? " is-flipped" : ""}${resolved[index] ? " is-resolved" : ""}`}
                    key={project.slug}
                    type="button"
                    tabIndex={index === activeIndex && resolved[index] ? 0 : -1}
                    aria-label={resolved[index]
                      ? `${project.title}, ${flipped[index] ? "back" : "front"}. Click to flip.`
                      : `${project.title} video${index === activeIndex ? " playing" : ""}.`}
                    onClick={() => toggleCard(index)}
                    style={{ "--web-card-angle": `${index * 45}deg` } as CSSProperties}
                  >
                    <span className="web-carousel-card-inner">
                      <span className="web-carousel-card-face web-carousel-card-front">
                        <img
                          src={assetPath(project.slug, "front.png")}
                          alt={`${project.title} card front`}
                          draggable={false}
                        />
                      </span>
                      <span className="web-carousel-card-face web-carousel-card-back">
                        <img
                          src={assetPath(project.slug, "back.png")}
                          alt={`${project.title} card back`}
                          draggable={false}
                        />
                      </span>
                    </span>
                    <video
                      className="web-carousel-video"
                      ref={(element) => { videoRefs.current[index] = element; }}
                      src={assetPath(project.slug, "mp4")}
                      playsInline
                      preload="auto"
                      onEnded={() => handleVideoEnded(index)}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            </div>
            <p className="sr-only" aria-live="polite">
              {carouselProjects[activeIndex].title}. {resolved[activeIndex]
                ? "Video complete. Press the card to flip."
                : "Video ready. Keep this card centered to play."}
            </p>
          </div>
        </section>
      </main>
    </section>
  );
}
