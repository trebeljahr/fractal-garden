#version 300 es
#ifndef SPATIAL_STACK_DEPTH
#define SPATIAL_STACK_DEPTH 40
#endif
precision highp float;
precision highp int;
#if defined(ROMANESCO_DEFER_NORMALS) && !defined(ROMANESCO_BEAM_PASS)
#define ROMANESCO_DELAYED_NORMALS
#endif
uniform highp sampler2D u_roots;
uniform highp sampler2D u_children;
uniform highp usampler2D u_childBounds;
#ifdef ROMANESCO_UNIFORM_GEOMETRY
#ifndef ROMANESCO_UNIFORM_CHILD_CAPACITY
#define ROMANESCO_UNIFORM_CHILD_CAPACITY 112
#endif
#define ROMANESCO_UNIFORM_BOUNDS_HALF_CAPACITY (4 * (2 * ROMANESCO_UNIFORM_CHILD_CAPACITY - 1))
// Each block fits WebGL2's guaranteed 16 KiB uniform-block capacity.
layout(std140) uniform RomanescoChildren {
  vec4 romanescoTransforms[4 * ROMANESCO_UNIFORM_CHILD_CAPACITY];
  uvec4 romanescoOrder[2 * ROMANESCO_UNIFORM_CHILD_CAPACITY];
};
layout(std140) uniform RomanescoBounds0 { uvec4 romanescoBounds0[ROMANESCO_UNIFORM_BOUNDS_HALF_CAPACITY]; };
layout(std140) uniform RomanescoBounds1 { uvec4 romanescoBounds1[ROMANESCO_UNIFORM_BOUNDS_HALF_CAPACITY]; };
#endif
uniform int u_childBoundsCount;
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
uniform float u_coneSlope;
uniform float u_boundConeSlope;
uniform float u_boundConeBase;
uniform float u_boundCylinderRadius;
uniform vec2 u_resolution;
uniform vec3 u_right;
uniform vec3 u_up;
uniform vec3 u_forward;
uniform float u_focal;
uniform vec2 u_projection;
uniform vec2 u_origin;
uniform float u_pixelAngle;
uniform float u_detailScale;
uniform float u_nearFootprint;
uniform float u_far;
uniform float u_maxRank;
uniform float u_growth;
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
#ifdef ROMANESCO_BEAM_PASS
layout(location=0) out highp uvec4 outBeam0;
layout(location=1) out highp uvec4 outBeam1;
layout(location=2) out highp uvec4 outBeam2;
layout(location=3) out highp uvec4 outBeam3;
uvec4 beamWinningPath = uvec4(0u);
void storeBeamPathRow(inout uvec4 path, int at, uint row) {
  int bit = 14 + at * 10, word = bit / 32, shift = bit % 32;
  path[word] |= row << uint(shift);
  if (shift > 22) path[word + 1] |= row >> uint(32 - shift);
}
uint readBeamPathRow(uvec4 path, int at) {
  int bit = 14 + at * 10, word = bit / 32, shift = bit % 32;
  uint row = path[word] >> uint(shift);
  if (shift > 22) row |= path[word + 1] << uint(32 - shift);
  return row & 1023u;
}
#else
layout(location=0) out vec4 outColor;
layout(location=1) out vec4 outSurface;
#endif
#ifdef ROMANESCO_BEAM_USE
uniform highp usampler2D u_beam0;
uniform highp usampler2D u_beam1;
uniform highp usampler2D u_beam2;
uniform highp usampler2D u_beam3;
uniform bool u_useBeam;
bool beamForceBaseline = false, beamAmbiguous = false;
uint beamDescriptor(ivec2 tile, int index) {
  int at = index + 1;
  if (at < 4) return texelFetch(u_beam0, tile, 0)[at];
  if (at < 8) return texelFetch(u_beam1, tile, 0)[at - 4];
  if (at < 12) return texelFetch(u_beam2, tile, 0)[at - 8];
  return texelFetch(u_beam3, tile, 0)[at - 12];
}
#endif
#if defined(ROMANESCO_BEAM_USE) || defined(ROMANESCO_BEAM_PASS)
// A variable-length base-N code stores three invariant child rows in 21 bits.
// Appending child i maps code c to c*N+i+1; zero is the empty root prefix.
int beamRootIndex(uint descriptor) { return int(descriptor & 511u); }
uint beamCode(uint descriptor) { return (descriptor >> 9u) & 2097151u; }
int beamDepth(uint code) {
  uint n = uint(u_childCount);
  return code > n * (n + 1u) ? 3 : code > n ? 2 : code > 0u ? 1 : 0;
}
int beamChildRow(uint code, int depth, int at) {
  uint n = uint(u_childCount);
  for (int i = 0; i < 2; i++) {
    if (i >= depth - at - 1) break;
    code = (code - 1u) / n;
  }
  return int((code - 1u) % n);
}
#endif

#ifdef TRAVERSAL_DIAGNOSTICS
int debugVisits = 0, debugTransforms = 0, debugBounds = 0, debugNormalSteps = 0, debugHits = 0;
#define COUNT_VISIT debugVisits++
#define COUNT_TRANSFORM debugTransforms++
#define COUNT_BOUNDS debugBounds++
#define COUNT_NORMAL debugNormalSteps++
#define COUNT_HIT debugHits++
#else
#define COUNT_VISIT
#define COUNT_TRANSFORM
#define COUNT_BOUNDS
#define COUNT_NORMAL
#define COUNT_HIT
#endif

