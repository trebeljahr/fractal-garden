#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D u_roots;
uniform highp sampler2D u_children;
uniform int u_rootCount;
uniform int u_childCount;
uniform bool u_orderedChildren;
uniform int u_hullCount;
uniform int u_edgeCount;
uniform vec4 u_hull[20];
uniform vec4 u_edges[4];
uniform int u_kind;
uniform float u_radius;
uniform float u_featureSize;
uniform vec2 u_resolution;
uniform vec3 u_right;
uniform vec3 u_up;
uniform vec3 u_forward;
uniform float u_focal;
uniform float u_pixelAngle;
uniform float u_detailScale;
uniform float u_nearFootprint;
uniform float u_far;
uniform float u_maxRank;
uniform vec3 u_fill;
uniform vec3 u_stroke;
uniform vec3 u_background;
uniform bool u_faces;
uniform bool u_wire;
uniform float u_lineWidth;
uniform int u_lighting;
uniform int u_occlusion;
uniform float u_fogScale;
uniform float u_reliefFront;
// Queries share the exact rendered construction. 1 = ray, 2 = clearance.
uniform int u_query;
uniform vec3 u_queryRay;
layout(location=0) out vec4 outColor;
layout(location=1) out vec4 outSurface;

struct Transform { vec3 center; mat3 axes; float rank; float size; };
Transform readTransform(sampler2D source, int index) {
  vec4 c = texelFetch(source, ivec2(0, index), 0);
  mat3 m = mat3(texelFetch(source, ivec2(1, index), 0).xyz,
                texelFetch(source, ivec2(2, index), 0).xyz,
                texelFetch(source, ivec2(3, index), 0).xyz);
  return Transform(c.xyz, m, c.w, length(m[0]));
}
Transform readChild(int index, vec3 direction) {
  int octant = (direction.x >= 0.0 ? 1 : 0) + (direction.y >= 0.0 ? 2 : 0) + (direction.z >= 0.0 ? 4 : 0);
  return readTransform(u_children, index + (u_orderedChildren ? octant * u_childCount : 0));
}
vec3 inverseVector(Transform t, vec3 v) { return transpose(t.axes) * v / (t.size * t.size); }
bool hullInterval(vec3 o, vec3 d, float limit, out float nearAt, out float farAt, out vec3 normal) {
  nearAt = -1e30; farAt = limit; normal = vec3(0.0);
  for (int i = 0; i < 20; i++) {
    if (i >= u_hullCount) break;
    vec4 plane = u_hull[i]; float side = plane.w - dot(plane.xyz, o), velocity = dot(plane.xyz, d);
    if (abs(velocity) < 1e-20) { if (side < -1e-6) return false; }
    else {
      float t = side / velocity;
      if (velocity < 0.0 && t > nearAt) { nearAt = t; normal = plane.xyz; }
      if (velocity > 0.0) farAt = min(farAt, t);
      if (farAt < max(0.0, nearAt)) return false;
    }
  }
  return farAt >= max(0.0, nearAt);
}
float hullDistance(vec3 o) {
  float distance = 0.0;
  for (int i = 0; i < 20; i++) { if (i >= u_hullCount) break; distance = max(distance, dot(u_hull[i].xyz, o) - u_hull[i].w); }
  return distance;
}
bool leaf(vec3 o, vec3 d, float limit, out float hit, out vec3 normal, out float edge) {
  edge = 1e30;
  if (u_kind == 0) {
    float farAt;
    if (!hullInterval(o, d, limit, hit, farAt, normal)) return false;
    if (hit < 0.0) {
      // A camera can be inside a coarse retained cell while finer holes resolve.
      hit = farAt;
      vec3 p = o + d * hit;
      float best = 1e30;
      for (int i = 0; i < 20; i++) { if (i >= u_hullCount) break; float e = abs(u_hull[i].w - dot(u_hull[i].xyz, p)); if (e < best) { best = e; normal = u_hull[i].xyz; } }
    }
    vec3 p = o + d * hit;
    for (int i = 0; i < 20; i++) { if (i >= u_hullCount) break; if (dot(u_hull[i].xyz, normal) < 0.999) edge = min(edge, max(0.0, u_hull[i].w - dot(u_hull[i].xyz, p))); }
    return hit >= 0.0 && hit < limit;
  }
  if (abs(d.z) < 1e-20) return false;
  hit = -o.z / d.z;
  if (hit < 0.0 || hit >= limit) return false;
  vec3 p = o + d * hit;
  for (int i = 0; i < 4; i++) { if (i >= u_edgeCount) break; float gap = u_edges[i].w - dot(u_edges[i].xyz, p); if (gap < -1e-6) return false; edge = min(edge, max(0.0, gap)); }
  normal = vec3(0.0, 0.0, d.z < 0.0 ? 1.0 : -1.0);
  return true;
}

