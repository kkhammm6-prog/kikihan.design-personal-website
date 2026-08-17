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
  float sdRoundRect(vec2 p, vec2 b, float r) { vec2 d = abs(p - 0.5) * 4.2 - b + vec2(r); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r; }
  float sdCircle(in vec2 st, in vec2 center) { return length(st - center) * 2.0; }
  float fill(float x, float size, float edge) { return 1.0 - smoothstep(size - edge, size + edge, x); }
  float stroke(float x, float size, float width, float edge) { float d = smoothstep(size - edge, size + edge, x + width * 0.5) - smoothstep(size - edge, size + edge, x - width * 0.5); return clamp(d, 0.0, 1.0); }
  void main() {
    vec2 st = coord(gl_FragCoord.xy) + 0.5;
    vec2 posMouse = coord(u_mouse * u_pixelRatio) * vec2(1.0, -1.0) + 0.5;
    float circleField = fill(sdCircle(st, posMouse), 0.3, 0.5);
    float result = stroke(sdRoundRect(st, vec2(1.2), 0.4), 0.0, 0.05, circleField) * 4.0;
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

export function SdfLensSquare({ onHoverChange }: { onHoverChange?: (hovered: boolean) => void }) {
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
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    const position = gl.getAttribLocation(program, "a_position");
    const mouse = gl.getUniformLocation(program, "u_mouse");
    const resolution = gl.getUniformLocation(program, "u_resolution");
    const ratioUniform = gl.getUniformLocation(program, "u_pixelRatio");
    const buffer = gl.createBuffer();
    if (!buffer || position < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    let width = 1; let height = 1; let ratio = 1; let frame = 0; let previous = performance.now();
    const pointer: Point = { x: 0, y: 0 }; const target: Point = { x: 0, y: 0 };
    const resize = () => { const box = canvas.getBoundingClientRect(); width = Math.max(1, box.width); height = Math.max(1, box.height); ratio = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); const hero = canvas.closest<HTMLElement>(".hero-image"); if (hero) { hero.style.setProperty("--sdf-square-size", `${Math.min(width, height) * 0.57142857}px`); hero.style.setProperty("--sdf-square-radius", "16.666667%"); } gl.viewport(0, 0, canvas.width, canvas.height); };
    let squareHovered = false;
    const insideSquare = (x: number, y: number) => {
      const box = canvas.getBoundingClientRect();
      const size = Math.min(box.width, box.height) * 0.57142857;
      const radius = size / 6;
      const dx = Math.abs(x - box.width * 0.5) - size * 0.5 + radius;
      const dy = Math.abs(y - box.height * 0.5) - size * 0.5 + radius;
      return Math.max(dx, dy) <= 0 || Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) <= radius;
    };
    const move = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect(); target.x = event.clientX - box.left; target.y = event.clientY - box.top;
      const hovered = insideSquare(target.x, target.y);
      if (hovered !== squareHovered) { squareHovered = hovered; canvas.style.cursor = hovered ? "crosshair" : "default"; onHoverChange?.(hovered); }
    };
    const leave = () => { if (squareHovered) { squareHovered = false; canvas.style.cursor = "default"; onHoverChange?.(false); } };
    const render = (now: number) => {
      const amount = 1 - Math.exp(-8 * Math.min((now - previous) / 1000, 0.1)); previous = now;
      pointer.x += (target.x - pointer.x) * amount; pointer.y += (target.y - pointer.y) * amount;
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(mouse, pointer.x, pointer.y); gl.uniform2f(resolution, canvas.width, canvas.height); gl.uniform1f(ratioUniform, ratio); gl.drawArrays(gl.TRIANGLES, 0, 3);
      frame = requestAnimationFrame(render);
    };
    resize(); frame = requestAnimationFrame(render);
    window.addEventListener("resize", resize); canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerleave", leave); gl.deleteBuffer(buffer); gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment); };
  }, [onHoverChange]);

  return <div className="sdf-lens-square"><canvas ref={canvasRef} className="sdf-lens-square-canvas" aria-label="Interactive rounded square" /></div>;
}
