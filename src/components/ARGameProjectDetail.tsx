"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  layoutNextLineRange,
  materializeLineRange,
  prepareWithSegments,
  type LayoutCursor,
} from "@chenglou/pretext";
import { Bounds, Center, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type ARGameProjectDetailProps = {
  isTransitioning: boolean;
  onBack: () => void;
};

type ModelSilhouetteBin = {
  maxX: number;
  minX: number;
  y: number;
};

type PretextFlowTextProps = {
  className?: string;
  modelRef: React.RefObject<HTMLDivElement | null>;
  scrollerRef: React.RefObject<HTMLElement | null>;
  side: "left" | "right";
  silhouetteRef: React.RefObject<ModelSilhouetteBin[]>;
  tag?: "h2" | "h3" | "p";
  text: string;
};

type PretextFlowLine = {
  text: string;
};

function measureImageSilhouette(image: HTMLImageElement): ModelSilhouetteBin[] {
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  if (!sourceWidth || !sourceHeight) return [];

  const canvas = document.createElement("canvas");
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [];

  try {
    context.drawImage(image, 0, 0, sourceWidth, sourceHeight);
    const alpha = context.getImageData(0, 0, sourceWidth, sourceHeight).data;
    const binCount = 128;
    const silhouette: ModelSilhouetteBin[] = [];

    for (let bin = 0; bin < binCount; bin += 1) {
      const yStart = Math.floor((bin / binCount) * sourceHeight);
      const yEnd = Math.min(sourceHeight, Math.ceil(((bin + 1) / binCount) * sourceHeight));
      let minX = sourceWidth;
      let maxX = -1;
      for (let y = yStart; y < yEnd; y += 1) {
        for (let x = 0; x < sourceWidth; x += 2) {
          if (alpha[(y * sourceWidth + x) * 4 + 3] < 24) continue;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        }
      }
      if (maxX < 0) continue;
      silhouette.push({
        minX: minX / sourceWidth,
        maxX: (maxX + 1) / sourceWidth,
        y: ((yStart + yEnd) * 0.5) / sourceHeight,
      });
    }
    return silhouette;
  } catch {
    return [];
  }
}

function PretextFlowText({
  className,
  modelRef,
  scrollerRef,
  side,
  silhouetteRef,
  tag = "p",
  text,
}: PretextFlowTextProps) {
  const elementRef = useRef<HTMLElement | null>(null);
  const signatureRef = useRef("");
  const lineOffsetsRef = useRef(new Map<HTMLElement, number>());
  const [lines, setLines] = useState<PretextFlowLine[]>([{ text }]);

  useLayoutEffect(() => {
    const paragraph = elementRef.current;
    if (!paragraph) return;

    let frame = 0;
    let disposed = false;

    const layoutParagraph = () => {
      frame = 0;
      if (disposed) return;

      const paragraphRect = paragraph.getBoundingClientRect();
      const style = getComputedStyle(paragraph);
      const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const letterSpacing = Number.parseFloat(style.letterSpacing) || 0;
      const prepared = prepareWithSegments(text, font, { letterSpacing });
      const fixedLines: PretextFlowLine[] = [];
      let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
      let lineIndex = 0;

      while (lineIndex < 80) {
        const lineRange = layoutNextLineRange(prepared, cursor, paragraphRect.width);
        if (!lineRange) break;

        const line = materializeLineRange(prepared, lineRange);
        fixedLines.push({ text: line.text });
        cursor = lineRange.end;
        lineIndex += 1;
      }

      const signature = fixedLines.map((line) => line.text).join("|");
      if (signature && signature !== signatureRef.current) {
        signatureRef.current = signature;
        setLines(fixedLines);
      }
    };

    const scheduleLayout = () => {
      if (frame) return;
      frame = requestAnimationFrame(layoutParagraph);
    };

    const resizeObserver = new ResizeObserver(scheduleLayout);
    resizeObserver.observe(paragraph);
    window.addEventListener("resize", scheduleLayout, { passive: true });
    document.fonts.ready.then(scheduleLayout);
    scheduleLayout();

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleLayout);
    };
  }, [text]);

  useLayoutEffect(() => {
    const paragraph = elementRef.current;
    const model = modelRef.current;
    const scroller = scrollerRef.current;
    if (!paragraph || !model || !scroller) return;

    const lineElements = Array.from(paragraph.querySelectorAll<HTMLElement>(".ar-game-pretext-line"));
    const offsets = lineOffsetsRef.current;

    const updateClearance = () => {
      if (window.innerWidth <= 760) {
        lineElements.forEach((line) => {
          offsets.set(line, 0);
          line.style.transform = "translate3d(0,0,0)";
        });
        return;
      }

      const image = model.querySelector<HTMLImageElement>(".ar-game-model-image");
      const silhouette = silhouetteRef.current;
      if (!image || silhouette.length === 0 || !image.naturalWidth || !image.naturalHeight) return;

      const bounds = image.getBoundingClientRect();
      const imageRatio = image.naturalWidth / image.naturalHeight;
      const boundsRatio = bounds.width / bounds.height;
      const drawnWidth = boundsRatio > imageRatio ? bounds.height * imageRatio : bounds.width;
      const drawnHeight = boundsRatio > imageRatio ? bounds.height : bounds.width / imageRatio;
      const drawnLeft = bounds.left + (bounds.width - drawnWidth) * 0.5;
      const drawnTop = bounds.top + (bounds.height - drawnHeight) * 0.5;
      const projected = silhouette.map((bin) => ({
        minX: drawnLeft + bin.minX * drawnWidth,
        maxX: drawnLeft + bin.maxX * drawnWidth,
        y: drawnTop + bin.y * drawnHeight,
      }));
      const binStep = projected.length > 1
        ? Math.abs(projected[1].y - projected[0].y)
        : drawnHeight / 128;
      const measurements = lineElements.map((line) => {
        const offset = offsets.get(line) ?? 0;
        const rect = line.getBoundingClientRect();
        return {
          baseLeft: rect.left - offset,
          baseRight: rect.right - offset,
          centerY: (rect.top + rect.bottom) * 0.5,
          halfHeight: Math.max(6, rect.height * 0.5),
          line,
        };
      });

      const nextOffsets = measurements.map((measurement) => {
        const verticalMargin = measurement.halfHeight + Math.max(5, binStep * 2.25);
        const intersectingBins = projected.filter(
          (bin) => Math.abs(bin.y - measurement.centerY) <= verticalMargin,
        );
        if (intersectingBins.length === 0) return 0;

        const obstacleMinX = Math.min(...intersectingBins.map((bin) => bin.minX));
        const obstacleMaxX = Math.max(...intersectingBins.map((bin) => bin.maxX));
        const gap = Math.max(24, window.innerWidth * 0.0215);
        const overlaps = measurement.baseRight > obstacleMinX - gap
          && measurement.baseLeft < obstacleMaxX + gap;
        if (!overlaps) return 0;

        return side === "right"
          ? Math.max(0, obstacleMaxX + gap - measurement.baseLeft)
          : Math.min(0, obstacleMinX - gap - measurement.baseRight);
      });

      lineElements.forEach((line, index) => {
        const offset = Math.round(nextOffsets[index] * 10) / 10;
        offsets.set(line, offset);
        line.style.transform = `translate3d(${offset}px,0,0)`;
      });
    };

    gsap.ticker.add(updateClearance);
    updateClearance();

    return () => {
      gsap.ticker.remove(updateClearance);
      lineElements.forEach((line) => {
        offsets.delete(line);
        line.style.removeProperty("transform");
      });
    };
  }, [lines, modelRef, scrollerRef, side, silhouetteRef]);

  const content = lines.map((line, index) => (
    <span
      aria-hidden="true"
      className="ar-game-pretext-line"
      key={`${index}-${line.text}`}
    >
      {line.text}
    </span>
  ));

  const composedClassName = `ar-game-pretext${className ? ` ${className}` : ""}`;
  const setElementRef = (node: HTMLElement | null) => {
    elementRef.current = node;
  };

  if (tag === "h2") {
    return <h2 className={composedClassName} ref={setElementRef} aria-label={text}>{content}</h2>;
  }

  if (tag === "h3") {
    return <h3 className={composedClassName} ref={setElementRef} aria-label={text}>{content}</h3>;
  }

  return (
    <p className={composedClassName} ref={setElementRef} aria-label={text}>{content}</p>
  );
}

function createFurSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 48;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(24, 24, 2, 24, 24, 23);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.32, "rgba(255,255,255,.86)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 48, 48);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

type ColorMaterial = THREE.Material & {
  color?: THREE.Color;
  map?: THREE.Texture | null;
};

function createTexturePixelSampler(texture: THREE.Texture | null | undefined) {
  const image = texture?.image as CanvasImageSource & { width?: number; height?: number };
  const width = Math.floor(Number(image?.width ?? 0));
  const height = Math.floor(Number(image?.height ?? 0));
  if (!texture || !image || width < 1 || height < 1) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  try {
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const transformedUv = new THREE.Vector2();

    return (uv: THREE.Vector2, target: THREE.Color) => {
      transformedUv.copy(uv);
      texture.transformUv(transformedUv);
      const x = THREE.MathUtils.clamp(Math.round(transformedUv.x * (width - 1)), 0, width - 1);
      const y = THREE.MathUtils.clamp(Math.round(transformedUv.y * (height - 1)), 0, height - 1);
      const offset = (y * width + x) * 4;
      target.setRGB(pixels[offset] / 255, pixels[offset + 1] / 255, pixels[offset + 2] / 255);
      if (texture.colorSpace === THREE.SRGBColorSpace) target.convertSRGBToLinear();
      return target;
    };
  } catch {
    return null;
  }
}

