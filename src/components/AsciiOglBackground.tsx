"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Two-pass ASCII shader ported from andrico1234/codrops-ascii-ogl (MIT).
// Pass 1 generates the original animated classic-Perlin field; pass 2 applies
// the repository's 5x5 bitmask character quantisation.
const vertexShader = /* glsl */ `
  out vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const noiseFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uFrequency;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uValue;
  in vec2 vUv;
  out vec4 fragColor;

  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  vec3 quintic(vec3 v) { return v * v * v * (v * (v * 6.0 - 15.0) + 10.0); }

  float cnoise(vec3 p) {
    vec3 pi0 = floor(p);
    vec3 pi1 = pi0 + vec3(1.0);
    pi0 = mod289(pi0);
    pi1 = mod289(pi1);
    vec3 pf0 = fract(p);
    vec3 pf1 = pf0 - vec3(1.0);
    vec4 ix = vec4(pi0.x, pi1.x, pi0.x, pi1.x);
    vec4 iy = vec4(pi0.yy, pi1.yy);
    vec4 iz0 = pi0.zzzz;
    vec4 iz1 = pi1.zzzz;
    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);
    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);
    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);
    vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
    vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
    vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
    vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
    vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
    vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
    vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
    vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);
    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
    float n000 = dot(g000, pf0);
    float n100 = dot(g100, vec3(pf1.x, pf0.yz));
    float n010 = dot(g010, vec3(pf0.x, pf1.y, pf0.z));
    float n110 = dot(g110, vec3(pf1.xy, pf0.z));
    float n001 = dot(g001, vec3(pf0.xy, pf1.z));
    float n101 = dot(g101, vec3(pf1.x, pf0.y, pf1.z));
    float n011 = dot(g011, vec3(pf0.x, pf1.yz));
    float n111 = dot(g111, pf1);
    vec3 fade = quintic(pf0);
    vec4 nz = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade.z);
    vec2 nyz = mix(nz.xy, nz.zw, fade.y);
    return 2.2 * mix(nyz.x, nyz.y, fade.x);
  }

  vec3 hsv2rgb(vec3 c) {
    vec4 k = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + k.xyz) * 6.0 - k.www);
    return c.z * mix(k.xxx, clamp(p - k.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    float hue = abs(cnoise(vec3(vUv * uFrequency, uTime * uSpeed)));
    fragColor = vec4(hsv2rgb(vec3(hue, 1.0, uValue)), 1.0);
  }
`;

const asciiFragmentShader = /* glsl */ `
  precision highp float;

  uniform vec2 uResolution;
  uniform sampler2D uTexture;
  out vec4 fragColor;

  float character(int n, vec2 p) {
    p = floor(p * vec2(-4.0, 4.0) + 2.5);
    if (clamp(p.x, 0.0, 4.0) == p.x && clamp(p.y, 0.0, 4.0) == p.y) {
      int a = int(round(p.x) + 5.0 * round(p.y));
      if (((n >> a) & 1) == 1) return 1.0;
    }
    return 0.0;
  }

  void main() {
    vec2 pix = gl_FragCoord.xy;
    vec3 col = texture(uTexture, floor(pix / 8.0) * 8.0 / uResolution).rgb;
    float gray = 0.3 * col.r + 0.59 * col.g + 0.11 * col.b;
    int n = 4096;
    if (gray > 0.2) n = 65600;
    if (gray > 0.3) n = 163153;
    if (gray > 0.4) n = 15255086;
    if (gray > 0.5) n = 13121101;
    if (gray > 0.6) n = 15252014;
    if (gray > 0.7) n = 13195790;
    if (gray > 0.8) n = 11512810;

    vec2 p = mod(pix / 4.0, 2.0) - vec2(1.0);
    float glyph = character(n, p);
    float shadow = character(n, p + vec2(0.17, -0.17));
    vec3 background = vec3(0.98);
    vec3 result = mix(background, vec3(0.88), shadow * 0.28);
    result = mix(result, vec3(0.78), glyph);
    fragColor = vec4(result, 1.0);
  }
`;

export function AsciiOglBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("webgl2", { antialias: false });
    if (!context) return;

    const renderer = new THREE.WebGLRenderer({ canvas, context, antialias: false });
    renderer.setPixelRatio(1);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const noiseScene = new THREE.Scene();
    const outputScene = new THREE.Scene();
    const noiseUniforms = {
      uTime: { value: 0 },
      uFrequency: { value: 5 },
      uSpeed: { value: 0.75 },
      uValue: { value: 0.4 },
    };
    const noiseMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: noiseFragmentShader,
      uniforms: noiseUniforms,
      glslVersion: THREE.GLSL3,
    });
    const target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false, stencilBuffer: false });
    const asciiUniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTexture: { value: target.texture },
    };
    const asciiMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: asciiFragmentShader,
      uniforms: asciiUniforms,
      glslVersion: THREE.GLSL3,
    });
    noiseScene.add(new THREE.Mesh(geometry, noiseMaterial));
    outputScene.add(new THREE.Mesh(geometry, asciiMaterial));

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const startedAt = performance.now();
    let frame = 0;
    let lastFrame = 0;
    let isVisible = true;

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth || window.innerWidth);
      const height = Math.max(1, canvas.clientHeight || window.innerHeight);
      renderer.setSize(width, height, false);
      target.setSize(width, height);
      asciiUniforms.uResolution.value.set(width, height);
    };

    const render = (time: number) => {
      frame = window.requestAnimationFrame(render);
      if (!isVisible || time - lastFrame < 1000 / 30) return;
      lastFrame = time;
      noiseUniforms.uTime.value = reducedMotion.matches ? 0 : (time - startedAt) / 1000;
      renderer.setRenderTarget(target);
      renderer.render(noiseScene, camera);
      renderer.setRenderTarget(null);
      renderer.render(outputScene, camera);
    };

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    const resizeObserver = new ResizeObserver(resize);
    visibilityObserver.observe(canvas);
    resizeObserver.observe(canvas);
    resize();
    frame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frame);
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      geometry.dispose();
      noiseMaterial.dispose();
      asciiMaterial.dispose();
      target.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="ascii-ogl-canvas" aria-hidden="true" />;
}
