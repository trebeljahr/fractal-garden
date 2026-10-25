import { createShaderProgram } from "../shaders/compileShader";
import {
  CAMERA_DISTANCE,
  FAR_PLANE,
  FOCAL_SCALE,
  NEAR_PLANE,
  type SpatialFrameTransform,
} from "./camera";
import type { SpatialGeometry, SpatialStyle } from "./geometry";

const vertex = `
attribute vec3 position, normal, bary, edges;
uniform vec2 scale;
uniform mat3 frame;
uniform vec3 shift;
uniform float magnification;
varying vec3 n, b, e, p;
void main() {
  p = frame * (position * magnification) + shift;
  float d = ${CAMERA_DISTANCE.toFixed(1)} - p.z;
  gl_Position = vec4(p.xy * scale, ${((FAR_PLANE + NEAR_PLANE) / (FAR_PLANE - NEAR_PLANE)).toFixed(12)} * d - ${((2 * FAR_PLANE * NEAR_PLANE) / (FAR_PLANE - NEAR_PLANE)).toFixed(12)}, d);
  n = frame * normal; b = bary; e = edges;
}`;
const fragment = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
varying vec3 n, b, e, p;
uniform vec3 fill, stroke, farColor, background;
uniform float wire, faces, lineWidth, lighting, surfacePass, curve, farAlpha;
vec2 signNotZero(vec2 v) { return step(vec2(0.), v) * 2. - 1.; }
void main() {
  vec3 normal = normalize(n);
  // Reprojected geometry can cross the eye while the worker refines it.
  if (dot(normal, vec3(-p.xy, ${CAMERA_DISTANCE.toFixed(1)}-p.z)) < 0.) normal = -normal;
  if (surfacePass > .5) {
    normal /= abs(normal.x) + abs(normal.y) + abs(normal.z);
    vec2 enc = normal.z < 0. ? (1. - abs(normal.yx)) * signNotZero(normal.xy) : normal.xy;
    float depth = log2(1. + max(0., ${CAMERA_DISTANCE.toFixed(1)}-p.z)) / log2(${(FAR_PLANE + 1).toFixed(1)});
    gl_FragColor = vec4(enc * .5 + .5, floor(depth * 255.) / 255., fract(depth * 255.));
    return;
  }
  vec3 a = smoothstep(vec3(0.), max(fwidth(b) * max(lineWidth, .5), vec3(.000001)), b);
  float edge = min(min(mix(1., a.x, e.x), mix(1., a.y, e.y)), mix(1., a.z, e.z));
  // Thin triangles should not become solid stroke colour in the distance.
  float edgeVisibility = smoothstep(3., 10., 1. / max(max(fwidth(b.x), fwidth(b.y)), fwidth(b.z)));
  if (faces < .5 && (wire < .5 || edge > .9)) discard;
  float diffuse = max(0., dot(normal, normalize(vec3(-.5, .8, .6))));
  float facing = .15 * max(0., dot(normal, normalize(vec3(-p.xy, ${CAMERA_DISTANCE.toFixed(1)}-p.z))));
  float light = .38 + .62 * diffuse + facing;
  vec3 illumination = vec3(light);
  vec3 color = fill * illumination;
  if (lighting > .5 && faces > .5) {
    float sideLight = max(0., dot(normal, normalize(vec3(-.65,.85,.65))));
    vec3 ambient = mix(vec3(.27,.30,.36), vec3(.36,.36,.33), .5 + .5 * normal.y);
    illumination = min(vec3(1.), ambient + .82 * sideLight * vec3(1.04,1.,.94));
    color = fill * illumination;
  }
  if (curve > .5) {
    float far = clamp((${CAMERA_DISTANCE.toFixed(1)} - p.z - 2.) / 10., 0., 1.);
    color = mix(background, mix(fill, farColor, far), mix(1., farAlpha, far));
  }
  vec3 edgeColor = lighting > .5 && faces > .5 && curve < .5 ? stroke * illumination : stroke * light;
  float outlineStrength = lighting > .5 && curve < .5 ? .18 : .25;
  gl_FragColor = vec4(mix(edgeColor, color, wire > .5 ? (faces > .5 ? 1. - outlineStrength * (1. - edge) * edgeVisibility : edge) : 1.), 1.);
}`;
const screenVertex = `attribute vec2 position; varying vec2 uv;
void main(){ uv = position * .5 + .5; gl_Position = vec4(position,0.,1.); }`;
const screenFragment = `precision highp float;
varying vec2 uv;
uniform sampler2D colorMap, surfaceMap;
uniform vec2 resolution, projection;
uniform vec3 background;
uniform float aoMode, faces, lighting, fogDistanceScale, reliefFront, reliefEnabled, reliefScale;
float depth(vec4 s) { return exp2((s.b + s.a / 255.) * log2(${(FAR_PLANE + 1).toFixed(1)})) - 1.; }
vec3 point(vec2 at, float d) { return vec3((at * 2. - 1.) * d / projection, -d); }
vec3 normal(vec4 s) {
  vec2 f = s.rg * 2. - 1.; vec3 n = vec3(f, 1. - abs(f.x) - abs(f.y));
  float t = max(-n.z, 0.); n.xy += mix(vec2(t),vec2(-t),step(vec2(0.),n.xy));
  return normalize(n);
}
void main() {
  vec4 s = texture2D(surfaceMap,uv);
  if (s.b > .999) { gl_FragColor = vec4(background,1.); return; }
  float d = depth(s);
  vec3 p = point(uv,d), n = normal(s);
  float occlusion = 0.;
  if (aoMode > .5 && faces > .5) {
    // Screen-space contact shading uses only actual nearby surfaces; no painted corner bands.
    for (int i=0; i<16; i++) {
      float fi = float(i), angle = fi * 2.39996323;
      float radius = 3. + 27. * (fi + .5) / 16.;
      vec2 at = uv + vec2(cos(angle),sin(angle)) * radius / resolution;
      if (at.x <= 0. || at.x >= 1. || at.y <= 0. || at.y >= 1.) continue;
      vec4 neighbour = texture2D(surfaceMap,at);
      if (neighbour.b > .999) continue;
      vec3 delta = point(at,depth(neighbour))-p;
      float distance = length(delta);
      float reach = max(.02, d * .18);
      occlusion += max(0.,dot(n,delta/max(distance,.00001))-.08) * (1.-smoothstep(reach*.15,reach,distance));
    }
    occlusion = clamp(occlusion/8.,0.,.8);
  }
  vec3 color = texture2D(colorMap,uv).rgb * (1.-occlusion*(aoMode>1.5 ? 1. : .65));
  if (lighting > .5 && faces > .5 && reliefEnabled > .5) {
    float depth = max(0., d - reliefFront) * reliefScale;
    color *= .55 + .45 * exp(-.9 * depth);
  }
  // Haze is in local travel units and does not depend on the integer recursion depth.
  float fog = clamp((1.-exp(-4.*max(0.,d*fogDistanceScale-.2/96.)))/(1.-exp(-4.*(1.-.2/96.))),0.,1.);
  vec3 atmosphere = lighting > .5 && faces > .5 ? mix(background,vec3(.13,.18,.23),.3*(1.-fog)) : background;
  gl_FragColor = vec4(mix(color,atmosphere,fog),1.);
}`;
const rgb = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);

export function createSpatialRenderer(gl: WebGLRenderingContext) {
  if (!gl.getExtension("OES_standard_derivatives"))
    throw new Error("This view needs WebGL standard derivatives.");
  const logarithmicDepth = Boolean(gl.getExtension("EXT_frag_depth"));
  const mesh = createShaderProgram(
    gl,
    vertex,
    logarithmicDepth
      ? "#extension GL_EXT_frag_depth : enable\n" +
          fragment.replace(
            "void main() {",
            "void main() { gl_FragDepthEXT = log2(1. + max(0., 6. - p.z)) / log2(129.);",
          )
      : fragment,
  );
  const screen = createShaderProgram(gl, screenVertex, screenFragment);
  if (!mesh || !screen) throw new Error("Could not allocate the 3D shaders.");
  const buffer = gl.createBuffer(),
    quad = gl.createBuffer(),
    framebuffer = gl.createFramebuffer(),
    depth = gl.createRenderbuffer();
  const textures = [gl.createTexture(), gl.createTexture()];
  if (!buffer || !quad || !framebuffer || !depth || textures.some((t) => !t))
    throw new Error("Could not allocate the 3D buffers.");
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  let uploaded: SpatialGeometry | null = null,
    frameWidth = 0,
    frameHeight = 0;
  const location = (name: string) => gl.getUniformLocation(mesh.program, name);
  const uniform = (name: string, value: number) => gl.uniform1f(location(name), value);
  const identity: SpatialFrameTransform = {
    matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    offset: [0, 0, 0],
    scale: 1,
  };
  return {
    draw(
      data: SpatialGeometry | null,
      transform: SpatialFrameTransform = identity,
      style: SpatialStyle,
      width: number,
      height: number,
      fogDistanceScale = 1 / 96,
      reliefFront = 0,
    ) {
      const canvas = gl.canvas as HTMLCanvasElement,
        ratio = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(width * ratio),
        h = Math.round(height * ratio);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      if (w !== frameWidth || h !== frameHeight) {
        frameWidth = w;
        frameHeight = h;
        for (const texture of textures) {
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }
        gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
      gl.viewport(0, 0, w, h);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram is not a React hook.
      gl.useProgram(mesh.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      if (data && uploaded !== data) {
        gl.bufferData(gl.ARRAY_BUFFER, data.vertices, gl.DYNAMIC_DRAW);
        uploaded = data;
      }
      const attributes: number[] = [];
      ["position", "normal", "bary", "edges"].forEach((name, i) => {
        const a = gl.getAttribLocation(mesh.program, name);
        attributes.push(a);
        gl.enableVertexAttribArray(a);
        gl.vertexAttribPointer(a, 3, gl.FLOAT, false, 48, i * 12);
      });
      const projection = [
        (2 * FOCAL_SCALE * Math.min(width, height)) / width,
        (2 * FOCAL_SCALE * Math.min(width, height)) / height,
      ];
      gl.uniform2fv(location("scale"), projection);
      gl.uniformMatrix3fv(location("frame"), false, transform.matrix);
      gl.uniform3fv(location("shift"), transform.offset);
      uniform("magnification", transform.scale);
      gl.uniform3fv(location("fill"), rgb(style.fillColor));
      gl.uniform3fv(location("stroke"), rgb(style.strokeColor));
      gl.uniform3fv(location("farColor"), rgb(style.farColor ?? style.fillColor));
      gl.uniform3fv(location("background"), rgb(style.background));
      uniform("curve", Number(Boolean(style.nearColor)));
      uniform("farAlpha", style.farAlpha ?? 1);
      uniform("wire", Number(style.showWireframe && style.lineWidth > 0));
      uniform("faces", Number(style.showFaces));
      uniform("lineWidth", style.lineWidth * ratio);
      uniform("lighting", Number(style.lighting !== "classic"));
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      for (let pass = 0; pass < 2; pass++) {
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          textures[pass],
          0,
        );
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
          throw new Error("Could not prepare the 3D frame.");
        if (pass) gl.clearColor(0.5, 0.5, 1, 1);
        else gl.clearColor(...(rgb(style.background) as [number, number, number]), 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        uniform("surfacePass", pass);
        if (data) gl.drawArrays(gl.TRIANGLES, 0, data.vertices.length / 12);
      }
      attributes.forEach((a) => {
        gl.disableVertexAttribArray(a);
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.disable(gl.DEPTH_TEST);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram is not a React hook.
      gl.useProgram(screen.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      const a = gl.getAttribLocation(screen.program, "position");
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      textures.forEach((texture, i) => {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, texture);
      });
      const screenLocation = (name: string) => gl.getUniformLocation(screen.program, name);
      gl.uniform1i(screenLocation("colorMap"), 0);
      gl.uniform1i(screenLocation("surfaceMap"), 1);
      gl.uniform2f(screenLocation("resolution"), w, h);
      gl.uniform2fv(screenLocation("projection"), projection);
      gl.uniform3fv(screenLocation("background"), rgb(style.background));
      gl.uniform1f(screenLocation("faces"), Number(style.showFaces));
      gl.uniform1f(screenLocation("fogDistanceScale"), Math.max(1 / FAR_PLANE, fogDistanceScale));
      gl.uniform1f(screenLocation("reliefFront"), reliefFront);
      gl.uniform1f(screenLocation("reliefScale"), 96 * fogDistanceScale);
      gl.uniform1f(screenLocation("reliefEnabled"), Number(!style.nearColor));
      gl.uniform1f(screenLocation("lighting"), Number(style.lighting !== "classic"));
      gl.uniform1f(
        screenLocation("aoMode"),
        style.nearColor || style.occlusion === "off" ? 0 : style.occlusion === "minecraft" ? 2 : 1,
      );
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(a);
      gl.activeTexture(gl.TEXTURE0);
    },
    destroy() {
      [mesh, screen].forEach((p) => {
        gl.deleteProgram(p.program);
        gl.deleteShader(p.vert);
        gl.deleteShader(p.frag);
      });
      gl.deleteBuffer(buffer);
      gl.deleteBuffer(quad);
      gl.deleteFramebuffer(framebuffer);
      gl.deleteRenderbuffer(depth);
      textures.forEach((t) => {
        gl.deleteTexture(t);
      });
    },
  };
}