function VirusFamily({
  onReady,
  onSilhouetteChange,
}: {
  onReady: () => void;
  onSilhouetteChange: (silhouette: ModelSilhouetteBin[]) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const silhouetteFrameRef = useRef(0);
  const silhouetteSignatureRef = useRef("");
  const { scene } = useGLTF("/projects/ar-game/virus-family.glb");
  const model = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    const furSprite = createFurSprite();
    const furLayers: Array<THREE.Points | THREE.LineSegments> = [];

    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.frustumCulled = true;
      object.castShadow = false;
      object.receiveShadow = false;

      const sourceMaterial = (Array.isArray(object.material) ? object.material[0] : object.material) as ColorMaterial;
      const materialName = sourceMaterial?.name.toLowerCase() ?? "";
      if (!/(body|worm)/.test(materialName) || !object.geometry.attributes.position) return;

      object.geometry.computeBoundingBox();
      const bounds = object.geometry.boundingBox;
      const diagonal = bounds ? bounds.getSize(new THREE.Vector3()).length() : 1;
      const sampleCount = THREE.MathUtils.clamp(
        Math.round(object.geometry.attributes.position.count * 1.85),
        3500,
        11000,
      );
      const positions = new Float32Array(sampleCount * 3);
      const colors = new Float32Array(sampleCount * 3);
      const strands = new Float32Array(sampleCount * 6);
      const strandColors = new Float32Array(sampleCount * 6);
      const sampler = new MeshSurfaceSampler(object).build();
      const position = new THREE.Vector3();
      const normal = new THREE.Vector3();
      const uv = new THREE.Vector2();
      const sampledColor = new THREE.Color();
      const textureColor = new THREE.Color();
      const baseColor = sourceMaterial.color instanceof THREE.Color
        ? sourceMaterial.color.clone()
        : new THREE.Color("#f4f1ea");
      const textureSampler = createTexturePixelSampler(sourceMaterial.map);
      const hasVertexColors = Boolean(object.geometry.getAttribute("color"));

      for (let index = 0; index < sampleCount; index += 1) {
        sampledColor.copy(baseColor);
        sampler.sample(position, normal, hasVertexColors ? sampledColor : undefined, uv);
        if (hasVertexColors) sampledColor.multiply(baseColor);
        if (textureSampler) {
          textureSampler(uv, textureColor);
          sampledColor.copy(textureColor).multiply(baseColor);
        }
        sampledColor.lerp(new THREE.Color("#ffffff"), 0.025);

        const rootOffset = diagonal * 0.002;
        const strand = diagonal * (0.012 + Math.random() * 0.022);
        const rootX = position.x + normal.x * rootOffset;
        const rootY = position.y + normal.y * rootOffset;
        const rootZ = position.z + normal.z * rootOffset;
        const tipX = position.x + normal.x * strand;
        const tipY = position.y + normal.y * strand;
        const tipZ = position.z + normal.z * strand;
        positions[index * 3] = tipX;
        positions[index * 3 + 1] = tipY;
        positions[index * 3 + 2] = tipZ;
        colors[index * 3] = sampledColor.r;
        colors[index * 3 + 1] = sampledColor.g;
        colors[index * 3 + 2] = sampledColor.b;
        strands[index * 6] = rootX;
        strands[index * 6 + 1] = rootY;
        strands[index * 6 + 2] = rootZ;
        strands[index * 6 + 3] = tipX;
        strands[index * 6 + 4] = tipY;
        strands[index * 6 + 5] = tipZ;
        strandColors[index * 6] = sampledColor.r;
        strandColors[index * 6 + 1] = sampledColor.g;
        strandColors[index * 6 + 2] = sampledColor.b;
        strandColors[index * 6 + 3] = sampledColor.r;
        strandColors[index * 6 + 4] = sampledColor.g;
        strandColors[index * 6 + 5] = sampledColor.b;
      }

      const furGeometry = new THREE.BufferGeometry();
      furGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      furGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const furMaterial = new THREE.PointsMaterial({
        alphaTest: 0.025,
        color: "#ffffff",
        depthWrite: false,
        map: furSprite,
        opacity: 0.84,
        size: THREE.MathUtils.clamp(diagonal * 0.027, 0.03, 0.18),
        sizeAttenuation: true,
        transparent: true,
        vertexColors: true,
      });
      const fur = new THREE.Points(furGeometry, furMaterial);
      fur.name = "procedural-fur";
      object.add(fur);
      furLayers.push(fur);

      const strandGeometry = new THREE.BufferGeometry();
      strandGeometry.setAttribute("position", new THREE.BufferAttribute(strands, 3));
      strandGeometry.setAttribute("color", new THREE.BufferAttribute(strandColors, 3));
      const strandMaterial = new THREE.LineBasicMaterial({
        color: "#ffffff",
        depthWrite: false,
        opacity: 0.3,
        transparent: true,
        vertexColors: true,
      });
      const strandLayer = new THREE.LineSegments(strandGeometry, strandMaterial);
      strandLayer.name = "procedural-fur-strands";
      object.add(strandLayer);
      furLayers.push(strandLayer);
    });
    onReady();

    return () => {
      furLayers.forEach((fur) => {
        fur.removeFromParent();
        fur.geometry.dispose();
        (fur.material as THREE.Material).dispose();
      });
      furSprite.dispose();
    };
  }, [model, onReady]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const targetX = -state.pointer.y * 0.085;
    const targetY = state.pointer.x * 0.14;
    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, targetX, 4.5, delta);
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetY, 4.5, delta);
    group.position.x = THREE.MathUtils.damp(group.position.x, state.pointer.x * 0.035, 4, delta);
    group.position.y = THREE.MathUtils.damp(group.position.y, state.pointer.y * 0.025, 4, delta);

    silhouetteFrameRef.current += 1;
    if (silhouetteFrameRef.current % 8 !== 0) return;

    const canvasRect = state.gl.domElement.getBoundingClientRect();
    if (canvasRect.width <= 0 || canvasRect.height <= 0) return;

    const binCount = 64;
    const minByBin = new Float32Array(binCount).fill(Number.POSITIVE_INFINITY);
    const maxByBin = new Float32Array(binCount).fill(Number.NEGATIVE_INFINITY);
    const projected = new THREE.Vector3();
    state.scene.updateMatrixWorld(true);
    state.camera.updateMatrixWorld(true);

    model.traverse((object) => {
      if (
        !(object instanceof THREE.Mesh) &&
        !(object instanceof THREE.Points) &&
        !(object instanceof THREE.LineSegments)
      ) return;
      if (!object.visible) return;
      const positionAttribute = object.geometry.attributes.position;
      if (!positionAttribute) return;
      const step = Math.max(1, Math.ceil(positionAttribute.count / 2800));

      for (let index = 0; index < positionAttribute.count; index += step) {
        projected.fromBufferAttribute(positionAttribute, index);
        object.localToWorld(projected);
        projected.project(state.camera);
        if (projected.z < -1 || projected.z > 1) continue;

        const x = canvasRect.left + (projected.x + 1) * 0.5 * canvasRect.width;
        const y = canvasRect.top + (1 - projected.y) * 0.5 * canvasRect.height;
        const bin = Math.floor(((y - canvasRect.top) / canvasRect.height) * binCount);
        for (let neighbour = Math.max(0, bin - 1); neighbour <= Math.min(binCount - 1, bin + 1); neighbour += 1) {
          minByBin[neighbour] = Math.min(minByBin[neighbour], x);
          maxByBin[neighbour] = Math.max(maxByBin[neighbour], x);
        }
      }
    });

    const silhouette: ModelSilhouetteBin[] = [];
    const binHeight = canvasRect.height / binCount;
    for (let index = 0; index < binCount; index += 1) {
      if (!Number.isFinite(minByBin[index]) || !Number.isFinite(maxByBin[index])) continue;
      let minX = minByBin[index];
      let maxX = maxByBin[index];
      for (let neighbour = Math.max(0, index - 1); neighbour <= Math.min(binCount - 1, index + 1); neighbour += 1) {
        if (!Number.isFinite(minByBin[neighbour])) continue;
        minX = Math.min(minX, minByBin[neighbour]);
        maxX = Math.max(maxX, maxByBin[neighbour]);
      }
      silhouette.push({
        maxX,
        minX,
        y: canvasRect.top + (index + 0.5) * binHeight,
      });
    }

    const signature = silhouette
      .map((bin) => `${Math.round(bin.minX / 6)}:${Math.round(bin.maxX / 6)}`)
      .join("|");
    if (signature !== silhouetteSignatureRef.current) {
      silhouetteSignatureRef.current = signature;
      onSilhouetteChange(silhouette);
    }
  });

  return (
    <Bounds fit clip observe margin={0.88}>
      <Center>
        <group ref={groupRef} rotation={[0.02, -0.04, 0]}>
          <primitive object={model} />
        </group>
      </Center>
    </Bounds>
  );
}

