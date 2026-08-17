"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

type Point = { x: number; y: number };

export function AboutModal({ onClose, origin }: { onClose: () => void; origin: Point }) {
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let enterFrame = 0;
    const mountFrame = requestAnimationFrame(() => {
      enterFrame = requestAnimationFrame(() => setEntered(true));
    });
    return () => { cancelAnimationFrame(mountFrame); cancelAnimationFrame(enterFrame); };
  }, [mounted]);

  const handleClose = () => {
    if (closing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setClosing(true);
    closeTimer.current = setTimeout(onClose, 2450);
  };

  if (!mounted) return null;
  return createPortal(
    <div className={`about-modal ${entered ? "is-entered" : ""} ${closing ? "is-closing" : ""}`} style={{ "--reveal-x": `${origin.x}px`, "--reveal-y": `${origin.y}px` } as CSSProperties} role="presentation">
      <button className="about-modal-close" type="button" onClick={handleClose} disabled={closing} aria-label="Close About dialog">Close</button>
      <section className="about-modal-panel" role="dialog" aria-modal="true" aria-labelledby="about-modal-title">
        <h2 className="about-card-name" id="about-modal-title">Weiqi Han（Kiki）</h2>
        <p className="about-card-role">UXUI Designer</p>

        <h3 className="about-card-heading about-card-education">Education Experience</h3>
        <div className="about-card-entry about-card-cityu">
          <strong>City University of Hong Kong&nbsp; / &nbsp;2025–2027</strong>
          <span>Creative Media (Human–Computer Interaction)</span>
          <span>Master&apos;s Degree</span>
        </div>
        <div className="about-card-entry about-card-scut">
          <strong>South China University of Technology&nbsp; / &nbsp;2020–2025</strong>
          <span>Architecture</span>
          <span>Bachelor&apos;s Degree</span>
        </div>

        <h3 className="about-card-heading about-card-internship">Intern Experience</h3>
        <div className="about-card-entry about-card-owlto">
          <strong>Owlto Finance&nbsp; / &nbsp;04.2026–Now</strong>
          <span>UX/UI intern</span>
        </div>
        <div className="about-card-entry about-card-airudder">
          <strong>AI Rudder Pte. Ltd.&nbsp; / &nbsp;07.2025–02.2026</strong>
          <span>UI intern</span>
        </div>

        <h3 className="about-card-heading about-card-award">Award</h3>
        <div className="about-card-entry about-card-pacificvis">
          <strong>IEEE PacificVis 2026 Visual Data Storytelling Competition</strong>
          <span>Honorable&nbsp; Mention&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;12/2025–04/2026</span>
        </div>
        <div className="about-card-entry about-card-milan">
          <strong>8th Milan Design Week China University Design Discipline Faculty and&nbsp; Student Excellent Works Exhibition</strong>
          <span>Provincial second prize and national third prize&nbsp;&nbsp;&nbsp;09/2023–06/2024</span>
        </div>
      </section>
    </div>,
    document.body,
  );
}
