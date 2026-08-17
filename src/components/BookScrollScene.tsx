"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PixelPageTransition } from "@/components/PixelPageTransition";
import { ProjectDetailView } from "@/components/ProjectDetailView";
import { WebDesignProjectDetail } from "@/components/WebDesignProjectDetail";
import { AppWearableProjectDetail } from "@/components/AppWearableProjectDetail";
import { AIVideoProjectDetail } from "@/components/AIVideoProjectDetail";
import { VibeCodingProjectDetail } from "@/components/VibeCodingProjectDetail";
import { ARGameProjectDetail } from "@/components/ARGameProjectDetail";
import { AIGCIPProjectDetail } from "@/components/AIGCIPProjectDetail";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const projects = [
  { title: "Web Design", image: "/book/web-design.png", spine: "rgb(255, 255, 255)", ink: "#070707" },
  { title: "App & Wearable device", image: "/book/app-wearable.png", spine: "rgb(28, 28, 28)", ink: "#f4f1ea" },
  { title: "AR Game", image: "/book/ar-game.png", spine: "rgb(117, 88, 96)", ink: "#080808" },
  { title: "AIGC IP Design", image: "/book/aigc-ip-design.png", spine: "rgb(61, 61, 50)", ink: "#f4f1ea" },
  { title: "AI video", image: "/book/ai-video.png", spine: "rgb(143, 136, 37)", ink: "#080808" },
  { title: "Vibe Coding", image: "/book/vibe-coding.png", spine: "rgb(145, 141, 141)", ink: "#080808" },
];

const shelfShift = (index: number) => (2.5 - index) * 64;
const titleLetters = "PROJECTS".split("");
const projectScrollStep = 400;

