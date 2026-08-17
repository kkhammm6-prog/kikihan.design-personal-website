"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AboutModal } from "@/components/AboutModal";
import { SdfLensTriangle } from "@/components/SdfLensTriangle";
import { StickerRain } from "@/components/StickerRain";
import { WechatBadgeModal } from "@/components/WechatBadgeModal";

const contacts = {
  gmail: "kkhammm6@gmail.com",
  mail163: "weiqihan0120@163.com",
};

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function ContactVisual() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [triangleHovered, setTriangleHovered] = useState(false);
  const [stickersStarted, setStickersStarted] = useState(false);
  const [stickersEmitting, setStickersEmitting] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [wechatOpen, setWechatOpen] = useState(false);
  const [aboutOrigin, setAboutOrigin] = useState({ x: 0, y: 0 });
  const [wechatOrigin, setWechatOrigin] = useState({ x: 0, y: 0 });
  const [copiedMessage, setCopiedMessage] = useState("");
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const changeHover = useCallback((hovered: boolean) => setTriangleHovered(hovered), []);

  useEffect(() => () => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
  }, []);

  // Keep sticker activation tied to the actual scroll container as a fallback for
  // browsers where ScrollTrigger's enter callback is not refreshed after hash navigation.
  useEffect(() => {
    const contactSection = rootRef.current?.closest<HTMLElement>(".contact-hero");
    const scrollContainer = document.querySelector<HTMLElement>(".site-scroll-container");
    if (!contactSection || !scrollContainer) return;

    const syncStickerRain = () => {
      const sectionBounds = contactSection.getBoundingClientRect();
      const containerBounds = scrollContainer.getBoundingClientRect();
      const hasFullyEntered = sectionBounds.top <= containerBounds.top + 4
        && sectionBounds.bottom > containerBounds.top + 4;

      if (hasFullyEntered) setStickersStarted(true);
      setStickersEmitting(hasFullyEntered);
      if (!hasFullyEntered && sectionBounds.top > containerBounds.top) setTriangleHovered(false);
    };

    syncStickerRain();
    scrollContainer.addEventListener("scroll", syncStickerRain, { passive: true });
    window.addEventListener("resize", syncStickerRain);
    return () => {
      scrollContainer.removeEventListener("scroll", syncStickerRain);
      window.removeEventListener("resize", syncStickerRain);
    };
  }, []);

  useGSAP(() => {
    const contactSection = rootRef.current?.closest<HTMLElement>(".contact-hero");
    const scrollContainer = document.querySelector<HTMLElement>(".site-scroll-container");
    if (!contactSection || !scrollContainer) return;

    ScrollTrigger.create({
      trigger: contactSection,
      scroller: scrollContainer,
      start: "top top",
      end: "bottom top",
      onEnter: () => {
        setStickersStarted(true);
        setStickersEmitting(true);
      },
      onEnterBack: () => {
        setStickersStarted(true);
        setStickersEmitting(true);
      },
      onLeaveBack: () => {
        setTriangleHovered(false);
        setStickersEmitting(false);
      },
      onRefresh: (self) => {
        const shouldEmit = self.scroll() >= self.start;
        if (shouldEmit) setStickersStarted(true);
        if (!shouldEmit) setTriangleHovered(false);
        setStickersEmitting(shouldEmit);
      },
      invalidateOnRefresh: true,
    });
  }, { scope: rootRef });

  const copyEmail = async (email: string, label: string) => {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = email;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }

    setCopiedMessage(`${label} COPIED`);
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setCopiedMessage(""), 1800);
  };

  return (
    <div className="contact-visual-stack" ref={rootRef}>
      {stickersStarted && (
        <StickerRain
          speedMultiplier={triangleHovered ? 0.18 : 1}
          startFromTop
          emitting={stickersEmitting}
        />
      )}
      <div className="triangle-glass-mask" aria-hidden="true" />
      <SdfLensTriangle onHoverChange={changeHover} />
      <button
        className="hero-side-button hero-about-button"
        type="button"
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setAboutOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
          setAboutOpen(true);
        }}
      >
        About
      </button>
      <button
        className="hero-side-button hero-wechat-button"
        type="button"
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setWechatOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
          setWechatOpen(true);
        }}
      >
        WeChat
      </button>
      {aboutOpen && <AboutModal origin={aboutOrigin} onClose={() => setAboutOpen(false)} />}
      {wechatOpen && <WechatBadgeModal origin={wechatOrigin} onClose={() => setWechatOpen(false)} />}

      <div className="contact-footer-line">
        <p>Design &amp; Dev by Weiqi Han</p>
        <nav aria-label="Contact links">
          <button type="button" onClick={() => copyEmail(contacts.gmail, "GMAIL")}>Gmail</button>
          <button type="button" onClick={() => copyEmail(contacts.mail163, "163 MAIL")}>163 Mail</button>
          <a href="https://www.linkedin.com/in/weiqi-han-16064a2b6/" target="_blank" rel="noreferrer">LinkedIn</a>
        </nav>
      </div>

      <p className={`contact-copy-toast${copiedMessage ? " is-visible" : ""}`} role="status" aria-live="polite">
        {copiedMessage}
      </p>
    </div>
  );
}
