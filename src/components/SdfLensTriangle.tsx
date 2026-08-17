"use client";

import { useEffect, useRef } from "react";

type Point = { x: number; y: number };

const vertexShader = `attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;
const fragmentShader = `
  #extension GL_OES_standard_derivatives : enable
  precision highp float;
  uniform vec2 u_mouse; uniform vec2 u_resolution; uniform float u_pixelRatio;
  vec2 coord(in vec2 p) {
    p = p / u_resolution.xy;
    if (u_resolution.x > u_resolution.y) { p.x *= u_resolution.x / u_resolution.y; p.x += (u_resolution.y - u_resolution.x) / u_resolution.y / 2.0; }
    else { p.y *= u_resolution.y / u_resolution.x; p.y += (u_resolution.x - u_resolution.y) / u_resolution.x / 2.0; }
    p -= 0.5; p *= vec2(-1.0, 1.0); return p;
  }
  float sdEquilateralTriangle(vec2 p) {
    const float k = 1.73205080757;
    p.x = abs(p.x) - 1.0;
    p.y = p.y + 1.0 / k;
    if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
    p.x -= clamp(p.x, -2.0, 0.0);
    return -length(p) * sign(p.y);
  }
  float sdCircle(in vec2 st, in vec2 center) { return length(st - center) * 2.0; }
  float fill(float x, float size, float edge) { return 1.0 - smoothstep(size - edge, size + edge, x); }
  float stroke(float x, float size, float width, float edge) { float d = smoothstep(size - edge, size + edge, x + width * 0.5) - smoothstep(size - edge, size + edge, x - width * 0.5); return clamp(d, 0.0, 1.0); }
  void main() {
    vec2 st = coord(gl_FragCoord.xy) + 0.5;
    vec2 posMouse = coord(u_mouse * u_pixelRatio) * vec2(1.0, -1.0) + 0.5;
    // A tighter, denser hover halo: half the original reach with a more solid falloff.
    float circleField = fill(sdCircle(st, posMouse), 0.156, 0.26);
    vec2 trianglePoint = (st - vec2(0.5)) * 2.0;
    float triangleField = sdEquilateralTriangle(trianglePoint / 0.66) * 0.66;
    float result = stroke(triangleField, 0.0, 0.035, circleField) * 5.2;
    gl_FragColor = vec4(vec3(result), result);
  }
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

export function SdfLensTriangle({ onHoverChange }: { onHoverChange?: (hovered: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { antialias: true, alpha: true });
    if (!canvas || !gl) return;

    gl.getExtension("OES_standard_derivatives");
    const vertex = compile(gl, gl.VERTEX_SHADER, vertexShader);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentShader);
    if (!vertex || !fragment) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const position = gl.getAttribLocation(program, "a_position");
    const mouse = gl.getUniformLocation(program, "u_mouse");
    const resolution = gl.getUniformLocation(program, "u_resolution");
    const ratioUniform = gl.getUniformLocation(program, "u_pixelRatio");
    const buffer = gl.createBuffer();
    if (!buffer || position < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    let width = 1;
    let height = 1;
    let ratio = 1;
    let frame = 0;
    let previous = performance.now();
    let triangleHovered = false;
    const pointer: Point = { x: 0, y: 0 };
    const target: Point = { x: 0, y: 0 };

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      width = Math.max(1, box.width);
      height = Math.max(1, box.height);
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const scene = canvas.closest<HTMLElement>(".contact-hero-image");
      if (scene) {
        const base = Math.min(width, height);
        scene.style.setProperty("--sdf-triangle-width", `${base * 0.6775}px`);
        scene.style.setProperty("--sdf-triangle-height", `${base * 0.589076}px`);
        scene.style.setProperty("--sdf-triangle-center-offset", `${base * 0.095263}px`);
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const insideTriangle = (x: number, y: number) => {
      const box = canvas.getBoundingClientRect();
      const base = Math.min(box.width, box.height);
      const triangleWidth = base * 0.66;
      const triangleHeight = base * 0.571576;
      const triangleTop = box.height * 0.5 - triangleHeight * (2 / 3);
      const px = (x - (box.width - triangleWidth) * 0.5) / triangleWidth;
      const py = (y - triangleTop) / triangleHeight;
      return py >= 0 && py <= 1 && px >= 0.5 - py * 0.5 && px <= 0.5 + py * 0.5;
    };

    const move = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      target.x = event.clientX - box.left;
      target.y = event.clientY - box.top;
      const hovered = insideTriangle(target.x, target.y);
      if (hovered !== triangleHovered) {
        triangleHovered = hovered;
        canvas.style.cursor = hovered ? "crosshair" : "default";
        onHoverChange?.(hovered);
      }
    };

    const leave = () => {
      if (triangleHovered) {
        triangleHovered = false;
        canvas.style.cursor = "default";
        onHoverChange?.(false);
      }
    };

    const render = (now: number) => {
      const amount = 1 - Math.exp(-8 * Math.min((now - previous) / 1000, 0.1));
      previous = now;
      pointer.x += (target.x - pointer.x) * amount;
      pointer.y += (target.y - pointer.y) * amount;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(mouse, pointer.x, pointer.y);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(ratioUniform, ratio);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      frame = requestAnimationFrame(render);
    };

    resize();
    frame = requestAnimationFrame(render);
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerleave", leave);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, [onHoverChange]);

  return (
    <div className="sdf-lens-triangle">
      <canvas ref={canvasRef} className="sdf-lens-triangle-canvas" aria-label="Interactive triangle" />
    </div>
  );
}
