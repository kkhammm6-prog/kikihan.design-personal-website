"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { OriginalLanyard } from "@/components/OriginalLanyard";

type Point = { x: number; y: number };

export function WechatBadgeModal({ onClose, origin }: { onClose: () => void; origin: Point }) {
  const [entered, setEntered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => { setMounted(true); }, []);

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
    <div className={`wechat-modal ${entered ? "is-entered" : ""} ${closing ? "is-closing" : ""}`} style={{ "--reveal-x": `${origin.x}px`, "--reveal-y": `${origin.y}px` } as CSSProperties} role="presentation">
      <button className="wechat-modal-close" type="button" onClick={handleClose} disabled={closing} aria-label="Close WeChat card">Close</button>
      <div
        className="wechat-lanyard"
        role="dialog"
        aria-modal="true"
        aria-label="WeChat contact card"
      >
        <OriginalLanyard />
      </div>
    </div>
  , document.body);
}