struct Transform { vec3 center; mat3 axes; float rank; float size; int flags; };
Transform readTransform(sampler2D source, int index) {
  COUNT_TRANSFORM;
  vec4 c = texelFetch(source, ivec2(0, index), 0);
  vec4 first = texelFetch(source, ivec2(1, index), 0);
  vec4 second = texelFetch(source, ivec2(2, index), 0);
  mat3 m = mat3(first.xyz,
                second.xyz,
                texelFetch(source, ivec2(3, index), 0).xyz);
  float size = u_kind == 3 ? second.w : length(m[0]);
  return Transform(c.xyz, m, c.w, size, int(first.w));
}
int canonicalChildIndex(int index) {
#ifdef ROMANESCO_UNIFORM_GEOMETRY
  return int(romanescoOrder[index / 4][index % 4]);
#else
  return int(texelFetch(u_children, ivec2(3, index), 0).w);
#endif
}
Transform readCanonicalChild(int index) {
#ifdef ROMANESCO_UNIFORM_GEOMETRY
  COUNT_TRANSFORM;
  int at = index * 4;
  vec4 c = romanescoTransforms[at], first = romanescoTransforms[at + 1], second = romanescoTransforms[at + 2];
  return Transform(c.xyz, mat3(first.xyz, second.xyz, romanescoTransforms[at + 3].xyz), c.w, second.w, int(first.w));
#else
  return readTransform(u_children, index);
#endif
}
Transform readChildTransform(int index) {
#ifdef ROMANESCO_UNIFORM_GEOMETRY
  return readCanonicalChild(canonicalChildIndex(index));
#else
  return readTransform(u_children, index);
#endif
}
#ifdef QUADRATIC_KOCH
// Keep the octant in the existing cursor: 13 children fit in four bits.
// This avoids recalculating the same order at every child and normal unwind.
int childCursor(vec3 direction) {
  int octant = (direction.x >= 0.0 ? 1 : 0) + (direction.y >= 0.0 ? 2 : 0) + (direction.z >= 0.0 ? 4 : 0);
  return u_orderedChildren ? octant * 16 : 0;
}
Transform readChild(int index, vec3 direction) {
  COUNT_TRANSFORM;
  int at = (index >> 4) * 13 + (index & 15);
  // The center identifies all 13 quadratic transforms. Reconstructing their
  // signed axes saves three texture reads without changing the float operations.
  vec4 c = texelFetch(u_children, ivec2(0, at), 0);
  const float third = 1.0 / 3.0;
  mat3 m = mat3(third);
  if (c.z > 0.0 && c.z < 0.5) {
    if (c.x != 0.0) {
      float s = sign(c.x) * third;
      m = mat3(vec3(0,0,-s), vec3(0,third,0), vec3(s,0,0));
    } else {
      float s = sign(c.y) * third;
      m = mat3(vec3(third,0,0), vec3(0,0,-s), vec3(0,s,0));
    }
  }
  return Transform(c.xyz, m, c.w, length(m[0]), 0);
}
#else
Transform readChild(int index, vec3 direction) {
  int octant = (direction.x >= 0.0 ? 1 : 0) + (direction.y >= 0.0 ? 2 : 0) + (direction.z >= 0.0 ? 4 : 0);
  return readChildTransform(index + (u_orderedChildren ? octant * u_childCount : 0));
}
#endif
Transform growChild(Transform child, float parentRank) {
  if (u_kind == 3 && parentRank + child.rank == u_maxRank) {
    child.center += child.axes[1] * (u_growth - 1.0);
    child.axes *= u_growth;
    child.size *= u_growth;
  }
  return child;
}
int boundsOctant(vec3 direction) {
  return u_orderedChildren ? (direction.x >= 0.0 ? 1 : 0) + (direction.y >= 0.0 ? 2 : 0) + (direction.z >= 0.0 ? 4 : 0) : 0;
}
bool usesChildBounds() { return u_kind == 3 && u_childBoundsCount > 0; }
Transform readNormalChild(int cursor, vec3 direction) {
#ifdef ROMANESCO_BEAM_USE
  // Prefixes replay a globally indexed row; the fine ray can use another octant.
  if ((cursor & 1073741824) != 0) return readCanonicalChild(cursor & 1023);
#endif
  return readChild(usesChildBounds() ? (cursor >> 16) - 1 : cursor - 1, direction);
}
void readChildBounds(int index, out vec3 low, out vec3 high, out int child, out int escape) {
  COUNT_BOUNDS;
  uvec4 encoded;
#ifdef ROMANESCO_UNIFORM_GEOMETRY
  encoded = index < ROMANESCO_UNIFORM_BOUNDS_HALF_CAPACITY ? romanescoBounds0[index] : romanescoBounds1[index - ROMANESCO_UNIFORM_BOUNDS_HALF_CAPACITY];
#else
  encoded = texelFetch(u_childBounds, ivec2(0, index), 0);
#endif
  vec2 x = unpackHalf2x16(encoded.x), y = unpackHalf2x16(encoded.y), z = unpackHalf2x16(encoded.z);
  low = vec3(x.x, y.x, z.x); high = vec3(x.y, y.y, z.y);
  child = int(encoded.w & 65535u) - 1; escape = int(encoded.w >> 16u);
}
bool childBoxRay(vec3 o, vec3 inverse, float error, vec3 low, vec3 high, float limit) {
  vec3 a = (low - vec3(error) - o) * inverse, b = (high + vec3(error) - o) * inverse;
  vec3 enter = min(a, b), leave = max(a, b);
  return max(0.0, max(enter.x, max(enter.y, enter.z))) <= min(limit, min(leave.x, min(leave.y, leave.z)));
}
int nextLinearChild(inout int cursor) {
  int child = cursor++;
#ifdef QUADRATIC_KOCH
  return (child & 15) < u_childCount ? child : -1;
#else
  return child < u_childCount ? child : -1;
#endif
}
int nextRayChild(inout int cursor, vec3 o, vec3 d, float limit) {
  if (!usesChildBounds()) return nextLinearChild(cursor);
  int position = cursor & 65535, offset = boundsOctant(d) * u_childBoundsCount;
  // These values belong to the ray, not an AABB. Compute them once before
  // walking the texture rather than repeating three divisions per BVH node.
  float error = 0.0000005 * max(abs(o.x), max(abs(o.y), abs(o.z)));
  vec3 inverse = 1.0 / mix(vec3(1e-30), d, greaterThan(abs(d), vec3(1e-30)));
  // Every escape strictly advances. The finite texture bounds this loop; no
  // child or intersecting subtree is dropped to satisfy an iteration cap.
  while (position < u_childBoundsCount) {
    vec3 low, high; int child, escape;
    readChildBounds(offset + position, low, high, child, escape);
    if (!childBoxRay(o, inverse, error, low, high, limit)) { position = escape; continue; }
    if (child >= 0) {
      // Keep the selected transform alongside the next BVH cursor, so normal
      // reconstruction needs no extra per-ray stack array.
      cursor = ((child + 1) << 16) | escape;
      return child;
    }
    position++;
  }
  return -1;
}
int nextClearanceChild(inout int cursor, vec3 o, float size, float nearest) {
  if (!usesChildBounds()) return nextLinearChild(cursor);
  int position = cursor & 65535, offset = boundsOctant(-o) * u_childBoundsCount;
  float error = 0.0000005 * max(abs(o.x), max(abs(o.y), abs(o.z)));
  while (position < u_childBoundsCount) {
    vec3 low, high; int child, escape;
    readChildBounds(offset + position, low, high, child, escape);
    vec3 delta = max(vec3(0.0), max(low - vec3(error) - o, o - high - vec3(error)));
    if (length(delta) * size >= nearest) { position = escape; continue; }
    if (child >= 0) { cursor = ((child + 1) << 16) | escape; return child; }
    position++;
  }
  return -1;
}
vec3 inverseVector(Transform t, vec3 v) { return transpose(t.axes) * v / (t.size * t.size); }
#ifdef QUADRATIC_KOCH
// Same six plane divisions and parallel tolerance as the generic hull. Strict
// x/y/z entry comparisons retain its tie order at touching edges and corners.
bool quadraticHullInterval(vec3 o, vec3 d, float limit, out float nearAt, out float farAt, out vec3 normal) {
  bvec3 parallel = lessThan(abs(d), vec3(1e-20));
  vec3 upper = vec3(1.0) - o, lower = vec3(1.0, 1.0, 0.0) + o;
  if (any(bvec3(parallel.x && min(upper.x,lower.x) < -1e-6,
                parallel.y && min(upper.y,lower.y) < -1e-6,
                parallel.z && min(upper.z,lower.z) < -1e-6))) return false;
  vec3 velocity = mix(d, vec3(1.0), parallel);
  vec3 a = upper / velocity, b = lower / -velocity;
  bvec3 positive = greaterThan(d, vec3(0.0));
  vec3 starts = mix(mix(a, b, positive), vec3(-1e30), parallel);
  vec3 ends = mix(mix(b, a, positive), vec3(limit), parallel);
  nearAt = -1e30; normal = vec3(0.0);
  if (starts.x > nearAt) { nearAt = starts.x; normal = vec3(d.x < 0.0 ? 1.0 : -1.0,0,0); }
  if (starts.y > nearAt) { nearAt = starts.y; normal = vec3(0,d.y < 0.0 ? 1.0 : -1.0,0); }
  if (starts.z > nearAt) { nearAt = starts.z; normal = vec3(0,0,d.z < 0.0 ? 1.0 : -1.0); }
  farAt = min(limit, min(ends.x, min(ends.y, ends.z)));
  return farAt >= max(0.0, nearAt);
}
bool hullInterval(vec3 o, vec3 d, float limit, out float nearAt, out float farAt, out vec3 normal) {
  return quadraticHullInterval(o, d, limit, nearAt, farAt, normal);
}
#else
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
#endif
float hullDistance(vec3 o) {
#ifdef QUADRATIC_KOCH
  return max(0.0, max(max(abs(o.x) - 1.0, abs(o.y) - 1.0), max(-o.z, o.z - 1.0)));
#else
  float distance = 0.0;
  for (int i = 0; i < 20; i++) { if (i >= u_hullCount) break; distance = max(distance, dot(u_hull[i].xyz, o) - u_hull[i].w); }
  return distance;
#endif
}
bool sphereInterval(vec3 o, vec3 d, float radius, float limit, out float nearAt, out float farAt, out vec3 normal) {
  // Work at closest approach. b*b-a*c loses the whole small sphere when
  // the ray starts many sphere radii away in a descendant's coordinates.
  float a = dot(d, d), middle = -dot(o, d) / a;
  vec3 closest = o + middle * d;
  float paddedRadius = radius + 0.0000005 * length(o);
  float gap = paddedRadius * paddedRadius - dot(closest, closest);
  if (gap < 0.0) return false;
  float span = sqrt(max(0.0, gap) / a);
  nearAt = middle - span; farAt = min(limit, middle + span);
  normal = normalize(closest - span * d);
  return farAt >= max(0.0, nearAt);
}
float boundDistance(vec3 o) {
  return hullDistance(o);
}
float coneDistance(vec3 o) {
  float side = (length(o.xz) - u_coneSlope * (1.0 - o.y)) / sqrt(1.0 + u_coneSlope * u_coneSlope);
  return max(0.0, max(side, max(-1.0 - o.y, o.y - 1.0)));
}
// Stable quadratic roots, including the linear limiting surface of a huge cone.
bool quadratic(float a, float b, float c, out vec2 roots) {
  if (abs(a) < 1e-20) {
    if (abs(b) < 1e-20) return false;
    roots = vec2(-c / b); return true;
  }
  float discriminant = b * b - 4.0 * a * c;
  if (discriminant < 0.0) return false;
  float q = -0.5 * (b + (b >= 0.0 ? 1.0 : -1.0) * sqrt(max(0.0, discriminant)));
  if (abs(q) < 1e-30) roots = vec2(-b / (2.0 * a));
  else { roots = vec2(q / a, c / q); if (roots.x > roots.y) roots = roots.yx; }
  return true;
}
bool coneEnvelopeInterval(vec3 o, vec3 d, float limit, out float nearAt, out float farAt, out vec3 normal) {
  float k = u_boundConeSlope, k2 = k * k;
  // Expand only the culling envelope by the local Float32 origin error. The
  // core surface stays exact, including distant cones smaller than a pixel.
  float error = 0.0000005 * max(1.0, max(abs(o.x), max(abs(o.y), abs(o.z))));
  float tip = 1.0 + error / k, base = u_boundConeBase - error;
  float shift = -dot(o, d) / dot(d, d);
  o += shift * d;
  float enter = -1e30, leave = limit - shift;
  if (abs(d.y) < 1e-20) {
    if (o.y < base || o.y > tip) return false;
  } else {
    float a = (base - o.y) / d.y, b = (tip - o.y) / d.y;
    enter = min(a, b); leave = min(leave, max(a, b));
  }
  float a = dot(d.xz, d.xz) - k2 * d.y * d.y;
  float b = 2.0 * (dot(o.xz, d.xz) + k2 * (tip - o.y) * d.y);
  float c = dot(o.xz, o.xz) - k2 * (tip - o.y) * (tip - o.y);
  vec2 roots;
  if (abs(a) < 1e-20) {
    if (abs(b) < 1e-20) { if (c > 0.0) return false; }
    else if (b > 0.0) leave = min(leave, -c / b);
    else enter = max(enter, -c / b);
  } else if (quadratic(a, b, c, roots)) {
    if (a > 0.0) { enter = max(enter, roots.x); leave = min(leave, roots.y); }
    // A downward cone occupies only the below-tip branch of a double cone.
    else if (d.y > 0.0) leave = min(leave, roots.x);
    else enter = max(enter, roots.y);
  } else if (a > 0.0) return false;
  if (u_boundCylinderRadius > 0.0) {
    float radius = u_boundCylinderRadius + error;
    float radialSpeed = dot(d.xz, d.xz);
    if (radialSpeed < 1e-30) {
      if (dot(o.xz, o.xz) > radius * radius) return false;
    } else {
      // Closest approach avoids subtracting two large squared eye distances.
      float middle = -dot(o.xz, d.xz) / radialSpeed;
      vec2 closest = o.xz + middle * d.xz;
      float gap = radius * radius - dot(closest, closest);
      if (gap < 0.0) return false;
      float span = sqrt(max(0.0, gap) / radialSpeed);
      enter = max(enter, middle - span); leave = min(leave, middle + span);
    }
  }
  nearAt = enter + shift; farAt = leave + shift;
  if (farAt < max(0.0, nearAt)) return false;
  vec3 p = o + enter * d, gradient = vec3(p.x, k2 * (tip - p.y), p.z);
  normal = p.y <= base + error ? vec3(0.0, -1.0, 0.0)
      : u_boundCylinderRadius > 0.0 && length(p.xz) >= u_boundCylinderRadius ? normalize(vec3(p.x, 0.0, p.z))
      : dot(gradient, gradient) > 1e-24 ? normalize(gradient) : vec3(0.0, 1.0, 0.0);
  return true;
}
bool boundInterval(vec3 o, vec3 d, float limit, out float nearAt, out float farAt, out vec3 normal) {
  if (u_kind == 3) return coneEnvelopeInterval(o, d, limit, nearAt, farAt, normal);
  return hullInterval(o, d, limit, nearAt, farAt, normal);
}
bool coneLeaf(vec3 o, vec3 d, float limit, out float hit, out vec3 normal, out float edge) {
  // Rebase the ray beside this cone before forming the quadratic. Keeping the
  // eye as origin squares huge local coordinates and cancels their low bits.
  float shift = -dot(o, d) / dot(d, d);
  o += shift * d;
  float k2 = u_coneSlope * u_coneSlope;
  float a = dot(d.xz, d.xz) - k2 * d.y * d.y;
  float b = 2.0 * (dot(o.xz, d.xz) + k2 * (1.0 - o.y) * d.y);
  float c = dot(o.xz, o.xz) - k2 * (1.0 - o.y) * (1.0 - o.y);
  hit = limit; edge = 1e30; bool found = false; vec2 roots;
  if (quadratic(a, b, c, roots)) for (int i = 0; i < 2; i++) {
    float localAt = roots[i], t = shift + localAt, y = o.y + localAt * d.y;
    if (t >= 0.0 && t < hit && y >= -1.0 && y <= 1.0) {
      vec3 p = o + localAt * d;
      hit = t;
      vec3 gradient = vec3(p.x, k2 * (1.0 - p.y), p.z);
      normal = dot(gradient, gradient) > 1e-24 ? normalize(gradient) : vec3(0.0, 1.0, 0.0);
      edge = max(0.0, p.y + 1.0); found = true;
    }
  }
  if (abs(d.y) > 1e-20) {
    float localAt = (-1.0 - o.y) / d.y, t = shift + localAt;
    vec3 p = o + localAt * d;
    if (t >= 0.0 && t < hit && dot(p.xz, p.xz) <= 4.0 * k2) {
      hit = t; normal = vec3(0.0, -1.0, 0.0);
      edge = max(0.0, 2.0 * u_coneSlope - length(p.xz)); found = true;
    }
  }
  return found;
}
// Parent cores outside the local root scale are encoded as rebased quadratics.
// Their coefficients were evaluated before fixed-point coordinates became floats.
bool ancestorLeaf(int index, vec3 ray, float limit, out float hit, out vec3 normal) {
  vec4 equation = texelFetch(u_roots, ivec2(0, index), 0);
  vec4 orientation = texelFetch(u_roots, ivec2(1, index), 0);
  vec4 clips = texelFetch(u_roots, ivec2(2, index), 0);
  float k2 = u_coneSlope * u_coneSlope, along = dot(orientation.xyz, ray);
  float a = orientation.w * (dot(ray, ray) - (1.0 + k2) * along * along);
  float b = dot(equation.xyz, ray), c = equation.w;
  hit = limit; bool found = false; vec2 roots;
  if (quadratic(a, b, c, roots)) for (int i = 0; i < 2; i++) {
    float t = roots[i];
    if (t >= 0.0 && t < hit && clips.x + along * t >= 0.0 && clips.y - along * t >= 0.0) {
      hit = t;
      normal = normalize(equation.xyz + 2.0 * orientation.w * t * (ray - (1.0 + k2) * orientation.xyz * along));
      found = true;
    }
  }
  if (abs(along) > 1e-20) {
    float t = -clips.x / along;
    if (t >= 0.0 && t < hit && (a * t + b) * t + c <= 0.0) {
      hit = t; normal = -orientation.xyz; found = true;
    }
  }
  return found;
}
// Full convex intervals are needed only for an eye inside the retained union.
// Keeping the exit unbounded is essential: an overlapping floret can extend it.
bool coneSegment(vec3 o, vec3 d, out float enter, out float leave, out vec3 normal) {
  float shift = -dot(o, d) / dot(d, d);
  o += shift * d;
  float k2 = u_coneSlope * u_coneSlope;
  float a = dot(d.xz, d.xz) - k2 * d.y * d.y;
  float b = 2.0 * (dot(o.xz, d.xz) + k2 * (1.0 - o.y) * d.y);
  float c = dot(o.xz, o.xz) - k2 * (1.0 - o.y) * (1.0 - o.y);
  enter = 1e30; leave = -1e30; normal = vec3(0.0); vec2 roots;
  if (quadratic(a, b, c, roots)) for (int i = 0; i < 2; i++) {
    float localAt = roots[i], t = shift + localAt, y = o.y + localAt * d.y;
    if (y < -1.0 || y > 1.0) continue;
    enter = min(enter, t);
    if (t > leave) {
      leave = t;
      vec3 p = o + localAt * d, gradient = vec3(p.x, k2 * (1.0 - p.y), p.z);
      normal = dot(gradient, gradient) > 1e-24 ? normalize(gradient) : vec3(0.0, 1.0, 0.0);
    }
  }
  if (abs(d.y) > 1e-20) {
    float localAt = (-1.0 - o.y) / d.y, t = shift + localAt;
    vec3 p = o + localAt * d;
    if (dot(p.xz, p.xz) <= 4.0 * k2) {
      enter = min(enter, t);
      if (t > leave) { leave = t; normal = vec3(0.0, -1.0, 0.0); }
    }
    // A ray along a generator has an identically zero side quadratic. Its
    // apex still closes the interval; allow only Float32 cancellation error.
    localAt = (1.0 - o.y) / d.y; t = shift + localAt;
    p = o + localAt * d;
    float error = 0.0000002 * (length(o.xz) + abs(localAt) * length(d.xz));
    if (dot(p.xz, p.xz) <= error * error) {
      enter = min(enter, t);
      if (t >= leave) { leave = t; normal = vec3(0.0, 1.0, 0.0); }
    }
  }
  return leave >= max(0.0, enter);
}
bool ancestorSegment(int index, vec3 ray, out float enter, out float leave, out vec3 normal) {
  vec4 equation = texelFetch(u_roots, ivec2(0, index), 0);
  vec4 orientation = texelFetch(u_roots, ivec2(1, index), 0);
  vec4 clips = texelFetch(u_roots, ivec2(2, index), 0);
  float k2 = u_coneSlope * u_coneSlope, along = dot(orientation.xyz, ray);
  float a = orientation.w * (dot(ray, ray) - (1.0 + k2) * along * along);
  float b = dot(equation.xyz, ray), c = equation.w;
  enter = 1e30; leave = -1e30; normal = vec3(0.0); vec2 roots;
  if (quadratic(a, b, c, roots)) for (int i = 0; i < 2; i++) {
    float t = roots[i];
    if (clips.x + along * t < 0.0 || clips.y - along * t < 0.0) continue;
    enter = min(enter, t);
    if (t > leave) {
      leave = t;
      normal = normalize(equation.xyz + 2.0 * orientation.w * t * (ray - (1.0 + k2) * orientation.xyz * along));
    }
  }
  if (abs(along) > 1e-20) {
    float t = -clips.x / along;
    if ((a * t + b) * t + c <= 0.0) {
      enter = min(enter, t);
      if (t > leave) { leave = t; normal = -orientation.xyz; }
    }
    t = clips.y / along;
    vec3 delta = 2.0 * orientation.w * t * (ray - (1.0 + k2) * orientation.xyz * along);
    vec3 gradient = equation.xyz + delta;
    float error = 0.000002 * (length(equation.xyz) + length(delta));
    if (dot(gradient, gradient) <= error * error) {
      enter = min(enter, t);
      if (t >= leave) { leave = t; normal = orientation.xyz; }
    }
  }
  return leave >= max(0.0, enter);
}
bool leaf(vec3 o, vec3 d, float limit, out float hit, out vec3 normal, out float edge) {
  edge = 1e30;
  if (u_kind == 3) return coneLeaf(o, d, limit, hit, normal, edge);
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
bool traceNearest(vec3 ray, float detail, bool envelope, out float hit, out vec3 normal, out vec3 shadingNormal, out float edge, out float cell, out bool complete, out bool inside) {
  hit = u_far; normal = vec3(0.0); shadingNormal = vec3(0.0); edge = 0.0; cell = 0.0; complete = true;
  inside = false;
  bool found = false;
#ifdef ROMANESCO_BEAM_PASS
  beamWinningPath = uvec4(0u);
#endif
#ifdef ROMANESCO_BEAM_USE
  ivec2 tile = ivec2(gl_FragCoord.xy) / 8;
  uint header = u_useBeam ? texelFetch(u_beam0, tile, 0).x : 256u;
  bool useFrontier = u_useBeam && !beamForceBaseline && u_query == 0 && detail == u_detailScale && !envelope && (header & 256u) == 0u;
  int frontierCount = int(header & 31u);
  if (useFrontier && frontierCount > 0) {
    // The prepass proved a retained convex core hits every ray in this tile.
    // Its perspective-depth cap is an upper bound, not a substituted surface:
    // this pixel still traces all competing geometry and its own exact hit.
    float depthLimit = uintBitsToFloat(header & 4294966784u);
    hit = min(hit, depthLimit / max(dot(ray, u_forward), 1e-8));
  }
  Transform cachedRoot;
  int cachedRootIndex = -1, cachedFirstRow = -1;
  bool testedRootCore = false, cachedRootBound = false, cachedFirstBound = false;
  bool rootBoundValid = false, firstBoundValid = false;
  float rootNear = 0.0, firstNear = 0.0;
  uint testedFirstCore = 4294967295u, testedSecondCore = 4294967295u;
#endif
  vec3 origins[SPATIAL_STACK_DEPTH]; vec3 directions[SPATIAL_STACK_DEPTH]; float sizes[SPATIAL_STACK_DEPTH]; float ranks[SPATIAL_STACK_DEPTH]; int cursors[SPATIAL_STACK_DEPTH];
#ifdef QUADRATIC_KOCH
  // Keep failed child bounds out of the ray stacks. Carry the one surviving
  // interval into the next iteration without testing it twice.
  bool pendingBound = false;
  float pendingNear, pendingFar; vec3 pendingNormal;
  // Only the nearest patch contributes normals. Save its path for one replay.
  int bestPath[SPATIAL_STACK_DEPTH];
  int bestLevel = 0, bestRootIndex = -1; vec3 bestNormal = vec3(0.0);
#endif
#ifdef ROMANESCO_DELAYED_NORMALS
  int bestPath[SPATIAL_STACK_DEPTH];
  int bestLevel = 0, bestRootIndex = -1; vec3 bestNormal = vec3(0.0);
#endif
  int visits = 0;
  for (int rootSlot = 0; rootSlot < 512; rootSlot++) {
    int rootIndex = rootSlot, baseLevel = 0;
    bool coreOnly = false;
#ifdef ROMANESCO_BEAM_USE
    uint descriptor = 0u;
    if (useFrontier) {
      if (rootSlot >= frontierCount) break;
      descriptor = beamDescriptor(tile, rootSlot);
      rootIndex = beamRootIndex(descriptor);
      baseLevel = beamDepth(beamCode(descriptor));
      coreOnly = (descriptor & 2147483648u) != 0u;
    } else
#endif
    if (rootSlot >= u_rootCount) break;
    if (u_kind == 3 && texelFetch(u_roots, ivec2(3, rootIndex), 0).w > 0.5) {
      vec4 equation = texelFetch(u_roots, ivec2(0, rootIndex), 0), clips = texelFetch(u_roots, ivec2(2, rootIndex), 0);
      inside = inside || (equation.w <= 0.0 && clips.x >= 0.0 && clips.y >= 0.0);
      float t; vec3 n;
      float limit = hit;
#ifdef ROMANESCO_BEAM_USE
      if (useFrontier && found) limit = uintBitsToFloat(floatBitsToUint(hit) + 1u);
#endif
      if (ancestorLeaf(rootIndex, ray, limit, t, n)) {
#ifdef ROMANESCO_BEAM_USE
        if (useFrontier && found && t == hit) { beamAmbiguous = true; return found; }
#endif
        hit = t; normal = n; shadingNormal = n; edge = 1e30; cell = 1e30; found = true;
#ifdef ROMANESCO_DELAYED_NORMALS
        bestRootIndex = -1; // This ancestor already supplied a world-space normal.
#endif
#ifdef ROMANESCO_BEAM_PASS
        beamWinningPath = uvec4(1u | (uint(rootIndex) << 1u), 0u, 0u, 0u);
#endif
      }
      continue;
    }
    Transform root;
#ifdef ROMANESCO_BEAM_USE
    if (useFrontier && cachedRootIndex == rootIndex) root = cachedRoot;
    else {
#endif
      root = readTransform(u_roots, rootIndex);
      origins[0] = inverseVector(root, -root.center); directions[0] = inverseVector(root, ray); sizes[0] = root.size; ranks[0] = root.rank;
#ifdef ROMANESCO_BEAM_USE
      cachedRoot = root; cachedRootIndex = rootIndex; cachedFirstRow = -1;
      testedRootCore = false; testedFirstCore = testedSecondCore = 4294967295u;
      cachedRootBound = cachedFirstBound = false;
    }
#endif
    cursors[0] = -1;
#ifdef ROMANESCO_BEAM_USE
    // A subtree cannot change its ancestors' ray frames. Adjacent descriptors
    // can therefore share the root and their first prefix without recomputing
    // either transform. A whole-root traversal can overwrite that prefix.
    if (baseLevel == 0) { cachedFirstRow = -1; cachedFirstBound = false; }
    bool prefixValid = true;
    for (int depth = 0; depth < 3; depth++) {
      if (depth >= baseLevel) break;
      float nearAt, farAt; vec3 n;
      bool valid;
      if (depth == 0 && cachedRootBound) { nearAt = rootNear; valid = rootBoundValid; }
      else if (depth == 1 && cachedFirstBound) { nearAt = firstNear; valid = firstBoundValid; }
      else {
        // The unbounded entry and LOD do not change when another subtree finds
        // a nearer surface. Cache them, then apply only the current hit cutoff.
        valid = boundInterval(origins[depth], directions[depth], u_far, nearAt, farAt, n);
        if (depth == 0) { rootNear = nearAt; rootBoundValid = valid; cachedRootBound = true; }
        else if (depth == 1) { firstNear = nearAt; firstBoundValid = valid; cachedFirstBound = true; }
      }
      if (!valid || max(0.0, nearAt) > hit) { prefixValid = false; break; }
      float footprint = max(u_nearFootprint, max(0.0, nearAt) * u_pixelAngle) * detail;
      bool continuation = depth == 0 ? (root.flags & 1) != 0 : ranks[depth] == ranks[depth - 1];
      uint prefixCode = beamCode(descriptor);
      for (int i = 0; i < 3; i++) {
        if (i >= baseLevel - depth) break;
        prefixCode = (prefixCode - 1u) / uint(u_childCount);
      }
      bool tested = depth == 0 ? testedRootCore : depth == 1 ? testedFirstCore == prefixCode : testedSecondCore == prefixCode;
      if (!tested && !continuation) {
        // Prefix cores belong to the same retained union even when this pixel
        // stops at an ancestor. Test each once; descriptors need only subtrees.
        vec3 o = origins[depth]; float r = u_coneSlope * (1.0 - o.y);
        inside = inside || (o.y >= -1.0 && o.y <= 1.0 && dot(o.xz, o.xz) <= r * r);
        float t, e, limit = found ? uintBitsToFloat(floatBitsToUint(hit) + 1u) : hit;
        if (coneLeaf(o, directions[depth], limit, t, n, e)) {
          if (found && t == hit) { beamAmbiguous = true; return found; }
          COUNT_HIT;
#ifdef ROMANESCO_DELAYED_NORMALS
          bestRootIndex = rootIndex; bestLevel = depth; bestNormal = n;
          for (int j = 0; j < depth; j++) bestPath[j] = cursors[j];
#else
          vec3 smoothNormal = n;
          float childFootprint = max(u_nearFootprint, t * u_pixelAngle) * detail;
          for (int j = depth; j > 0; j--) {
            COUNT_NORMAL;
            Transform child = readNormalChild(cursors[j - 1], directions[j - 1]);
            n = child.axes * n / child.size;
            smoothNormal = child.axes * smoothNormal / child.size;
            vec3 p = origins[j - 1] + directions[j - 1] * t;
            float k2 = u_coneSlope * u_coneSlope;
            vec3 parentNormal = p.y <= -1.0 ? vec3(0.0, -1.0, 0.0)
                : normalize(vec3(p.x, max(0.0, k2 * (1.0 - p.y)), p.z));
            float reveal = smoothstep(2.0, 14.0, sizes[j] * 4.0 * u_coneSlope / max(childFootprint, 1e-20));
            smoothNormal = mix(parentNormal, smoothNormal, reveal);
          }
          normal = normalize(root.axes * n);
          shadingNormal = length(smoothNormal) > 1e-5 ? normalize(root.axes * smoothNormal) : normal;
#endif
          hit = t; edge = e * sizes[depth]; cell = sizes[depth]; found = true;
        }
      }
      if (depth == 0) testedRootCore = true;
      else if (depth == 1) testedFirstCore = prefixCode;
      else testedSecondCore = prefixCode;
      if (ranks[depth] >= u_maxRank || sizes[depth] * u_featureSize <= footprint || depth == SPATIAL_STACK_DEPTH - 1) { prefixValid = false; break; }
      int row = beamChildRow(beamCode(descriptor), baseLevel, depth);
      if (depth == 0 && cachedFirstRow == row) {
        cursors[0] = 1073741824 | row; cursors[1] = -1;
        continue;
      }
      Transform child = growChild(readCanonicalChild(row), ranks[depth]);
      if (child.size <= 0.0 || (continuation && (child.flags & 2) != 0)) { prefixValid = false; break; }
      cursors[depth] = 1073741824 | row;
      origins[depth + 1] = inverseVector(child, origins[depth] - child.center);
      directions[depth + 1] = inverseVector(child, directions[depth]);
      sizes[depth + 1] = sizes[depth] * child.size; ranks[depth + 1] = ranks[depth] + child.rank; cursors[depth + 1] = -1;
      if (depth == 0) { cachedFirstRow = row; cachedFirstBound = false; }
    }
    if (!prefixValid) continue;
#endif
    int level = baseLevel;
#ifdef QUADRATIC_KOCH
    pendingBound = false;
#endif
    for (int step = 0; step < 65536; step++) {
      if (level < baseLevel) break;
      if (++visits > (u_kind == 3 ? 65536 : 4096)) {
        complete = false;
#if defined(QUADRATIC_KOCH) || defined(ROMANESCO_DELAYED_NORMALS)
        break;
#else
        return found;
#endif
      }
      bool continuation = u_kind == 3 && (level == 0 ? (root.flags & 1) != 0 : ranks[level] == ranks[level - 1]);
      if (cursors[level] == -1) {
        COUNT_VISIT;
        float nearAt, farAt; vec3 boundNormal;
#ifdef QUADRATIC_KOCH
        if (pendingBound) {
          nearAt = pendingNear; farAt = pendingFar; boundNormal = pendingNormal; pendingBound = false;
        } else
#endif
        if (!boundInterval(origins[level], directions[level], hit, nearAt, farAt, boundNormal)) { level--; continue; }
        if (max(0.0, nearAt) >= hit) { level--; continue; }
        float footprint = max(u_nearFootprint, max(0.0, nearAt) * u_pixelAngle) * detail;
        // Descend only when the new child features have enough pixel samples.
        // Stopping when the parent itself reaches two pixels creates subpixel holes.
        bool small = sizes[level] * u_featureSize <= footprint;
        bool terminal = small || ranks[level] >= u_maxRank || level == SPATIAL_STACK_DEPTH - 1 || (coreOnly && level == baseLevel);
        if (terminal && continuation) { level--; continue; }
        // Romanesco retains its core at every scale; child buds add to the union.
        if ((terminal || u_kind == 3) && !continuation) {
          float t, e; vec3 n;
          if (u_kind == 3) {
            vec3 o = origins[level]; float r = u_coneSlope * (1.0 - o.y);
            inside = inside || (o.y >= -1.0 && o.y <= 1.0 && dot(o.xz, o.xz) <= r * r);
          }
          bool intersects;
          if (envelope && terminal) { t = max(0.0, nearAt); n = boundNormal; e = 1e30; intersects = true; }
          else {
            float limit = hit;
#ifdef ROMANESCO_BEAM_USE
            if (useFrontier && found) limit = uintBitsToFloat(floatBitsToUint(hit) + 1u);
#endif
            intersects = leaf(origins[level], directions[level], limit, t, n, e);
          }
          if (intersects) {
#ifdef ROMANESCO_BEAM_USE
            // Different frontiers can encounter an exactly tied seam in another
            // order. Repeat only that pixel in the canonical traversal order.
            if (useFrontier && found && t == hit) { beamAmbiguous = true; return found; }
#endif
            COUNT_HIT;
#ifdef ROMANESCO_BEAM_PASS
            beamWinningPath = uvec4(0u);
            if (!envelope && level <= 11 && u_childCount * 8 <= 1024) {
              beamWinningPath.x = 1u | (uint(rootIndex) << 1u) | (uint(level) << 10u);
              for (int j = 0; j < 11; j++) {
                if (j >= level) break;
                int childIndex = usesChildBounds() ? (cursors[j] >> 16) - 1 : cursors[j] - 1;
                storeBeamPathRow(beamWinningPath, j, uint(childIndex + boundsOctant(directions[j]) * u_childCount));
              }
            }
#endif
#ifdef QUADRATIC_KOCH
            bestRootIndex = rootIndex; bestLevel = level; bestNormal = n;
            for (int j = 0; j < level; j++) bestPath[j] = cursors[j] - 1;
#elif defined(ROMANESCO_DELAYED_NORMALS)
            bestRootIndex = rootIndex; bestLevel = level; bestNormal = n;
            for (int j = 0; j < level; j++) bestPath[j] = cursors[j];
#else
            vec3 smoothNormal = n;
            float childFootprint = max(u_nearFootprint, t * u_pixelAngle) * detail;
            for (int j = level; j > 0; j--) {
              COUNT_NORMAL;
              Transform child = readNormalChild(cursors[j - 1], directions[j - 1]);
              n = child.axes * n / child.size;
              smoothNormal = child.axes * smoothNormal / child.size;
              if ((u_kind == 1 || u_kind == 2) && !envelope) {
                // A newly resolved bump starts with its enclosing patch's light.
                // Reveal its own normal only as its feature gains pixel samples.
                float reveal = smoothstep(1.0, 3.0, sizes[j - 1] * u_featureSize / max(childFootprint, 1e-20));
                vec3 parentNormal = vec3(0.0, 0.0, directions[j - 1].z < 0.0 ? 1.0 : -1.0);
                smoothNormal = mix(parentNormal, smoothNormal, reveal);
              } else if (u_kind == 3 && !envelope) {
                // Tiny florets retain the enclosing floret's broad illumination.
                // The exact cone hit and geometric normal remain unchanged.
                vec3 p = origins[j - 1] + directions[j - 1] * t;
                float k2 = u_coneSlope * u_coneSlope;
                vec3 parentNormal = p.y <= -1.0 ? vec3(0.0, -1.0, 0.0)
                    : normalize(vec3(p.x, max(0.0, k2 * (1.0 - p.y)), p.z));
                float reveal = smoothstep(2.0, 14.0, sizes[j] * 4.0 * u_coneSlope / max(childFootprint, 1e-20));
                smoothNormal = mix(parentNormal, smoothNormal, reveal);
              }
            }
            normal = normalize(root.axes * n);
            shadingNormal = length(smoothNormal) > 1e-5 ? normalize(root.axes * smoothNormal) : normal;
#endif
            hit = t; edge = e * sizes[level]; cell = sizes[level]; found = true;
          }
          if (terminal) { level--; continue; }
        }
#ifdef QUADRATIC_KOCH
        cursors[level] = childCursor(directions[level]);
#else
        cursors[level] = 0;
#endif
      }
      int childIndex = nextRayChild(cursors[level], origins[level], directions[level], hit);
      if (childIndex < 0) { level--; continue; }
      Transform child = growChild(readChild(childIndex, directions[level]), ranks[level]);
      if (continuation && (child.flags & 2) != 0) continue;
      if (child.size <= 0.0) continue;
      if (u_kind == 3 && !usesChildBounds()) {
        float nearAt, farAt; vec3 boundNormal;
        if (!sphereInterval(origins[level] - child.center, directions[level], child.size * u_radius, hit, nearAt, farAt, boundNormal)) continue;
      }
#ifdef QUADRATIC_KOCH
      // The original loop would push here and exhaust its step budget before
      // entering the child. Preserve that cutoff and its fallback behavior.
      if (step == 65535) { complete = false; break; }
      vec3 childOrigin = inverseVector(child, origins[level] - child.center);
      vec3 childDirection = inverseVector(child, directions[level]);
      if (!boundInterval(childOrigin, childDirection, hit, pendingNear, pendingFar, pendingNormal) || max(0.0, pendingNear) >= hit) {
        // Account for the skipped child iteration; the traversal budget and
        // visit diagnostics must retain the same logical order.
        step++;
        if (++visits > 4096) { complete = false; break; }
        COUNT_VISIT;
        continue;
      }
      pendingBound = true;
      origins[level + 1] = childOrigin;
      directions[level + 1] = childDirection;
#else
      origins[level + 1] = inverseVector(child, origins[level] - child.center);
      directions[level + 1] = inverseVector(child, directions[level]);
#endif
      sizes[level + 1] = sizes[level] * child.size; ranks[level + 1] = ranks[level] + child.rank; cursors[level + 1] = -1; level++;
    }
    if (level >= baseLevel) {
      complete = false;
#if defined(QUADRATIC_KOCH) || defined(ROMANESCO_DELAYED_NORMALS)
      break;
#else
      return found;
#endif
    }
  }
#ifdef QUADRATIC_KOCH
  if (found && bestRootIndex >= 0) {
    Transform root = readTransform(u_roots, bestRootIndex);
    origins[0] = inverseVector(root, -root.center); directions[0] = inverseVector(root, ray);
    sizes[0] = root.size; ranks[0] = root.rank;
    for (int j = 0; j < bestLevel; j++) {
      // Growth can change the child scale, so replay the same transform used
      // by traversal rather than the ungrown template.
      Transform child = growChild(readChild(bestPath[j], directions[j]), ranks[j]);
      origins[j + 1] = inverseVector(child, origins[j] - child.center);
      directions[j + 1] = inverseVector(child, directions[j]);
      sizes[j + 1] = sizes[j] * child.size; ranks[j + 1] = ranks[j] + child.rank;
    }
    vec3 n = bestNormal, smoothNormal = n;
    float childFootprint = max(u_nearFootprint, hit * u_pixelAngle) * detail;
    for (int j = bestLevel; j > 0; j--) {
      COUNT_NORMAL;
      Transform child = readChild(bestPath[j - 1], directions[j - 1]);
      n = child.axes * n / child.size;
      smoothNormal = child.axes * smoothNormal / child.size;
      if (!envelope) {
        float reveal = smoothstep(1.0, 3.0, sizes[j - 1] * u_featureSize / max(childFootprint, 1e-20));
        vec3 parentNormal = vec3(0.0, 0.0, directions[j - 1].z < 0.0 ? 1.0 : -1.0);
        smoothNormal = mix(parentNormal, smoothNormal, reveal);
      }
    }
    normal = normalize(root.axes * n);
    shadingNormal = length(smoothNormal) > 1e-5 ? normalize(root.axes * smoothNormal) : normal;
  }
#endif
#ifdef ROMANESCO_DELAYED_NORMALS
  if (found && bestRootIndex >= 0) {
    Transform root = readTransform(u_roots, bestRootIndex);
    origins[0] = inverseVector(root, -root.center); directions[0] = inverseVector(root, ray);
    sizes[0] = root.size; ranks[0] = root.rank;
    for (int j = 0; j < bestLevel; j++) {
      // Replay the same grown transforms and arithmetic used by traversal.
      // Cursors also preserve canonical beam-prefix rows across octant changes.
      Transform child = growChild(readNormalChild(bestPath[j], directions[j]), ranks[j]);
      origins[j + 1] = inverseVector(child, origins[j] - child.center);
      directions[j + 1] = inverseVector(child, directions[j]);
      sizes[j + 1] = sizes[j] * child.size; ranks[j + 1] = ranks[j] + child.rank;
    }
    vec3 n = bestNormal, smoothNormal = n;
    float childFootprint = max(u_nearFootprint, hit * u_pixelAngle) * detail;
    for (int j = bestLevel; j > 0; j--) {
      COUNT_NORMAL;
      Transform child = readNormalChild(bestPath[j - 1], directions[j - 1]);
      n = child.axes * n / child.size;
      smoothNormal = child.axes * smoothNormal / child.size;
      if (!envelope) {
        vec3 p = origins[j - 1] + directions[j - 1] * hit;
        float k2 = u_coneSlope * u_coneSlope;
        vec3 parentNormal = p.y <= -1.0 ? vec3(0.0, -1.0, 0.0)
            : normalize(vec3(p.x, max(0.0, k2 * (1.0 - p.y)), p.z));
        float reveal = smoothstep(2.0, 14.0, sizes[j] * 4.0 * u_coneSlope / max(childFootprint, 1e-20));
        smoothNormal = mix(parentNormal, smoothNormal, reveal);
      }
    }
    normal = normalize(root.axes * n);
    shadingNormal = length(smoothNormal) > 1e-5 ? normalize(root.axes * smoothNormal) : normal;
  }
#endif
  return found;
}

// Merge all ray intervals connected to the eye. A later extension can expose
// an earlier branch, so only a complete unchanged pass proves the union exit.
bool traceUnionExit(vec3 ray, float detail, out float hit, out vec3 normal, out float cell, out bool complete) {
  hit = 0.0; normal = vec3(0.0); cell = 0.0; complete = true;
  vec3 origins[SPATIAL_STACK_DEPTH]; vec3 directions[SPATIAL_STACK_DEPTH]; float sizes[SPATIAL_STACK_DEPTH]; float ranks[SPATIAL_STACK_DEPTH]; int cursors[SPATIAL_STACK_DEPTH];
  int visits = 0;
  for (int pass = 0; pass < 64; pass++) {
    float previous = hit;
    for (int rootIndex = 0; rootIndex < 512; rootIndex++) {
      if (rootIndex >= u_rootCount) break;
      if (texelFetch(u_roots, ivec2(3, rootIndex), 0).w > 0.5) {
        float enter, leave; vec3 n;
        if (ancestorSegment(rootIndex, ray, enter, leave, n) && enter <= hit && leave > hit) {
          hit = leave; normal = n; cell = 1e30;
        }
        continue;
      }
      Transform root = readTransform(u_roots, rootIndex);
      origins[0] = inverseVector(root, -root.center); directions[0] = inverseVector(root, ray);
      sizes[0] = root.size; ranks[0] = root.rank; cursors[0] = -1;
      int level = 0;
      for (int step = 0; step < 65536; step++) {
        if (level < 0) break;
        if (++visits > 65536) { complete = false; return hit > 0.0 && hit < u_far; }
        bool continuation = level == 0 ? (root.flags & 1) != 0 : ranks[level] == ranks[level - 1];
        if (cursors[level] == -1) {
          float nearAt, farAt; vec3 n;
          if (!boundInterval(origins[level], directions[level], u_far, nearAt, farAt, n) || nearAt > hit || farAt <= hit) { level--; continue; }
          float footprint = max(u_nearFootprint, max(0.0, nearAt) * u_pixelAngle) * detail;
          bool terminal = sizes[level] * u_featureSize <= footprint || ranks[level] >= u_maxRank || level == SPATIAL_STACK_DEPTH - 1;
          float enter, leave;
          if (!continuation && coneSegment(origins[level], directions[level], enter, leave, n) && enter <= hit && leave > hit) {
            hit = leave; cell = sizes[level];
            for (int j = level; j > 0; j--) {
              Transform child = readNormalChild(cursors[j - 1], directions[j - 1]);
              n = child.axes * n / child.size;
            }
            normal = normalize(root.axes * n);
          }
          if (terminal) { level--; continue; }
          cursors[level] = 0;
        }
        int childIndex = nextRayChild(cursors[level], origins[level], directions[level], hit);
        if (childIndex < 0) { level--; continue; }
        Transform child = growChild(readChild(childIndex, directions[level]), ranks[level]);
        if (continuation && (child.flags & 2) != 0) continue;
        if (child.size <= 0.0) continue;
        origins[level + 1] = inverseVector(child, origins[level] - child.center);
        directions[level + 1] = inverseVector(child, directions[level]);
        sizes[level + 1] = sizes[level] * child.size; ranks[level + 1] = ranks[level] + child.rank; cursors[level + 1] = -1; level++;
      }
      if (level >= 0) { complete = false; return hit > 0.0 && hit < u_far; }
    }
    if (hit == previous || hit >= u_far) return hit > 0.0 && hit < u_far;
  }
  complete = false; return hit > 0.0 && hit < u_far;
}
bool trace(vec3 ray, float detail, bool envelope, out float hit, out vec3 normal, out vec3 shadingNormal, out float edge, out float cell, out bool complete) {
  bool inside;
#ifdef ROMANESCO_BEAM_USE
  beamAmbiguous = false;
#endif
  bool found = traceNearest(ray, detail, envelope, hit, normal, shadingNormal, edge, cell, complete, inside);
#ifdef ROMANESCO_BEAM_USE
  if (beamAmbiguous) {
    beamForceBaseline = true;
    found = traceNearest(ray, detail, envelope, hit, normal, shadingNormal, edge, cell, complete, inside);
    beamForceBaseline = false;
  }
#endif
  if (u_kind == 3 && inside && complete && !envelope) {
    found = traceUnionExit(ray, detail, hit, normal, cell, complete);
    shadingNormal = normal; edge = 1e30;
  }
  return found;
}

// Branch-and-bound nearest enclosing hull. At a leaf this is a conservative
// distance to all unresolved descendants, including surfaces facing away.
float clearance() {
  float nearest = u_far;
  vec3 origins[SPATIAL_STACK_DEPTH]; float sizes[SPATIAL_STACK_DEPTH]; float ranks[SPATIAL_STACK_DEPTH]; int cursors[SPATIAL_STACK_DEPTH];
  int visits = 0;
  for (int rootIndex = 0; rootIndex < 512; rootIndex++) {
    if (rootIndex >= u_rootCount) break;
    if (u_kind == 3 && texelFetch(u_roots, ivec2(3, rootIndex), 0).w > 0.5) {
      nearest = min(nearest, texelFetch(u_roots, ivec2(3, rootIndex), 0).x);
      continue;
    }
    Transform root = readTransform(u_roots, rootIndex);
    origins[0] = inverseVector(root, -root.center); sizes[0] = root.size; ranks[0] = root.rank; cursors[0] = -1;
    int level = 0;
    for (int step = 0; step < 65536; step++) {
      if (level < 0) break;
      if (++visits > (u_kind == 3 ? 65536 : 8192)) return 0.0;
      bool continuation = u_kind == 3 && (level == 0 ? (root.flags & 1) != 0 : ranks[level] == ranks[level - 1]);
      if (cursors[level] == -1) {
        float lower = boundDistance(origins[level]) * sizes[level];
        if (lower >= nearest) { level--; continue; }
        if (u_kind == 3 && !continuation) nearest = min(nearest, coneDistance(origins[level]) * sizes[level]);
        if (nearest <= 0.0) return 0.0;
        if (sizes[level] * u_radius <= max(0.00002, lower * 0.03) || level == SPATIAL_STACK_DEPTH - 1 || ranks[level] >= u_maxRank) {
          nearest = min(nearest, lower); level--; continue;
        }
#ifdef QUADRATIC_KOCH
        cursors[level] = childCursor(-origins[level]);
#else
        cursors[level] = 0;
#endif
      }
      int childIndex = nextClearanceChild(cursors[level], origins[level], sizes[level], nearest);
      if (childIndex < 0) { level--; continue; }
      Transform child = growChild(readChild(childIndex, -origins[level]), ranks[level]);
      if (continuation && (child.flags & 2) != 0) continue;
      if (child.size <= 0.0) continue;
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
#ifdef ROMANESCO_BEAM_PASS
struct BeamNode { vec3 eye; vec3 right; vec3 up; vec3 forward; float size; float rank; int flags; };
vec2 beamLow, beamHigh;
vec3 beamCornerRays[4];
float beamCornerLengths[4];
float beamMinimumCosine, beamDepthLimit;
vec2 beamCorner(int i) {
  return vec2((i == 1 || i == 2) ? beamHigh.x : beamLow.x, i >= 2 ? beamHigh.y : beamLow.y);
}
BeamNode beamRoot(int index) {
  Transform root = readTransform(u_roots, index);
  return BeamNode(inverseVector(root, -root.center), inverseVector(root, u_right), inverseVector(root, u_up), inverseVector(root, u_forward), root.size, root.rank, root.flags);
}
BeamNode beamChild(BeamNode parent, Transform child) {
  return BeamNode(inverseVector(child, parent.eye - child.center), inverseVector(child, parent.right), inverseVector(child, parent.up), inverseVector(child, parent.forward), parent.size * child.size, parent.rank + child.rank, child.flags);
}
BeamNode beamNode(uint descriptor) {
  BeamNode node = beamRoot(beamRootIndex(descriptor));
  uint code = beamCode(descriptor);
  int depth = beamDepth(code);
  for (int i = 0; i < 3; i++) {
    if (i >= depth) break;
    int row = beamChildRow(code, depth, i);
    node = beamChild(node, growChild(readCanonicalChild(row), node.rank));
  }
  return node;
}
float beamSupport(vec3 n, bool coreOnly) {
  float radial = length(n.xz);
  if (coreOnly) return max(n.y, -n.y + 2.0 * u_coneSlope * radial);
  float base = u_boundConeBase, baseRadius = u_boundConeSlope * (1.0 - base);
  float support = n.y;
  if (u_boundCylinderRadius > 0.0 && u_boundCylinderRadius < baseRadius) {
    float join = 1.0 - u_boundCylinderRadius / u_boundConeSlope;
    support = max(support, join * n.y + u_boundCylinderRadius * radial);
    baseRadius = u_boundCylinderRadius;
  }
  return max(support, base * n.y + baseRadius * radial);
}
float beamError(vec3 n, BeamNode node) {
  return 0.00002 * (abs(n.x) + abs(n.y) + abs(n.z)) * (1.0 + max(abs(node.eye.x), max(abs(node.eye.y), abs(node.eye.z))));
}
bool beamIntersects(BeamNode node, bool coreOnly) {
  // Plane support is conservative for the complete curved envelope. No corner
  // ray test is used for rejection: a small floret can lie between the corners.
  for (int side = 0; side < 5; side++) {
    vec3 n = side == 0 ? node.right - beamLow.x * node.forward
      : side == 1 ? beamHigh.x * node.forward - node.right
      : side == 2 ? node.up - beamLow.y * node.forward
      : side == 3 ? beamHigh.y * node.forward - node.up : node.forward;
    if (beamSupport(n, coreOnly) - dot(n, node.eye) < -beamError(n, node)) return false;
  }
  float lower = (-beamSupport(-node.forward, coreOnly) - dot(node.forward, node.eye)) * node.size * node.size;
  return lower <= beamDepthLimit + beamError(node.forward, node) * node.size * node.size;
}
float beamCoreDepth(BeamNode node, float minimumAncestorFeature) {
  if ((node.flags & 1) != 0) return u_far;
  float depth = 0.0;
  for (int corner = 0; corner < 4; corner++) {
    vec2 slope = beamCorner(corner);
    vec3 direction = (node.forward + slope.x * node.right + slope.y * node.up) / beamCornerLengths[corner];
    float t, edge; vec3 normal;
    if (!coneLeaf(node.eye, direction, u_far, t, normal, edge)) return u_far;
    depth = max(depth, t * dot(beamCornerRays[corner], u_forward));
  }
  depth += max(0.00002, depth * 0.000004);
  float furthest = depth / max(beamMinimumCosine, 1e-8);
  float largestFootprint = max(u_nearFootprint, furthest * u_pixelAngle) * u_detailScale;
  // Every prefix must remain resolved for every fine pixel. Otherwise a core
  // hidden by that pixel's ordinary stopping rule cannot establish its cap.
  return minimumAncestorFeature > largestFootprint ? min(u_far, depth) : u_far;
}
float beamCommonDepth() {
  if ((beamWinningPath.x & 1u) == 0u) return u_far;
  int rootIndex = int((beamWinningPath.x >> 1u) & 511u);
  if (texelFetch(u_roots, ivec2(3, rootIndex), 0).w > 0.5) {
    float depth = 0.0;
    for (int corner = 0; corner < 4; corner++) {
      float t; vec3 normal;
      if (!ancestorLeaf(rootIndex, beamCornerRays[corner], u_far, t, normal)) return u_far;
      depth = max(depth, t * dot(beamCornerRays[corner], u_forward));
    }
    return min(u_far, depth + max(0.00002, depth * 0.000004));
  }
  BeamNode node = beamRoot(rootIndex);
  int length = int((beamWinningPath.x >> 10u) & 15u);
  float depth = u_far, minimumFeature = 1e30;
  for (int i = 0; i < 12; i++) {
    depth = min(depth, beamCoreDepth(node, minimumFeature));
    if (i >= length || node.rank >= u_maxRank) break;
    minimumFeature = min(minimumFeature, node.size * u_featureSize);
    Transform child = growChild(readChildTransform(int(readBeamPathRow(beamWinningPath, i))), node.rank);
    if (child.size <= 0.0 || ((node.flags & 1) != 0 && (child.flags & 2) != 0)) break;
    node = beamChild(node, child);
  }
  return depth;
}
vec2 beamSlope(vec2 pixel) {
  vec2 ndc = 2.0 * pixel / u_resolution - 1.0 - u_origin;
  return u_projection.x > 0.0 ? ndc / u_projection
    : (2.0 * pixel - u_resolution - u_origin * u_resolution) / (min(u_resolution.x, u_resolution.y) * u_focal);
}
void main() {
  outBeam0 = outBeam1 = outBeam2 = outBeam3 = uvec4(0u);
  uint n = uint(u_childCount);
  if (u_childCount * 8 > 1024 || n * (n * (n + 1u) + 1u) > 2097151u || u_rootCount > 512) { outBeam0.x = 256u; return; }
  vec2 start = floor(gl_FragCoord.xy) * 8.0;
  beamLow = beamSlope(start); beamHigh = beamSlope(min(start + vec2(8.0), u_resolution));
  beamMinimumCosine = 1.0;
  for (int corner = 0; corner < 4; corner++) {
    vec2 slope = beamCorner(corner);
    vec3 ray = u_forward + slope.x * u_right + slope.y * u_up;
    beamCornerLengths[corner] = length(ray); beamCornerRays[corner] = ray / beamCornerLengths[corner];
    beamMinimumCosine = min(beamMinimumCosine, dot(beamCornerRays[corner], u_forward));
  }
  vec2 middle = (beamLow + beamHigh) * 0.5;
  vec3 ray = normalize(u_forward + middle.x * u_right + middle.y * u_up);
  float hit, edge, cell; vec3 normal, shading; bool complete, inside;
  traceNearest(ray, u_detailScale, false, hit, normal, shading, edge, cell, complete, inside);
  if (!complete) beamWinningPath = uvec4(0u);
  beamDepthLimit = beamCommonDepth();
  uint descriptors[15];
  for (int i = 0; i < 15; i++) descriptors[i] = 0u;
  int count = 0;
  for (int root = 0; root < 512; root++) {
    if (root >= u_rootCount) break;
    bool ancestor = texelFetch(u_roots, ivec2(3, root), 0).w > 0.5;
    if (!ancestor && !beamIntersects(beamRoot(root), false)) continue;
    if (count == 15) { outBeam0.x = 256u; return; }
    descriptors[count++] = uint(root) | (ancestor ? 2147483648u : 0u);
  }
  // Replacing a node is optional. If its children do not fit, retain its whole
  // subtree rather than dropping geometry or overflowing a tile's storage.
  for (int at = 0; at < 15; at++) {
    if (at >= count) break;
    uint descriptor = descriptors[at];
    uint code = beamCode(descriptor);
    int depth = beamDepth(code);
    if ((descriptor & 2147483648u) != 0u || depth == 3) continue;
    BeamNode node = beamNode(descriptor);
    if (node.rank >= u_maxRank) continue;
    uint replacement[15]; int added = 0, available = 16 - count;
    vec3 centreDirection = node.forward + middle.x * node.right + middle.y * node.up;
    int offset = boundsOctant(centreDirection) * u_childCount;
    bool overflow = false;
    for (int childIndex = 0; childIndex < 1024; childIndex++) {
      if (childIndex >= u_childCount) break;
      int row = offset + childIndex;
      Transform child = growChild(readChildTransform(row), node.rank);
      if (child.size <= 0.0 || ((node.flags & 1) != 0 && (child.flags & 2) != 0)) continue;
      if (!beamIntersects(beamChild(node, child), false)) continue;
      if (added >= available) { overflow = true; break; }
      // Every octant stores the same transforms. Its fourth texel identifies
      // the matching row in octant zero, so fine pixels need no tile-ray math.
      uint invariantRow = u_orderedChildren ? uint(canonicalChildIndex(row)) : uint(childIndex);
      uint childCode = code * uint(u_childCount) + invariantRow + 1u;
      uint next = (descriptor & 511u) | (childCode << 9u);
      replacement[added++] = next;
    }
    if (overflow) continue;
    // This may be the last carrier of a visible ancestor core. Even if its own
    // core and children miss the tile, preserve prefix replay with a core-only
    // entry instead of deleting it and losing that ancestor's retained surface.
    if (added == 0) replacement[added++] = descriptor | 2147483648u;
    for (int j = 14; j >= 0; j--) if (j > at && j < count) descriptors[j + added - 1] = descriptors[j];
    for (int j = 0; j < 15; j++) { if (j >= added) break; descriptors[at + j] = replacement[j]; }
    count += added - 1;
    // If the parent's core was culled, the first replacement is already a
    // child subtree. Revisit it so the next optional split is not skipped.
    if ((replacement[0] & 2147483648u) == 0u) at--;
  }
  // Positive Float32 values preserve order as integers. Rounding the low nine
  // bits upward leaves room for the count and fallback flag without weakening
  // the certified cap. Fine pixels divide perspective depth by their own cosine.
  uint cap = (floatBitsToUint(beamDepthLimit) + 511u) & 4294966784u;
  outBeam0 = uvec4(cap | uint(count), descriptors[0], descriptors[1], descriptors[2]);
  outBeam1 = uvec4(descriptors[3], descriptors[4], descriptors[5], descriptors[6]);
  outBeam2 = uvec4(descriptors[7], descriptors[8], descriptors[9], descriptors[10]);
  outBeam3 = uvec4(descriptors[11], descriptors[12], descriptors[13], descriptors[14]);
}
#else
void main() {
  outSurface = vec4(0.5, 0.5, 1.0, 1.0);
  if (u_query == 2) { outColor = encodeDistance(clearance(), true); return; }
  vec2 ndc = 2.0 * gl_FragCoord.xy / u_resolution - 1.0 - u_origin;
  // A projection supplied by the framed canvas preserves its full drawable area.
  // Standalone ray probes retain the original centered focal-length contract.
  vec2 slope = u_projection.x > 0.0 ? ndc / u_projection
      : (2.0 * gl_FragCoord.xy - u_resolution - u_origin * u_resolution) / (min(u_resolution.x, u_resolution.y) * u_focal);
  bool queryRay = u_query == 1 || u_query == 3;
#ifdef TRAVERSAL_DIAGNOSTICS
  queryRay = queryRay || (u_query >= 4 && u_query <= 8);
#endif
  vec3 ray = queryRay ? normalize(u_queryRay) : normalize(u_forward + slope.x * u_right + slope.y * u_up);
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
#ifdef TRAVERSAL_DIAGNOSTICS
  if (u_query >= 4 && u_query <= 8) {
    float count = float(u_query == 4 ? debugVisits : u_query == 5 ? debugTransforms : u_query == 6 ? debugBounds : u_query == 7 ? debugNormalSteps : debugHits);
    outColor = encodeDistance(count, true); return;
  }
#endif
  if (u_query == 1) { outColor = encodeDistance(hit, found); return; }
  if (u_query == 3) { outColor = vec4(normal * 0.5 + 0.5, found ? (exhausted ? 0.5 : 1.0) : 0.0); return; }
  vec3 color = u_background;
  if (found) {
    if (dot(normal, ray) > 0.0) normal = -normal;
    vec3 aoNormal = u_kind == 3 ? shadingNormal : normal;
    if (dot(aoNormal, ray) > 0.0) aoNormal = -aoNormal;
    vec3 viewNormal = vec3(dot(aoNormal, u_right), dot(aoNormal, u_up), -dot(aoNormal, u_forward));
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
  outColor = vec4(color, u_kind == 3 && found ? 1.0 : aoWeight);
}
#endif
