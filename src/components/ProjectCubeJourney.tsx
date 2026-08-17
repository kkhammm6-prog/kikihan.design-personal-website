"use client";

import { useRef, type CSSProperties } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BayerDiamondBackground } from "@/components/BayerDiamondBackground";
import { AsciiOglBackground } from "@/components/AsciiOglBackground";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const faces = [
  { side: "front", index: "01", title: "Web Design", image: "/cube/project-01-web.png" },
  { side: "right", index: "02", title: "App & Wearable device", image: "/cube/project-02-app.png" },
  { side: "back", index: "03", title: "AR Game", image: "/cube/project-03-ar-game.png" },
  { side: "left", index: "04", title: "AIGC IP Design", image: "/cube/project-04-aigc-ip-design.png" },
  { side: "top", index: "05", title: "AI video", image: "/cube/project-05-aigc-video.png" },
  { side: "bottom", index: "06", title: "Vibe Coding", image: "/cube/project-06-vibe-coding.png" },
];

const aboutStatement = [
  "A designer specializing in UX/UI, 3D design, and animation, crafting engaging digital experiences through design and technology.",
  "Exploring AI tools and workflows to improve efficiency and push the boundaries of creative production.",
];

export function ProjectCubeJourney() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!rootRef.current) return;

      const cube = ".project-cube";
      const cubeScale = ".project-cube-scale";
      const labels = gsap.utils.toArray<HTMLElement>(".cube-project-label");
      const typeTexts = gsap.utils.toArray<HTMLElement>(".cube-project-title-text");
      const scrollContainer = document.querySelector<HTMLElement>(".site-scroll-container");
      const mm = gsap.matchMedia();
      const getHeroHeight = () => document.querySelector<HTMLElement>(".hero")?.offsetHeight ?? window.innerHeight * 0.9;

      mm.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
          motionOK: "(prefers-reduced-motion: no-preference)",
        },
        (context) => {
          const { reduceMotion } = context.conditions as { reduceMotion: boolean };

          gsap.set(labels, { autoAlpha: 0, y: 14 });
          gsap.set(typeTexts, { width: 0 });
          gsap.set(".ascii-ogl-canvas", { autoAlpha: 1, yPercent: 100 });
          gsap.set(".bayer-diamond-canvas", { autoAlpha: 1 });
          gsap.set(".cube-about-reveal", { clipPath: "inset(0 100% 0 0)" });

          if (reduceMotion) {
            gsap.set(cube, { autoAlpha: 1, rotationX: -10, rotationY: 28 });
            gsap.set(cubeScale, { "--cube-scale": 0.82 });
            gsap.set(".ascii-ogl-canvas", { autoAlpha: 1, yPercent: 0 });
            gsap.set(".cube-journey", {
              "--scene-fg": "#0b0b0b",
              "--scene-muted": "rgba(11, 11, 11, 0.58)",
              "--scene-line": "rgba(11, 11, 11, 0.18)",
            });
            gsap.set(".cube-act-two", { autoAlpha: 0 });
            gsap.set(".cube-act-three", { autoAlpha: 1 });
            gsap.set(".cube-about-reveal", { clipPath: "inset(0 0% 0 0)" });
            gsap.set(labels[0], { autoAlpha: 1, y: 0 });
            gsap.set(typeTexts[0], { width: `${faces[0].title.length}ch` });
            return;
          }

          gsap.set(cube, {
            autoAlpha: 1,
            z: 0,
            rotationX: -22,
            rotationY: 35,
            rotationZ: 0,
          });
          gsap.set(cubeScale, { "--cube-scale": 0.16 });

          const statementReveal = gsap.to(".cube-about-reveal", {
            clipPath: "inset(0 0% 0 0)",
            duration: 2,
            ease: "power1.out",
            paused: true,
          });

          ScrollTrigger.create({
            trigger: rootRef.current,
            scroller: scrollContainer,
            start: () => `top+=${getHeroHeight() * 0.4} top`,
            animation: statementReveal,
            toggleActions: "restart none none reset",
            invalidateOnRefresh: true,
          });

          const timeline = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: rootRef.current,
              scroller: scrollContainer,
              start: () => `top+=${getHeroHeight() * 0.4} top`,
              end: () => `+=${window.innerHeight * 8}`,
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          });

          timeline
            .to(cube, {
              rotationX: -112,
              rotationY: 215,
              duration: 1.25,
            }, 0)
            .to(cubeScale, { "--cube-scale": 0.16, duration: 1.25 }, 0)
            .to(cube, {
              rotationX: 0,
              rotationY: 0,
              duration: 1.25,
              ease: "power2.inOut",
            }, 1.25)
            .to(cubeScale, { "--cube-scale": 0.92, duration: 1.25, ease: "power2.inOut" }, 1.25)
            .to(".ascii-ogl-canvas", { yPercent: 0, duration: 0.75, ease: "power2.inOut" }, 1.35)
            .to(".cube-journey", {
              "--scene-fg": "#0b0b0b",
              "--scene-muted": "rgba(11, 11, 11, 0.58)",
              "--scene-line": "rgba(11, 11, 11, 0.18)",
              duration: 0.55,
            }, 1.45)
            .to(".cube-act-two", { autoAlpha: 0, y: -14, duration: 0.28 }, 1.55)
            .fromTo(".cube-act-three", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.32 }, 1.82)
            .to(labels[0], { autoAlpha: 1, y: 0, duration: 0.25 }, 1.9)
            .to(typeTexts[0], {
              width: `${faces[0].title.length}ch`,
              duration: 0.32,
              ease: `steps(${faces[0].title.length})`,
            }, 1.9);

          const views = [
            { x: 0, y: -90, label: 1 },
            { x: 0, y: -180, label: 2 },
            { x: 0, y: -270, label: 3 },
            { x: -90, y: -360, label: 4 },
            { x: 90, y: -360, label: 5 },
          ];

          views.forEach((view, viewIndex) => {
            const at = 2.7 + viewIndex * 1.05;
            timeline
              .to(labels[view.label - 1], { autoAlpha: 0, y: -14, duration: 0.18 }, at)
              .to(cube, { rotationX: view.x, rotationY: view.y, duration: 0.72, ease: "power2.inOut" }, at)
              .to(labels[view.label], { autoAlpha: 1, y: 0, duration: 0.2 }, at + 0.52)
              .to(typeTexts[view.label], {
                width: `${faces[view.label].title.length}ch`,
                duration: 0.32,
                ease: `steps(${faces[view.label].title.length})`,
              }, at + 0.52)
              .to({}, { duration: 0.33 });
          });
        },
      );

      document.fonts?.ready.then(() => ScrollTrigger.refresh());

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section className="cube-journey-shell" ref={rootRef} aria-labelledby="cube-journey-title">
      <span className="cube-work-anchor" aria-hidden="true" />
      <div className="cube-journey">
        <BayerDiamondBackground />
        <AsciiOglBackground />

        <div className="cube-journey-copy cube-act-two">
          <span>02 / Object study</span>
          <p>Scroll controls the object</p>
        </div>
        <div className="cube-journey-copy cube-act-three">
          <span>03 / Selected work</span>
          <p>Six faces / Six projects</p>
        </div>

        <div className="cube-about-statement cube-act-two">
          {aboutStatement.map((paragraph) => (
            <div className="cube-about-row" key={paragraph}>
              <p>{paragraph}</p>
              <p className="cube-about-reveal" aria-hidden="true">{paragraph}</p>
            </div>
          ))}
        </div>

        <div className="cube-stage">
          <div className="project-cube-scale">
            <div className="project-cube" aria-hidden="true">
              {faces.map((face) => (
                <article className={`cube-face cube-face--${face.side} cube-face--project-${face.index}`} key={face.side}>
                  <img className="cube-face-image" src={face.image} alt="" draggable={false} />
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="cube-project-labels" aria-live="off">
          {faces.map((face) => (
            <div className="cube-project-label" key={face.index}>
              <span>{face.index} / 06</span>
              <h2 id={face.index === "01" ? "cube-journey-title" : undefined}>
                <span
                  className="cube-project-type"
                  style={{ "--project-title-width": `${face.title.length}ch` } as CSSProperties}
                >
                  <span className="cube-project-title-text">{face.title}</span>
                  <span className="cube-project-cursor" aria-hidden="true" />
                </span>
              </h2>
              <p>Content to be added</p>
            </div>
          ))}
        </div>

        <p className="cube-scroll-note">Keep scrolling to rotate</p>
      </div>
    </section>
  );
}
