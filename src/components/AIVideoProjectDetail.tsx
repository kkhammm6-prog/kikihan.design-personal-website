"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type AIVideoProjectDetailProps = {
  isTransitioning: boolean;
  onBack: () => void;
};

const tunnelImages = Array.from(
  { length: 10 },
  (_, index) => `/projects/ai-video/tunnel/${index + 41}.png`,
);

const tunnelPalette = ["#ffb000", "#243a93", "#7547ee", "#e42f35", "#0064ac", "#08ad42", "#ff6a00"];

export function AIVideoProjectDetail({
  isTransitioning,
  onBack,
}: AIVideoProjectDetailProps) {
  const rootRef = useRef<HTMLElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const tunnelJourneyRef = useRef<HTMLElement>(null);
  const tunnelCanvasRef = useRef<HTMLCanvasElement>(null);
  const setTunnelProgressRef = useRef<(progress: number) => void>(() => undefined);
  const syncJourneyRef = useRef<HTMLElement>(null);
  const leftVideoRef = useRef<HTMLVideoElement>(null);
  const rightVideoRef = useRef<HTMLVideoElement>(null);

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

  useEffect(() => {
    const canvas = tunnelCanvasRef.current;
    const frame = canvas?.parentElement;
    if (!canvas || !frame) return;

    const scene = new THREE.Scene();
    const background = new THREE.Color("#000000");
    scene.background = background;
    scene.fog = new THREE.Fog(background, 1.4, 16.5);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 80);
    camera.position.set(0, 0, 0.9);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const tunnelWidth = 3.6;
    const tunnelHeight = 2.05;
    const segmentDepth = 1.45;
    const segmentCount = 15;
    const totalDepth = segmentDepth * segmentCount;
    const halfWidth = tunnelWidth / 2;
    const halfHeight = tunnelHeight / 2;
    const gridColumns = 4;
    const gridRows = 3;
    const textureLoader = new THREE.TextureLoader();
    const textures: THREE.Texture[] = [];
    const materials: THREE.Material[] = [];
    const geometries: THREE.BufferGeometry[] = [];

    const lineMaterial = new THREE.LineBasicMaterial({
      color: "#a9a9a9",
      transparent: true,
      opacity: 0.46,
      fog: true,
    });
    materials.push(lineMaterial);

    const gridPoints: THREE.Vector3[] = [];
    const addSegment = (start: THREE.Vector3, end: THREE.Vector3) => {
      gridPoints.push(start, end);
    };

    for (let segment = 0; segment <= segmentCount; segment += 1) {
      const z = -segment * segmentDepth;
      addSegment(new THREE.Vector3(-halfWidth, -halfHeight, z), new THREE.Vector3(halfWidth, -halfHeight, z));
      addSegment(new THREE.Vector3(halfWidth, -halfHeight, z), new THREE.Vector3(halfWidth, halfHeight, z));
      addSegment(new THREE.Vector3(halfWidth, halfHeight, z), new THREE.Vector3(-halfWidth, halfHeight, z));
      addSegment(new THREE.Vector3(-halfWidth, halfHeight, z), new THREE.Vector3(-halfWidth, -halfHeight, z));
    }

    for (let column = 0; column <= gridColumns; column += 1) {
      const x = -halfWidth + (column / gridColumns) * tunnelWidth;
      addSegment(new THREE.Vector3(x, -halfHeight, 0), new THREE.Vector3(x, -halfHeight, -totalDepth));
      addSegment(new THREE.Vector3(x, halfHeight, 0), new THREE.Vector3(x, halfHeight, -totalDepth));
    }
    for (let row = 1; row < gridRows; row += 1) {
      const y = -halfHeight + (row / gridRows) * tunnelHeight;
      addSegment(new THREE.Vector3(-halfWidth, y, 0), new THREE.Vector3(-halfWidth, y, -totalDepth));
      addSegment(new THREE.Vector3(halfWidth, y, 0), new THREE.Vector3(halfWidth, y, -totalDepth));
    }

    const gridGeometry = new THREE.BufferGeometry().setFromPoints(gridPoints);
    const gridLines = new THREE.LineSegments(gridGeometry, lineMaterial);
    scene.add(gridLines);
    geometries.push(gridGeometry);

    const imageMaterials = tunnelImages.map((source) => {
      const material = new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        fog: true,
      });
      materials.push(material);

      textureLoader.load(
        source,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          textures.push(texture);
          material.map = texture;
          material.opacity = 1;
          material.needsUpdate = true;
          renderer.render(scene, camera);
        },
      );
      return material;
    });

    const colorMaterials = tunnelPalette.map((color) => {
      const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, fog: true });
      materials.push(material);
      return material;
    });

    const floorCellWidth = tunnelWidth / gridColumns;
    const wallCellHeight = tunnelHeight / gridRows;
    const floorGeometry = new THREE.PlaneGeometry(floorCellWidth, segmentDepth * 0.92);
    const wallGeometry = new THREE.PlaneGeometry(segmentDepth * 0.92, wallCellHeight);
    geometries.push(floorGeometry, wallGeometry);

    const placePanel = (
      material: THREE.Material,
      surface: number,
      segment: number,
      lane: number,
    ) => {
      const z = -(segment + 0.5) * segmentDepth;
      let mesh: THREE.Mesh;

      if (surface === 0 || surface === 1) {
        mesh = new THREE.Mesh(floorGeometry, material);
        mesh.position.set(
          -halfWidth + (lane + 0.5) * floorCellWidth,
          surface === 0 ? halfHeight : -halfHeight,
          z,
        );
        mesh.rotation.x = surface === 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        mesh = new THREE.Mesh(wallGeometry, material);
        mesh.position.set(
          surface === 2 ? -halfWidth : halfWidth,
          -halfHeight + (lane + 0.5) * wallCellHeight,
          z,
        );
        mesh.rotation.y = surface === 2 ? Math.PI / 2 : -Math.PI / 2;
      }
      scene.add(mesh);
    };

    imageMaterials.forEach((material, index) => {
      const surface = index % 4;
      const lane = surface < 2 ? (index * 3) % gridColumns : (index * 2) % gridRows;
      placePanel(material, surface, index + 1, lane);
      placePanel(
        colorMaterials[(index * 3) % colorMaterials.length],
        (surface + 2) % 4,
        index + 1,
        surface < 2 ? (lane + 2) % gridRows : (lane + 1) % gridColumns,
      );
    });

    for (let index = 0; index < 5; index += 1) {
      placePanel(
        colorMaterials[(index + 4) % colorMaterials.length],
        (index + 1) % 4,
        index * 2 + 2,
        index % 3,
      );
    }

    const render = () => renderer.render(scene, camera);
    const resize = () => {
      const width = Math.max(1, frame.clientWidth);
      const height = Math.max(1, frame.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      render();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(frame);
    resize();

    setTunnelProgressRef.current = (progress) => {
      const easedProgress = gsap.parseEase("power1.inOut")(gsap.utils.clamp(0, 1, progress));
      camera.position.z = 0.9 - easedProgress * segmentDepth * 12.6;
      render();
    };

    return () => {
      setTunnelProgressRef.current = () => undefined;
      resizeObserver.disconnect();
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
    };
  }, []);

  useGSAP(
    () => {
      const root = rootRef.current;
      const tunnelJourney = tunnelJourneyRef.current;
      const syncJourney = syncJourneyRef.current;
      const leftVideo = leftVideoRef.current;
      const rightVideo = rightVideoRef.current;
      if (!root || !tunnelJourney || !syncJourney || !leftVideo || !rightVideo) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const synchronizedVideos = [leftVideo, rightVideo];
      let desiredVideoTime = 0;
      let seekAnimationFrame = 0;

      const applyLatestVideoTime = () => {
        seekAnimationFrame = 0;
        for (const video of synchronizedVideos) {
          video.pause();
          if (
            video.readyState < 1
            || video.seeking
            || Math.abs(video.currentTime - desiredVideoTime) < 0.018
          ) {
            continue;
          }
          video.currentTime = desiredVideoTime;
        }
      };

      const scheduleVideoSeek = () => {
        cancelAnimationFrame(seekAnimationFrame);
        seekAnimationFrame = requestAnimationFrame(applyLatestVideoTime);
      };

      const seekVideos = (progress: number) => {
        const durations = [leftVideo.duration, rightVideo.duration].filter(Number.isFinite);
        const shortestDuration = durations.length === 2 ? Math.min(...durations) : 3;
        desiredVideoTime = gsap.utils.clamp(
          0,
          Math.max(0, shortestDuration - 0.04),
          progress * shortestDuration,
        );
        scheduleVideoSeek();
      };

      if (reducedMotion) {
        setTunnelProgressRef.current(0.42);
        seekVideos(0);
        return;
      }

      const tunnelTrigger = ScrollTrigger.create({
        id: "superme-gallery-tunnel",
        trigger: tunnelJourney,
        scroller: root,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.2,
        invalidateOnRefresh: true,
        refreshPriority: 1,
        onUpdate: (self) => setTunnelProgressRef.current(self.progress),
      });

      const syncTrigger = ScrollTrigger.create({
        id: "superme-synchronized-videos",
        trigger: syncJourney,
        scroller: root,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.18,
        invalidateOnRefresh: true,
        refreshPriority: 2,
        onUpdate: (self) => seekVideos(self.progress),
        onEnter: (self) => seekVideos(self.progress),
        onEnterBack: (self) => seekVideos(self.progress),
      });

      const refreshAfterMetadata = () => {
        seekVideos(syncTrigger.progress);
        ScrollTrigger.refresh();
      };
      const catchUpAfterSeek = () => scheduleVideoSeek();
      for (const video of synchronizedVideos) {
        video.addEventListener("loadedmetadata", refreshAfterMetadata);
        video.addEventListener("seeked", catchUpAfterSeek);
      }
      document.fonts?.ready.then(() => ScrollTrigger.refresh());

      return () => {
        cancelAnimationFrame(seekAnimationFrame);
        for (const video of synchronizedVideos) {
          video.removeEventListener("loadedmetadata", refreshAfterMetadata);
          video.removeEventListener("seeked", catchUpAfterSeek);
        }
        tunnelTrigger.kill();
        syncTrigger.kill();
      };
    },
    { scope: rootRef },
  );

  return (
    <section
      className="project-detail-view ai-video-detail"
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-video-title"
      data-node-id="69:8"
    >
      <header className="project-detail-header ai-video-detail-header">
        <button
          className="project-detail-back"
          ref={backRef}
          type="button"
          onClick={onBack}
          disabled={isTransitioning}
        >
          <span aria-hidden="true">←</span> Back
        </button>
        <p>05 / 06</p>
      </header>

      <main>
        <section
          className="ai-tunnel-journey"
          ref={tunnelJourneyRef}
          aria-label="SuperMe image gallery tunnel controlled by scrolling"
        >
          <div className="ai-tunnel-scene">
            <canvas ref={tunnelCanvasRef} className="ai-tunnel-canvas" />
            <p className="ai-tunnel-scroll-note">Scroll to travel through the archive</p>
          </div>
        </section>

        <section className="ai-video-intro">
          <h1 id="ai-video-title" data-node-id="69:9">
            SuperMe
            <span>–AIGC Video</span>
          </h1>
          <p data-node-id="69:10">
            “SuperMe” is a project exploring a future where personal identity is entirely
            data-driven. We designed an automated system that collects biometric and
            behavioral data through wearable jewelry and automatically generates tamper-proof
            identity profiles. Its purpose is to provoke critical reflection on the loss of
            individual autonomy and the illusion of “fairness” in an algorithm-driven society.
          </p>
        </section>

        <section
          className="ai-sync-journey"
          ref={syncJourneyRef}
          aria-label="Two synchronized SuperMe videos controlled by scrolling"
        >
          <div className="ai-sync-scene">
            <video
              ref={leftVideoRef}
              src="/projects/ai-video/sync/portrait-left.mp4"
              preload="auto"
              muted
              playsInline
              aria-label="SuperMe portrait study one"
            />
            <video
              ref={rightVideoRef}
              src="/projects/ai-video/sync/portrait-right.mp4"
              preload="auto"
              muted
              playsInline
              aria-label="SuperMe portrait study two"
            />
            <p className="ai-sync-scroll-note">Scroll to synchronize the portraits</p>
          </div>
        </section>

        <section className="ai-final-film" data-node-id="70:19">
          <video
            src="/projects/ai-video/final/superme-final.mp4"
            preload="metadata"
            controls
            playsInline
            aria-label="Play the complete SuperMe film"
          />
        </section>
      </main>
    </section>
  );
}