useGLTF.preload("/projects/ar-game/virus-family.glb");

export function ARGameProjectDetail({
  isTransitioning,
  onBack,
}: ARGameProjectDetailProps) {
  const rootRef = useRef<HTMLElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const modelJourneyRef = useRef<HTMLElement>(null);
  const modelShellRef = useRef<HTMLDivElement>(null);
  const modelSilhouetteRef = useRef<ModelSilhouetteBin[]>([]);
  const handleImageLoad = useCallback((image: HTMLImageElement) => {
    const silhouette = measureImageSilhouette(image);
    modelSilhouetteRef.current = silhouette;
    window.dispatchEvent(new Event("ar-model-silhouette"));
  }, []);

  useEffect(() => {
    const shell = modelShellRef.current;
    const image = shell?.querySelector<HTMLImageElement>(".ar-game-model-image");
    if (!shell || !image) return;
    const refreshSilhouette = () => handleImageLoad(image);
    const observer = new ResizeObserver(refreshSilhouette);
    observer.observe(shell);
    if (image.complete) refreshSilhouette();
    window.addEventListener("resize", refreshSilhouette, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", refreshSilhouette);
    };
  }, [handleImageLoad]);

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
      const journey = modelJourneyRef.current;
      if (!root || !journey) return;
      const updateTextClearance = () => window.dispatchEvent(new Event("ar-model-silhouette"));

      gsap.utils.toArray<HTMLElement>(".ar-game-copy-block").forEach((block) => {
        gsap.fromTo(
          block,
          { yPercent: 14 },
          {
            yPercent: -14,
            ease: "none",
            scrollTrigger: {
              trigger: block,
              scroller: root,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
              onUpdate: updateTextClearance,
            },
          },
        );
      });

      gsap.fromTo(
        ".ar-game-model-shell",
        { opacity: 0, scale: 0.94 },
        {
          opacity: 1,
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: journey,
            scroller: root,
            start: "top 72%",
            end: "top 28%",
            scrub: true,
          },
        },
      );
    },
    { scope: rootRef },
  );

  return (
    <section className="project-detail-view ar-game-detail" ref={rootRef} aria-label="AR Game project detail">
      <header className="project-detail-header ar-game-detail-header">
        <button
          className="project-detail-back"
          ref={backRef}
          type="button"
          disabled={isTransitioning}
          onClick={onBack}
        >
          &larr; Back
        </button>
        <p>03 / 06</p>
      </header>

      <main className="ar-game-main">
        <section className="ar-game-opening" aria-label="Hygiene Heroes introduction">
          <div className="ar-game-hero-stage" aria-hidden="true">
            <img className="ar-game-hero-composite" src="/projects/ar-game/hero-composite.png" alt="" />
          </div>

          <div className="ar-game-intro-copy">
            <img className="ar-game-title-image" src="/projects/ar-game/title.png" alt="Hygiene Heroes" />
            <h1>&ndash;An AR educational game</h1>
            <p>
              Hygiene Hero is an AR hygiene education game designed for children. By visualizing germs in
              everyday environments, children can understand how germs spread while exploring, cleaning,
              and collecting rewards, gradually developing good habits of proactive cleaning and maintaining
              hygiene.
            </p>
          </div>
        </section>

        <section className="ar-game-model-journey" ref={modelJourneyRef} aria-label="Interactive germ characters">
          <div className="ar-game-model-sticky">
            <div
              className="ar-game-model-shell"
              ref={modelShellRef}
            >
              <img
                className="ar-game-model-image"
                src="/projects/ar-game/virus-family.png"
                alt="Seven colorful germ characters"
                onLoad={(event) => handleImageLoad(event.currentTarget)}
              />
            </div>
            <p className="ar-game-pointer-note" aria-hidden="true">Scroll to read</p>
          </div>

          <div className="ar-game-copy-track">
            <article className="ar-game-copy-block ar-game-copy-right ar-game-copy-step-1">
              <PretextFlowText
                modelRef={modelShellRef}
                scrollerRef={rootRef}
                side="right"
                silhouetteRef={modelSilhouetteRef}
                tag="h2"
                text="Make the invisible visible."
              />
              <PretextFlowText
                modelRef={modelShellRef}
                scrollerRef={rootRef}
                side="right"
                silhouetteRef={modelSilhouetteRef}
                text="Germs are everywhere, yet they are difficult for children to understand because they cannot be seen. Hygiene Hero transforms invisible hygiene risks into playful visual experiences, helping children recognize where germs may exist and how their actions can prevent them from spreading."
              />
            </article>

            <article className="ar-game-copy-block ar-game-copy-left ar-game-copy-step-2">
              <PretextFlowText
                className="ar-game-health-word"
                modelRef={modelShellRef}
                scrollerRef={rootRef}
                side="left"
                silhouetteRef={modelSilhouetteRef}
                tag="h2"
                text="Health"
              />
              <PretextFlowText
                modelRef={modelShellRef}
                scrollerRef={rootRef}
                side="left"
                silhouetteRef={modelSilhouetteRef}
                tag="h3"
                text="Building awareness through everyday interactions."
              />
              <PretextFlowText
                modelRef={modelShellRef}
                scrollerRef={rootRef}
                side="left"
                silhouetteRef={modelSilhouetteRef}
                text="Instead of presenting hygiene as a set of rules, the experience allows children to discover why cleaning matters through direct interaction with their surroundings. Healthy behavior becomes something they can observe, practice, and understand."
              />
            </article>

            <article className="ar-game-copy-block ar-game-copy-right ar-game-copy-step-3">
              <PretextFlowText
                modelRef={modelShellRef}
                scrollerRef={rootRef}
                side="right"
                silhouetteRef={modelSilhouetteRef}
                tag="h2"
                text="Children"
              />
              <PretextFlowText
                modelRef={modelShellRef}
                scrollerRef={rootRef}
                side="right"
                silhouetteRef={modelSilhouetteRef}
                tag="h3"
                text="Learning through curiosity and play."
              />
              <PretextFlowText
                modelRef={modelShellRef}
                scrollerRef={rootRef}
                side="right"
                silhouetteRef={modelSilhouetteRef}
                text="Children explore familiar environments, discover hidden germs, and complete cleaning challenges. By turning hygiene education into an active experience, learning becomes driven by curiosity rather than instruction."
              />
            </article>

            <article className="ar-game-copy-block ar-game-copy-left ar-game-copy-step-4">
              <PretextFlowText
                modelRef={modelShellRef}
                scrollerRef={rootRef}
                side="left"
                silhouetteRef={modelSilhouetteRef}
                tag="h2"
                text="Education"
              />
              <PretextFlowText
                modelRef={modelShellRef}
                scrollerRef={rootRef}
                side="left"
                silhouetteRef={modelSilhouetteRef}
                tag="h3"
                text="From knowledge to habit."
              />
              <PretextFlowText
                modelRef={modelShellRef}
                scrollerRef={rootRef}
                side="left"
                silhouetteRef={modelSilhouetteRef}
                text="The goal is not only to teach children what germs are, but to help them connect knowledge with everyday behavior. Repeated interaction, feedback, and rewards encourage children to gradually build proactive hygiene habits."
              />
            </article>

            <article className="ar-game-copy-block ar-game-copy-right ar-game-copy-step-5 ar-game-principles">
              <PretextFlowText modelRef={modelShellRef} scrollerRef={rootRef} side="right" silhouetteRef={modelSilhouetteRef} tag="h3" text="Visualize — Make invisible germs visible." />
              <PretextFlowText modelRef={modelShellRef} scrollerRef={rootRef} side="right" silhouetteRef={modelSilhouetteRef} tag="h3" text="Explore — Encourage children to discover hygiene risks in everyday environments." />
              <PretextFlowText modelRef={modelShellRef} scrollerRef={rootRef} side="right" silhouetteRef={modelSilhouetteRef} tag="h3" text="Clean — Turn cleaning actions into simple and engaging interactions." />
              <PretextFlowText modelRef={modelShellRef} scrollerRef={rootRef} side="right" silhouetteRef={modelSilhouetteRef} tag="h3" text="Reward — Create positive feedback through collection and achievement." />
              <PretextFlowText modelRef={modelShellRef} scrollerRef={rootRef} side="right" silhouetteRef={modelSilhouetteRef} tag="h3" text="Habit — Transform repeated play into everyday hygiene awareness." />
            </article>

            <article className="ar-game-copy-block ar-game-copy-left ar-game-copy-step-6">
              <PretextFlowText modelRef={modelShellRef} scrollerRef={rootRef} side="left" silhouetteRef={modelSilhouetteRef} tag="h2" text="See. Explore. Clean. Learn." />
              <PretextFlowText modelRef={modelShellRef} scrollerRef={rootRef} side="left" silhouetteRef={modelSilhouetteRef} text="A playful learning cycle designed to help children understand how germs spread while developing healthier habits through interaction." />
            </article>

            <article className="ar-game-copy-block ar-game-copy-right ar-game-copy-step-7">
              <PretextFlowText modelRef={modelShellRef} scrollerRef={rootRef} side="right" silhouetteRef={modelSilhouetteRef} tag="h2" text="From invisible risks to visible actions." />
              <PretextFlowText modelRef={modelShellRef} scrollerRef={rootRef} side="right" silhouetteRef={modelSilhouetteRef} text="Hygiene Hero bridges digital interaction and everyday behavior, turning abstract hygiene knowledge into something children can actively experience." />
            </article>

            <article className="ar-game-copy-block ar-game-copy-left ar-game-copy-step-8 ar-game-project-tags">
              <PretextFlowText modelRef={modelShellRef} scrollerRef={rootRef} side="left" silhouetteRef={modelSilhouetteRef} tag="h2" text="UX/UI Design · Mobile App · Game Design" />
              <PretextFlowText modelRef={modelShellRef} scrollerRef={rootRef} side="left" silhouetteRef={modelSilhouetteRef} text="Hygiene Hero is an AR hygiene education game designed for children. By visualizing germs in everyday environments, children can understand how germs spread while exploring, cleaning, and collecting rewards, gradually developing proactive cleaning habits and stronger hygiene awareness." />
            </article>
          </div>
        </section>
      </main>
    </section>
  );
}