// A stack stores only rays and cursors, never a mesh or expanded child tree.
// Bounds may overlap, so every surviving branch competes for the nearest hit.
bool trace(vec3 ray, float detail, bool envelope, out float hit, out vec3 normal, out vec3 shadingNormal, out float edge, out float cell, out bool complete) {
  hit = u_far; normal = vec3(0.0); shadingNormal = vec3(0.0); edge = 0.0; cell = 0.0; complete = true;
  bool found = false;
  vec3 origins[40]; vec3 directions[40]; float sizes[40]; float ranks[40]; int cursors[40];
  int visits = 0;
  for (int rootIndex = 0; rootIndex < 512; rootIndex++) {
    if (rootIndex >= u_rootCount) break;
    Transform root = readTransform(u_roots, rootIndex);
    origins[0] = inverseVector(root, -root.center); directions[0] = inverseVector(root, ray); sizes[0] = root.size; ranks[0] = root.rank; cursors[0] = -1;
    int level = 0;
    for (int step = 0; step < 4096; step++) {
      if (level < 0) break;
      if (++visits > 4096) { complete = false; return found; }
      if (cursors[level] == -1) {
        float nearAt, farAt; vec3 boundNormal;
        if (!hullInterval(origins[level], directions[level], hit, nearAt, farAt, boundNormal)) { level--; continue; }
        if (max(0.0, nearAt) >= hit) { level--; continue; }
        float footprint = max(u_nearFootprint, max(0.0, nearAt) * u_pixelAngle) * detail;
        // Descend only when the new child features have enough pixel samples.
        // Stopping when the parent itself reaches two pixels creates subpixel holes.
        bool small = sizes[level] * u_featureSize <= footprint;
        if (small || ranks[level] >= u_maxRank || level == 39) {
          float t, e; vec3 n;
          bool intersects;
          if (envelope) { t = max(0.0, nearAt); n = boundNormal; e = 1e30; intersects = true; }
          else intersects = leaf(origins[level], directions[level], hit, t, n, e);
          if (intersects) {
            vec3 smoothNormal = n;
            for (int j = 39; j > 0; j--) if (j <= level) {
              Transform child = readChild(cursors[j - 1] - 1, directions[j - 1]);
              n = child.axes * n / child.size;
              smoothNormal = child.axes * smoothNormal / child.size;
              if (u_kind > 0 && !envelope) {
                // A newly resolved bump starts with its enclosing patch's light.
                // Reveal its own normal only as its feature gains pixel samples.
                float childFootprint = max(u_nearFootprint, t * u_pixelAngle) * detail;
                float reveal = smoothstep(1.0, 3.0, sizes[j - 1] * u_featureSize / max(childFootprint, 1e-20));
                vec3 parentNormal = vec3(0.0, 0.0, directions[j - 1].z < 0.0 ? 1.0 : -1.0);
                smoothNormal = mix(parentNormal, smoothNormal, reveal);
              }
            }
            normal = normalize(root.axes * n);
            shadingNormal = length(smoothNormal) > 1e-5 ? normalize(root.axes * smoothNormal) : normal;
            hit = t; edge = e * sizes[level]; cell = sizes[level]; found = true;
          }
          level--; continue;
        }
        cursors[level] = 0;
      }
      int childIndex = cursors[level]++;
      if (childIndex >= u_childCount) { level--; continue; }
      Transform child = readChild(childIndex, directions[level]);
      origins[level + 1] = inverseVector(child, origins[level] - child.center);
      directions[level + 1] = inverseVector(child, directions[level]);
      sizes[level + 1] = sizes[level] * child.size; ranks[level + 1] = ranks[level] + child.rank; cursors[level + 1] = -1; level++;
    }
    if (level >= 0) { complete = false; return found; }
  }
  return found;
}

