# StickerRain Specification

## Overview

- **Target files:** `src/components/StickerRain.tsx`, `preview.html`
- **Reference:** `https://haoqi.design/` home-page sticker particle layer.
- **Interaction model:** Time-driven falling particles. The foreground square controls the speed through hover state.

## Source-verified reference behavior

- Reference uses individual transparent PNG textures (`s_01.png` through `s_12.png`) packed into a texture atlas.
- Base reference configuration: `spawnWidth: 32`, `spawnHeight: 24`, `positionY: 24`, `fallDistance: 48`, `windStrength: 1.8`, `windFrequency: 0.3`, `scale: 1.4`, `rotationSpeed: 0.8`, `fallSpeed: 1.8`.
- Each particle receives random horizontal offset, start height, fall speed multiplier `0.6…1.4`, rotation, rotation speed, wind phase, and wind amplitude.
- On each frame: Y decreases, X drifts using `sin(time * windFrequency + phase) * windAmplitude`, rotation increases, and opacity fades during the first 5% and final 10% of its trip.
- Base particles recycle with a different texture after leaving the fall distance.
- **Local override:** click bursts are intentionally disabled. When the pointer is over the foreground SDF square, every falling and rotating update is multiplied by `0.18`; it returns to `1` after the pointer leaves.
- The hover hit area is the rounded-square interior only; the surrounding transparent canvas does not alter particle speed.
- A glass mask sits between the sticker layer and the SDF contour. It uses a translucent dark tint, 9px backdrop blur, lowered saturation, and inner highlights so stickers soften when crossing the square interior.

## Local asset plan

- User-cut source files: `C:\Users\82540\Desktop\portfolio\website\sticker\1.png` … `12.png` (no `8.png`).
- Project copies: `public/stickers/user-cut/1.png` … `12.png` (no `8.png`).
- The user-provided alpha edges are retained without further image generation or modification.

## Responsive behavior

- Desktop: all 11 stickers appear once across the full hero canvas before recycling begins.
- Mobile: 7 stickers, reduced scale and horizontal spread to retain readable motion.
- Reduced motion: a static, low-density sticker composition; click burst disabled.
