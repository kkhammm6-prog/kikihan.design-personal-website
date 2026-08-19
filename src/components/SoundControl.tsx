"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

const noteSymbols = ["♪", "♫", "♩", "♬"];

export function SoundControl() {
  const rootRef = useRef<HTMLSpanElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = 0.55;
  }, []);

  useGSAP(
    (_context, contextSafe) => {
      const root = rootRef.current;
      const noteLayer = root?.querySelector<HTMLElement>(".sound-note-layer");
      if (!root || !noteLayer || !isPlaying || !contextSafe) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let noteIndex = 0;

      const spawnNote = contextSafe(() => {
        const note = document.createElement("i");
        note.className = "sound-note";
        note.textContent = noteSymbols[noteIndex % noteSymbols.length];
        noteIndex += 1;
        noteLayer.appendChild(note);

        const horizontalDistance = gsap.utils.random(-28, 28, 1);
        const verticalDistance = reduceMotion ? -12 : gsap.utils.random(-46, -28, 1);

        gsap.fromTo(
          note,
          {
            autoAlpha: 1,
            x: gsap.utils.random(-5, 5, 1),
            y: 2,
            scale: gsap.utils.random(0.72, 0.92, 0.01),
            rotation: gsap.utils.random(-10, 10, 1),
          },
          {
            autoAlpha: 0,
            x: horizontalDistance,
            y: verticalDistance,
            scale: 1,
            rotation: gsap.utils.random(-18, 18, 1),
            duration: reduceMotion ? 0.42 : 1.15,
            ease: "steps(8)",
            onComplete: () => note.remove(),
          },
        );
      });

      spawnNote();
      const noteTimer = window.setInterval(spawnNote, reduceMotion ? 700 : 330);

      return () => {
        window.clearInterval(noteTimer);
        noteLayer.replaceChildren();
      };
    },
    { scope: rootRef, dependencies: [isPlaying], revertOnUpdate: true },
  );

  const toggleSound = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    try {
      await audio.play();
    } catch {
      setIsPlaying(false);
    }
  };

  return (
    <span className="sound-control" ref={rootRef}>
      <button
        className="sound-button"
        type="button"
        aria-label={isPlaying ? "Pause background music" : "Play background music"}
        aria-pressed={isPlaying}
        data-playing={isPlaying ? "true" : "false"}
        onClick={toggleSound}
      >
        <span className="site-nav-label">Sound</span>
        <img className="site-nav-icon" src="/icons/header/sound.svg" alt="" aria-hidden="true" />
        <span className="sound-note-layer" aria-hidden="true" />
      </button>
      <audio
        ref={audioRef}
        src="/audio/puppy-love.mp3"
        preload="metadata"
        loop
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => setIsPlaying(false)}
      />
    </span>
  );
}