// Branch-and-bound nearest enclosing hull. At a leaf this is a conservative
// distance to all unresolved descendants, including surfaces facing away.
float clearance() {
  float nearest = u_far;
  vec3 origins[40]; float sizes[40]; float ranks[40]; int cursors[40];
  int visits = 0;
  for (int rootIndex = 0; rootIndex < 512; rootIndex++) {
    if (rootIndex >= u_rootCount) break;
    Transform root = readTransform(u_roots, rootIndex);
    origins[0] = inverseVector(root, -root.center); sizes[0] = root.size; ranks[0] = root.rank; cursors[0] = -1;
    int level = 0;
    for (int step = 0; step < 8192; step++) {
      if (level < 0) break;
      if (++visits > 8192) return 0.0;
      if (cursors[level] == -1) {
        float lower = hullDistance(origins[level]) * sizes[level];
        if (lower >= nearest) { level--; continue; }
        if (sizes[level] * u_radius <= max(0.00002, lower * 0.03) || level == 39 || ranks[level] >= u_maxRank) {
          nearest = min(nearest, lower); level--; continue;
        }
        cursors[level] = 0;
      }
      int childIndex = cursors[level]++;
      if (childIndex >= u_childCount) { level--; continue; }
      Transform child = readChild(childIndex, -origins[level]);
      origins[level + 1] = inverseVector(child, origins[level] - child.center);
      sizes[level + 1] = sizes[level] * child.size; ranks[level + 1] = ranks[level] + child.rank; cursors[level + 1] = -1; level++;
    }
    if (level >= 0) return 0.0;
  }
  return nearest;
}
vec4 encodeDistance(float distance, bool hit) {
  // Query target is RGBA8, so it works without float color-buffer extensions.
  uint bits = floatBitsToUint(hit ? distance : -1.0);
  return vec4(float(bits & 255u), float((bits >> 8u) & 255u), float((bits >> 16u) & 255u), float((bits >> 24u) & 255u)) / 255.0;
}
void main() {
  outSurface = vec4(0.5, 0.5, 1.0, 1.0);
  if (u_query == 2) { outColor = encodeDistance(clearance(), true); return; }
  vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution) / min(u_resolution.x, u_resolution.y);
  vec3 ray = u_query == 1 || u_query == 3 ? normalize(u_queryRay) : normalize(u_forward + (uv.x * u_right + uv.y * u_up) / u_focal);
  float hit, edge, cell; vec3 normal, shadingNormal; bool complete; bool found = false;
  float detail = u_detailScale;
  for (int attempt = 0; attempt < 5; attempt++) {
    found = trace(ray, detail, false, hit, normal, shadingNormal, edge, cell, complete);
    if (complete) break;
    detail *= 4.0;
  }
  // A complete final traversal at root scale is bounded by the root count.
  bool exhausted = !complete;
  if (!complete) found = trace(ray, 1e30, true, hit, normal, shadingNormal, edge, cell, complete);
  if (u_query == 1) { outColor = encodeDistance(hit, found); return; }
  if (u_query == 3) { outColor = vec4(normal * 0.5 + 0.5, found ? (exhausted ? 0.5 : 1.0) : 0.0); return; }
  vec3 color = u_background;
  if (found) {
    if (dot(normal, ray) > 0.0) normal = -normal;
    vec3 viewNormal = vec3(dot(normal, u_right), dot(normal, u_up), -dot(normal, u_forward));
    vec3 oct = viewNormal / (abs(viewNormal.x) + abs(viewNormal.y) + abs(viewNormal.z));
    vec2 encoded = oct.xy;
    if (oct.z < 0.0) encoded = (1.0 - abs(encoded.yx)) * mix(vec2(-1.0), vec2(1.0), step(vec2(0.0), encoded));
    float encodedDepth = clamp(log2(1.0 + hit * dot(ray, u_forward)) / log2(1.0 + u_far), 0.0, 0.998);
    float coarseDepth = floor(encodedDepth * 255.0) / 255.0;
    outSurface = vec4(encoded * 0.5 + 0.5, coarseDepth, (encodedDepth - coarseDepth) * 255.0);
    if (dot(shadingNormal, ray) > 0.0) shadingNormal = -shadingNormal;
    float diffuse = max(0.0, dot(shadingNormal, normalize(vec3(-0.5, 0.8, 0.6))));
    float light = 0.38 + 0.62 * diffuse + 0.15 * max(0.0, dot(shadingNormal, -ray));
    vec3 illumination = vec3(light);
    if (u_lighting == 1 && u_faces) {
      vec3 key = normalize(-0.65 * u_right + 0.85 * u_up - 0.65 * u_forward);
      vec3 ambient = mix(vec3(0.27, 0.30, 0.36), vec3(0.36, 0.36, 0.33), 0.5 + 0.5 * dot(shadingNormal, u_up));
      illumination = min(vec3(1.0), ambient + 0.82 * max(0.0, dot(shadingNormal, key)) * vec3(1.04, 1.0, 0.94));
      float relief = max(0.0, hit * dot(ray, u_forward) - u_reliefFront) * 96.0 * u_fogScale;
      illumination *= 0.55 + 0.45 * exp(-0.9 * relief);
    }
    float pixel = max(u_nearFootprint, hit * u_pixelAngle);
    float outline = 1.0 - smoothstep(pixel * u_lineWidth * 0.25, pixel * (u_lineWidth * 0.25 + 0.6), edge);
    outline *= smoothstep(2.0, 8.0, cell / pixel);
    color = u_fill * illumination;
    if (u_wire) color = mix(color, u_stroke * illumination, outline * (u_faces ? (u_lighting == 1 ? 0.18 : 0.25) : 1.0));
    if (!u_faces) color = mix(u_background, color, u_wire ? outline : 0.0);
    float fog = clamp((1.0 - exp(-4.0 * max(0.0, hit * u_fogScale - 0.2 / 96.0))) / (1.0 - exp(-4.0 * (1.0 - 0.2 / 96.0))), 0.0, 1.0);
    vec3 atmosphere = u_background;
    if (u_lighting == 1 && u_faces) atmosphere = mix(u_background, vec3(0.13, 0.18, 0.23), 0.3 * (1.0 - fog));
    color = mix(color, atmosphere, fog);
  }
  // Subpixel contact shading otherwise recreates the same noisy facet contrast.
  // Alpha is an internal AO weight; the final screen pass remains fully opaque.
  float aoWeight = found ? smoothstep(2.0, 8.0, cell * (u_kind == 2 ? 2.0 : 1.0) * abs(dot(normal, ray)) / max(u_nearFootprint, hit * u_pixelAngle)) : 0.0;
  outColor = vec4(color, aoWeight);
}
