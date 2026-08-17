"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Diamond variant ported from zavalit/bayer-dithering-webgl-demo.
// The original click-ripple uniforms and pointer handler are intentionally omitted.
const vertexShader = /* glsl */ `
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3 uColor;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uPixelSize;

  out vec4 fragColor;

  float Bayer2(vec2 a) {
    a = floor(a);
    return fract(a.x / 2.0 + a.y * a.y * 0.75);
  }

  #define Bayer4(a) (Bayer2(0.5 * (a)) * 0.25 + Bayer2(a))
  #define Bayer8(a) (Bayer4(0.5 * (a)) * 0.25 + Bayer2(a))

  #define FBM_OCTAVES 5
  #define FBM_LACUNARITY 1.25
  #define FBM_GAIN 1.0
  #define FBM_SCALE 4.0

  float hash11(float n) {
    return fract(sin(n) * 43758.5453);
  }

  float vnoise(vec3 p) {
    vec3 ip = floor(p);
    vec3 fp = fract(p);

    float n000 = hash11(dot(ip + vec3(0.0, 0.0, 0.0), vec3(1.0, 57.0, 113.0)));
    float n100 = hash11(dot(ip + vec3(1.0, 0.0, 0.0), vec3(1.0, 57.0, 113.0)));
    float n010 = hash11(dot(ip + vec3(0.0, 1.0, 0.0), vec3(1.0, 57.0, 113.0)));
    float n110 = hash11(dot(ip + vec3(1.0, 1.0, 0.0), vec3(1.0, 57.0, 113.0)));
    float n001 = hash11(dot(ip + vec3(0.0, 0.0, 1.0), vec3(1.0, 57.0, 113.0)));
    float n101 = hash11(dot(ip + vec3(1.0, 0.0, 1.0), vec3(1.0, 57.0, 113.0)));
    float n011 = hash11(dot(ip + vec3(0.0, 1.0, 1.0), vec3(1.0, 57.0, 113.0)));
    float n111 = hash11(dot(ip + vec3(1.0, 1.0, 1.0), vec3(1.0, 57.0, 113.0)));

    vec3 w = fp * fp * fp * (fp * (fp * 6.0 - 15.0) + 10.0);
    float x00 = mix(n000, n100, w.x);
    float x10 = mix(n010, n110, w.x);
    float x01 = mix(n001, n101, w.x);
    float x11 = mix(n011, n111, w.x);
    float y0 = mix(x00, x10, w.y);
    float y1 = mix(x01, x11, w.y);

    return mix(y0, y1, w.z) * 2.0 - 1.0;
  }

  float fbm2(vec2 uv, float t) {
    vec3 p = vec3(uv * FBM_SCALE, t);
    float amp = 1.0;
    float freq = 1.0;
    float sum = 1.0;

    for (int i = 0; i < FBM_OCTAVES; ++i) {
      sum += amp * vnoise(p * freq);
      freq *= FBM_LACUNARITY;
      amp *= FBM_GAIN;
    }

    return sum * 0.5 + 0.5;
  }

  float maskDiamond(vec2 p, float cov) {
    float r = sqrt(cov) * 0.564;
    return step(abs(p.x - 0.49) + abs(p.y - 0.49), r);
  }

  void main() {
    float pixelSize = uPixelSize;
    vec2 fragCoord = gl_FragCoord.xy - uResolution * 0.5;
    float aspectRatio = uResolution.x / uResolution.y;

    vec2 pixelUV = fract(fragCoord / pixelSize);
    float cellPixelSize = 8.0 * pixelSize;
    vec2 cellId = floor(fragCoord / cellPixelSize);
    vec2 cellCoord = cellId * cellPixelSize;
    vec2 uv = cellCoord / uResolution * vec2(aspectRatio, 1.0);

    float feed = fbm2(uv, uTime * 0.05);
    feed = feed * 0.5 - 0.65;

    float bayer = Bayer8(fragCoord / uPixelSize) - 0.5;
    float coverage = step(0.5, feed + bayer);
    float mask = maskDiamond(pixelUV, coverage);

    fragColor = vec4(uColor, mask);
  }
`;

export function BayerDiamondBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2");
    if (!gl) return;

    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true });
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const uniforms = {
      uResolution: { value: new THREE.Vector2() },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#f4f1ea") },
      uPixelSize: { value: 3 },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      glslVersion: THREE.GLSL3,
      transparent: true,
    });
    scene.add(new THREE.Mesh(geometry, material));

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const startedAt = performance.now();
    let isVisible = true;
    let frame = 0;

    const resize = () => {
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      uniforms.uResolution.value.set(width, height);
    };

    const render = () => {
      if (isVisible) {
        uniforms.uTime.value = reducedMotion.matches ? 0 : (performance.now() - startedAt) / 1000;
        renderer.render(scene, camera);
      }
      frame = window.requestAnimationFrame(render);
    };

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    const resizeObserver = new ResizeObserver(resize);

    visibilityObserver.observe(canvas);
    resizeObserver.observe(canvas);
    resize();
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="bayer-diamond-canvas" aria-hidden="true" />;
}
