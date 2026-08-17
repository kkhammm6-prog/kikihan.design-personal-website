"use client";

import { useCallback, useState, type MouseEvent } from "react";
import { SdfLensSquare } from "@/components/SdfLensSquare";
import { StickerRain } from "@/components/StickerRain";
import { WechatBadgeModal } from "@/components/WechatBadgeModal";
import { AboutModal } from "@/components/AboutModal";

export function HeroVisual() {
  const [squareHovered, setSquareHovered] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [wechatOpen, setWechatOpen] = useState(false);
  const [wechatOrigin, setWechatOrigin] = useState({ x: 0, y: 0 });
  const [aboutOrigin, setAboutOrigin] = useState({ x: 0, y: 0 });
  const changeHover = useCallback((hovered: boolean) => setSquareHovered(hovered), []);

  return (
    <div className="hero-visual-stack">
      <StickerRain speedMultiplier={squareHovered ? 0.18 : 1} />
      <div className="square-glass-mask" aria-hidden="true" />
      <SdfLensSquare onHoverChange={changeHover} />
      <p className="hero-tagline">MIXING INTERACTIONS, CODE, &amp; IMAGINATION</p>
      <button className="hero-side-button hero-about-button" type="button" onClick={(event: MouseEvent<HTMLButtonElement>) => { const rect = event.currentTarget.getBoundingClientRect(); setAboutOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }); setAboutOpen(true); }}>About</button>
      <button className="hero-side-button hero-wechat-button" type="button" onClick={(event: MouseEvent<HTMLButtonElement>) => { const rect = event.currentTarget.getBoundingClientRect(); setWechatOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }); setWechatOpen(true); }}>WeChat</button>
      {aboutOpen && <AboutModal origin={aboutOrigin} onClose={() => setAboutOpen(false)} />}
      {wechatOpen && <WechatBadgeModal origin={wechatOrigin} onClose={() => setWechatOpen(false)} />}
    </div>
  );
}
