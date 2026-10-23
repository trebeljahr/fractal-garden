import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";
import { useSpatialControls } from "../utils/hooks/useSpatialControls";
import type { SceneSpec } from "../utils/render/scene3d";
import { createShaderProgram } from "../utils/shaders/compileShader";
import {
  CAMERA_DISTANCE,
  FAR_PLANE,
  FOCAL_SCALE,
  INITIAL_SPATIAL_CAMERA,
  NEAR_PLANE,
  rotationOf,
  spatialFrameTransform,
} from "../utils/spatial/camera";
import {
  buildSpatialFrame,
  type SpatialGeometry,
  type SpatialRequest,
  type SpatialStyle,
} from "../utils/spatial/geometry";
import { pickSpatialPoint } from "../utils/spatial/picking";

const vertex = `attribute vec3 position; attribute vec3 normal; attribute vec3 bary; attribute vec3 edges; uniform vec2 scale; uniform mat3 frame; uniform vec3 shift; uniform float magnification; varying vec3 n; varying vec3 b; varying vec3 e;
void main(){vec3 p=frame*(position*magnification)+shift;float d=${CAMERA_DISTANCE.toFixed(1)}-p.z;gl_Position=vec4(p.xy*scale,${((FAR_PLANE + NEAR_PLANE) / (FAR_PLANE - NEAR_PLANE)).toFixed(12)}*d-${((2 * FAR_PLANE * NEAR_PLANE) / (FAR_PLANE - NEAR_PLANE)).toFixed(12)},d);n=frame*normal;b=bary;e=edges;}`;
const fragment = `#extension GL_OES_standard_derivatives : enable
precision highp float; varying vec3 n; varying vec3 b; varying vec3 e; uniform vec3 fill; uniform vec3 stroke; uniform float wire; uniform float faces; uniform float lineWidth;
void main(){vec3 w=max(fwidth(b)*max(lineWidth,.5),vec3(.000001));vec3 a=smoothstep(vec3(0.),w,b);float edge=min(min(mix(1.,a.x,e.x),mix(1.,a.y,e.y)),mix(1.,a.z,e.z));if(faces<.5&&(wire<.5||edge>.9))discard;float shade=.35+.75*max(.2,dot(normalize(n),normalize(vec3(-.5,.75,1.))));gl_FragColor=vec4(mix(stroke,fill,wire>.5?edge:1.)*shade,1.);}`;
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
export function SpatialExplorer<T extends SpatialStyle>({
  spec,
  style,
  setStyle,
  width,
  height,
}: {
  spec: SceneSpec | { kind: "hilbert3d" };
  style: T;
  setStyle: Dispatch<SetStateAction<T>>;
  width: number;
  height: number;
}) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const geometry = useRef<SpatialGeometry | null>(null);
  const geometryFrame = useRef<SpatialRequest | null>(null);
  const currentFrame = useRef({ camera: INITIAL_SPATIAL_CAMERA, style });
  const { camera } = useSpatialControls({
    canvas,
    view: style,
    setView: setStyle,
    identity: JSON.stringify(spec),
    pick: (x, y) => {
      const frame = geometryFrame.current,
        live = currentFrame.current;
      if (!geometry.current || !frame) return null;
      return pickSpatialPoint(
        geometry.current.vertices,
        x,
        y,
        width,
        height,
        spatialFrameTransform(
          frame.camera,
          rotationOf(frame.style),
          live.camera,
          rotationOf(live.style),
        ),
      );
    },
  });
  currentFrame.current = { camera, style };
  const latest = useRef({ style, width, height });
  latest.current = { style, width, height };
  const drawRef = useRef<() => void>(() => {});
  const requestRef = useRef<(request: SpatialRequest) => void>(() => {});
  const [ready, setReady] = useState(0);
  useEffect(() => {
    if (!canvas) return;
    let disposed = false,
      worker: Worker | null = null,
      busy = false,
      pending: SpatialRequest | null = null,
      sequence = 0;
    let activeRequest: SpatialRequest | null = null;
    let uploaded: SpatialGeometry | null = null;
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    if (!gl) return;
    let output: ReturnType<typeof createShaderProgram>,
      buffer: WebGLBuffer | null = null;
    const init = () => {
      output = undefined;
      buffer = null;
      gl.getExtension("OES_standard_derivatives");
      output = createShaderProgram(gl, vertex, fragment);
      buffer = gl.createBuffer();
    };
    init();
    const draw = () => {
      if (disposed || gl.isContextLost() || !output || !buffer) return;
      const { style, width, height } = latest.current,
        ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (
        canvas.width !== Math.round(width * ratio) ||
        canvas.height !== Math.round(height * ratio)
      ) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(...(rgb(style.background) as [number, number, number]), 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const data = geometry.current;
      if (!data) return;
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram is not a React hook.
      gl.useProgram(output.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      if (uploaded !== data) {
        gl.bufferData(gl.ARRAY_BUFFER, data.vertices, gl.DYNAMIC_DRAW);
        uploaded = data;
      }
      const old = geometryFrame.current!,
        live = currentFrame.current;
      const transform = spatialFrameTransform(
        old.camera,
        rotationOf(old.style),
        live.camera,
        rotationOf(live.style),
      );
      gl.uniformMatrix3fv(gl.getUniformLocation(output.program, "frame"), false, transform.matrix);
      gl.uniform3fv(gl.getUniformLocation(output.program, "shift"), transform.offset);
      gl.uniform1f(gl.getUniformLocation(output.program, "magnification"), transform.scale);
      ["position", "normal", "bary", "edges"].forEach((name, i) => {
        const a = gl.getAttribLocation(output!.program, name);
        gl.enableVertexAttribArray(a);
        gl.vertexAttribPointer(a, 3, gl.FLOAT, false, 48, i * 12);
      });
      gl.uniform2f(
        gl.getUniformLocation(output.program, "scale"),
        (2 * FOCAL_SCALE * Math.min(width, height)) / width,
        (2 * FOCAL_SCALE * Math.min(width, height)) / height,
      );
      gl.uniform3fv(gl.getUniformLocation(output.program, "fill"), rgb(style.fillColor));
      gl.uniform3fv(gl.getUniformLocation(output.program, "stroke"), rgb(style.strokeColor));
      gl.uniform1f(
        gl.getUniformLocation(output.program, "wire"),
        Number(style.showWireframe && style.lineWidth > 0),
      );
      gl.uniform1f(gl.getUniformLocation(output.program, "faces"), Number(style.showFaces));
      gl.uniform1f(gl.getUniformLocation(output.program, "lineWidth"), style.lineWidth * ratio);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.drawArrays(gl.TRIANGLES, 0, data.vertices.length / 12);
      canvas.dataset.renderZoom = String(geometryFrame.current?.camera.zoom ?? 0);
      canvas.dataset.detailDepth = String(data.depth);
      canvas.dataset.leaves = String(data.leaves);
      canvas.dataset.limited = String(data.limited);
    };
    drawRef.current = draw;
    const accept = (result: SpatialGeometry) => {
      if (disposed) return;
      geometry.current = result;
      geometryFrame.current = activeRequest;
      draw();
    };
    try {
      worker = new Worker(new URL("../workers/spatial.worker.ts", import.meta.url));
      worker.onmessage = (event: MessageEvent<{ result?: SpatialGeometry; error?: string }>) => {
        busy = false;
        if (event.data.error) console.error(event.data.error);
        if (pending) {
          const next = pending;
          pending = null;
          send(next);
        } else if (event.data.result) accept(event.data.result);
      };
    } catch {
      worker = null;
    }
    const send = (request: SpatialRequest) => {
      if (disposed) return;
      if (busy) {
        pending = request;
        return;
      }
      activeRequest = request;
      if (worker) {
        busy = true;
        worker.postMessage({ id: ++sequence, request });
      } else {
        accept(buildSpatialFrame(request));
      }
    };
    requestRef.current = send;
    const lost = (e: Event) => {
      e.preventDefault();
    };
    const restored = () => {
      uploaded = null;
      init();
      draw();
    };
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    canvas.addEventListener("garden:redraw", draw);
    window.addEventListener("garden:before-export", draw);
    setReady((v) => v + 1);
    return () => {
      disposed = true;
      worker?.terminate();
      requestRef.current = () => {};
      drawRef.current = () => {};
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      canvas.removeEventListener("garden:redraw", draw);
      window.removeEventListener("garden:before-export", draw);
      if (output) {
        gl.deleteProgram(output.program);
        gl.deleteShader(output.vert);
        gl.deleteShader(output.frag);
      }
      if (buffer) gl.deleteBuffer(buffer);
    };
  }, [canvas]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Colors redraw existing buffers; only the listed view fields change geometry.
  useEffect(() => {
    if (!ready) return;
    requestRef.current({ spec, camera, style, width, height });
  }, [
    ready,
    spec,
    camera,
    style.rotationX,
    style.rotationY,
    style.grab,
    style.lineWidth,
    width,
    height,
  ]);
  useEffect(() => drawRef.current());
  useEffect(() => {
    if (!style.autoRotate) return;
    let frame = 0,
      last = 0;
    const rotate = (time: number) => {
      if (last && time - last > 50) {
        setStyle((old) => ({ ...old, rotationY: old.rotationY + 0.4 }));
        last = time;
      } else if (!last) last = time;
      frame = requestAnimationFrame(rotate);
    };
    frame = requestAnimationFrame(rotate);
    return () => cancelAnimationFrame(frame);
  }, [style.autoRotate, setStyle]);
  return (
    <canvas
      ref={setCanvas}
      data-spatial-explorer
      data-zoom={camera.zoom}
      aria-label="Drag to rotate. Shift-drag to pan. Scroll or pinch to zoom. Double-click to reset."
      style={{ width, height, display: "block", background: style.background }}
    />
  );
}