export function BookScrollScene() {
  const rootRef = useRef<HTMLElement>(null);
  const transitionIdRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [transition, setTransition] = useState<{ id: number; target: number | null } | null>(null);

  const scrollToProject = (index: number) => {
    const root = rootRef.current;
    const scrollContainer = document.querySelector<HTMLElement>(".site-scroll-container");
    if (!root || !scrollContainer || index === activeIndex || transition) return;

    const rootTop = scrollContainer.scrollTop
      + root.getBoundingClientRect().top
      - scrollContainer.getBoundingClientRect().top;

    scrollContainer.scrollTo({
      top: rootTop + index * projectScrollStep + projectScrollStep / 2,
      behavior: "smooth",
    });
  };

  const startPageTransition = useCallback((target: number | null) => {
    setTransition((current) => {
      if (current) return current;
      transitionIdRef.current += 1;
      return { id: transitionIdRef.current, target };
    });
  }, []);

  const handleProjectClick = (index: number) => {
    if (transition) return;
    if (index === activeIndex) {
      startPageTransition(index);
      return;
    }
    scrollToProject(index);
  };

  const handleProjectKeyDown = (event: KeyboardEvent<HTMLElement>, index: number) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleProjectClick(index);
  };

  const handleTransitionCovered = useCallback(() => {
    if (!transition) return;
    setSelectedProject(transition.target);
  }, [transition]);

  const handleTransitionComplete = useCallback(() => {
    setTransition(null);
    if (selectedProject === null) {
      rootRef.current
        ?.querySelector<HTMLElement>(`[data-project-index="${activeIndex}"]`)
        ?.focus({ preventScroll: true });
    }
  }, [activeIndex, selectedProject]);

  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>(".site-scroll-container");
    if (!scrollContainer || (selectedProject === null && !transition)) return;

    const previousOverflow = scrollContainer.style.overflowY;
    scrollContainer.style.overflowY = "hidden";
    return () => {
      scrollContainer.style.overflowY = previousOverflow;
    };
  }, [selectedProject, transition]);

  useGSAP(
    (_context, contextSafe) => {
      if (!rootRef.current || !contextSafe) return;

      const scrollContainer = document.querySelector<HTMLElement>(".site-scroll-container");
      const items = gsap.utils.toArray<HTMLElement>(".project-book-item");
      const books = gsap.utils.toArray<HTMLElement>(".project-book-object");
      const labels = gsap.utils.toArray<HTMLElement>(".book-project-label");
      const headingLetters = gsap.utils.toArray<HTMLElement>(".book-scene-title-letter");
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set([".book-scene-background", ".book-scene-foreground"], { autoAlpha: 1, yPercent: 0 });
        gsap.set(headingLetters, { autoAlpha: 1, yPercent: 0 });
        gsap.set(items, { width: 44, autoAlpha: 1, y: 0 });
        gsap.set(books, { rotationY: 0, transformPerspective: 1200 });
        gsap.set(items[0], { width: 235 });
        gsap.set(books[0], { rotationY: -75 });
        gsap.set(".project-bookshelf", { x: shelfShift(0) });
        gsap.set(labels, { autoAlpha: 0 });
        gsap.set(labels[0], { autoAlpha: 1 });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".book-scene-background",
          { autoAlpha: 0, yPercent: -10 },
          {
            autoAlpha: 1,
            yPercent: 0,
            ease: "none",
            scrollTrigger: {
              trigger: rootRef.current,
              scroller: scrollContainer,
              start: "top bottom",
              end: "top top",
              scrub: 0.45,
              invalidateOnRefresh: true,
            },
          },
        );

        gsap.set(headingLetters, { autoAlpha: 0, yPercent: -140 });
        gsap.set(items, { autoAlpha: 0, y: 180 });
        gsap.set([".book-project-labels", ".book-scroll-note"], { autoAlpha: 0 });

        const entranceTimeline = gsap.timeline({
          paused: true,
          scrollTrigger: {
            trigger: rootRef.current,
            scroller: scrollContainer,
            start: "top 85%",
            toggleActions: "play none none reverse",
            invalidateOnRefresh: true,
          },
        });

        entranceTimeline
          .to(
            headingLetters,
            {
              autoAlpha: 1,
              yPercent: 0,
              duration: 0.48,
              ease: "power3.out",
              stagger: 0.217,
            },
            0,
          )
          .to(
            items,
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.55,
              ease: "power3.out",
              stagger: 0.29,
            },
            0,
          )
          .to(
            [".book-project-labels", ".book-scroll-note"],
            { autoAlpha: 1, duration: 0.35, ease: "none" },
            1.65,
          );

        gsap.set(items, { width: 44 });
        gsap.set(books, { rotationY: 0, transformPerspective: 1200 });
        gsap.set(items[0], { width: 235 });
        gsap.set(books[0], { rotationY: -75 });
        gsap.set(".project-bookshelf", { x: shelfShift(0) });
        gsap.set(labels, { autoAlpha: 0, y: 8 });
        gsap.set(labels[0], { autoAlpha: 1, y: 0 });

        const animateTo = contextSafe((activeIndex: number) => {
          setActiveIndex(activeIndex);
          gsap.timeline({ defaults: { duration: 0.58, ease: "expo.out", overwrite: "auto" } })
            .to(items, { width: (index) => index === activeIndex ? 235 : 44 }, 0)
            .to(books, {
              rotationY: (index) => index === activeIndex ? -75 : 0,
              transformPerspective: 1200,
            }, 0)
            .to(".project-bookshelf", { x: shelfShift(activeIndex) }, 0)
            .to(labels, {
              autoAlpha: (index) => index === activeIndex ? 1 : 0,
              y: (index) => index === activeIndex ? 0 : index < activeIndex ? -8 : 8,
              duration: 0.24,
            }, 0.18);
        });

        for (let index = 1; index < projects.length; index += 1) {
          ScrollTrigger.create({
            trigger: rootRef.current,
            scroller: scrollContainer,
            start: `top+=${index * projectScrollStep} top`,
            onEnter: () => animateTo(index),
            onLeaveBack: () => animateTo(index - 1),
            invalidateOnRefresh: true,
          });
        }
      });

      document.fonts?.ready.then(() => ScrollTrigger.refresh());

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section className="book-journey-shell" id="work" ref={rootRef} aria-label="Project archive">
      <div className="book-scene">
        <div className="book-scene-background" aria-hidden="true" />

        <div className="book-scene-title" aria-hidden="true">
          {titleLetters.map((letter, index) => (
            <span className="book-scene-title-letter" key={`${letter}-${index}`}>
              <i className={letter === "O" ? "book-scene-title-o" : undefined}>{letter}</i>
            </span>
          ))}
        </div>

        <div className="book-scene-foreground">
          <div className="project-books-stage" aria-label="Six project books controlled by scrolling">
            <div className="project-bookshelf">
              {projects.map((project, index) => (
                <article
                  className="project-book-item"
                  key={project.title}
                  data-project-index={index}
                  role="button"
                  tabIndex={0}
                  aria-current={index === activeIndex ? "true" : undefined}
                  aria-label={`${index === activeIndex ? "View" : "Open"} project ${String(index + 1).padStart(2, "0")}: ${project.title}`}
                  onClick={() => handleProjectClick(index)}
                  onKeyDown={(event) => handleProjectKeyDown(event, index)}
                  style={{
                    "--book-spine": project.spine,
                    "--book-ink": project.ink,
                  } as CSSProperties}
                >
                  <div className="project-book-object">
                    <div className="project-book-spine">
                      <span className="project-book-spine-texture" aria-hidden="true" />
                      <span className="project-book-spine-background" aria-hidden="true" />
                      <div className="project-book-spine-text-wrap">
                        <span className="project-book-spine-text">{project.title}</span>
                      </div>
                    </div>
                    <div className="project-book-cover">
                      <img src={project.image} alt="" draggable={false} />
                      <span className="project-book-highlight" aria-hidden="true" />
                      <span className="project-book-texture" aria-hidden="true" />
                    </div>
                  </div>
                  <span className="sr-only">Project {String(index + 1).padStart(2, "0")}: {project.title}</span>
                </article>
              ))}
            </div>
          </div>

          <div className="book-project-labels" aria-live="off">
            {projects.map((project, index) => (
              <div className="book-project-label" key={project.title}>
                <span>{String(index + 1).padStart(2, "0")} / 06</span>
                <strong>{project.title}</strong>
              </div>
            ))}
          </div>

          <p className="book-scroll-note">Scroll to open · click to view</p>
        </div>
      </div>

      {typeof document !== "undefined" && (selectedProject !== null || transition) && createPortal(
        <>
          {selectedProject !== null && (
            selectedProject === 0 ? (
              <WebDesignProjectDetail
                isTransitioning={Boolean(transition)}
                onBack={() => startPageTransition(null)}
              />
            ) : selectedProject === 1 ? (
              <AppWearableProjectDetail
                isTransitioning={Boolean(transition)}
                onBack={() => startPageTransition(null)}
              />
            ) : selectedProject === 2 ? (
              <ARGameProjectDetail
                isTransitioning={Boolean(transition)}
                onBack={() => startPageTransition(null)}
              />
            ) : selectedProject === 3 ? (
              <AIGCIPProjectDetail
                isTransitioning={Boolean(transition)}
                onBack={() => startPageTransition(null)}
              />
            ) : selectedProject === 4 ? (
              <AIVideoProjectDetail
                isTransitioning={Boolean(transition)}
                onBack={() => startPageTransition(null)}
              />
            ) : selectedProject === 5 ? (
              <VibeCodingProjectDetail
                isTransitioning={Boolean(transition)}
                onBack={() => startPageTransition(null)}
              />
            ) : (
              <ProjectDetailView
                index={selectedProject}
                project={projects[selectedProject]}
                isTransitioning={Boolean(transition)}
                onBack={() => startPageTransition(null)}
              />
            )
          )}
          {transition && (
            <PixelPageTransition
              key={transition.id}
              onCovered={handleTransitionCovered}
              onComplete={handleTransitionComplete}
            />
          )}
        </>,
        document.body,
      )}
    </section>
  );
}
