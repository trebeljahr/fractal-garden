#version 300 es
#ifndef SPATIAL_STACK_DEPTH
#define SPATIAL_STACK_DEPTH 40
#endif
precision highp float;
precision highp int;
uniform highp sampler2D u_roots;
uniform highp sampler2D u_children;
uniform highp sampler2D u_childBounds;
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
layout(location=0) out vec4 outColor;
layout(location=1) out vec4 outSurface;

#ifdef TRAVERSAL_DIAGNOSTICS
int debugVisits = 0, debugTransforms = 0, debugBounds = 0, debugNormalSteps = 0, debugHits = 0;
#define COUNT_VISIT debugVisits++
#define COUNT_TRANSFORM debugTransforms++
#define COUNT_BOUNDS debugBounds += 2
#define COUNT_NORMAL debugNormalSteps++
#define COUNT_HIT debugHits++
#else
#define COUNT_VISIT
#define COUNT_TRANSFORM
#define COUNT_BOUNDS
#define COUNT_NORMAL
#define COUNT_HIT
#endif

struct Transform { vec3 center; mat3 axes; float rank; float size; };
Transform readTransform(sampler2D source, int index) {
  COUNT_TRANSFORM;
  vec4 c = texelFetch(source, ivec2(0, index), 0);
  mat3 m = mat3(texelFetch(source, ivec2(1, index), 0).xyz,
                texelFetch(source, ivec2(2, index), 0).xyz,
                texelFetch(source, ivec2(3, index), 0).xyz);
  return Transform(c.xyz, m, c.w, length(m[0]));
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
  return Transform(c.xyz, m, c.w, length(m[0]));
}
#else
Transform readChild(int index, vec3 direction) {
  int octant = (direction.x >= 0.0 ? 1 : 0) + (direction.y >= 0.0 ? 2 : 0) + (direction.z >= 0.0 ? 4 : 0);
  return readTransform(u_children, index + (u_orderedChildren ? octant * u_childCount : 0));
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
bool childBoxRay(vec3 o, vec3 d, vec3 low, vec3 high, float limit) {
  // Bounds remain conservative when a distant eye is transformed into a tiny
  // floret's coordinates. Surface intersection still uses the exact cone.
  float error = 0.0000005 * max(abs(o.x), max(abs(o.y), abs(o.z)));
  vec3 inverse = 1.0 / mix(vec3(1e-30), d, greaterThan(abs(d), vec3(1e-30)));
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
  // Every escape strictly advances. The finite texture bounds this loop; no
  // child or intersecting subtree is dropped to satisfy an iteration cap.
  while (position < u_childBoundsCount) {
    COUNT_BOUNDS;
    vec4 low = texelFetch(u_childBounds, ivec2(0, offset + position), 0);
    vec4 high = texelFetch(u_childBounds, ivec2(1, offset + position), 0);
    int escape = int(high.w);
    if (!childBoxRay(o, d, low.xyz, high.xyz, limit)) { position = escape; continue; }
    if (low.w >= 0.0) {
      int child = int(low.w);
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
    COUNT_BOUNDS;
    vec4 low = texelFetch(u_childBounds, ivec2(0, offset + position), 0);
    vec4 high = texelFetch(u_childBounds, ivec2(1, offset + position), 0);
    int escape = int(high.w);
    vec3 delta = max(vec3(0.0), max(low.xyz - vec3(error) - o, o - high.xyz - vec3(error)));
    if (length(delta) * size >= nearest) { position = escape; continue; }
    if (low.w >= 0.0) { int child = int(low.w); cursor = ((child + 1) << 16) | escape; return child; }
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
  float tip = 1.0 + error / k, base = -1.0 - error;
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
  nearAt = enter + shift; farAt = leave + shift;
  if (farAt < max(0.0, nearAt)) return false;
  vec3 p = o + enter * d, gradient = vec3(p.x, k2 * (tip - p.y), p.z);
  normal = p.y <= base + error ? vec3(0.0, -1.0, 0.0)
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
  vec3 origins[SPATIAL_STACK_DEPTH]; vec3 directions[SPATIAL_STACK_DEPTH]; float sizes[SPATIAL_STACK_DEPTH]; float ranks[SPATIAL_STACK_DEPTH]; int cursors[SPATIAL_STACK_DEPTH];
  int visits = 0;
  for (int rootIndex = 0; rootIndex < 512; rootIndex++) {
    if (rootIndex >= u_rootCount) break;
    if (u_kind == 3 && texelFetch(u_roots, ivec2(3, rootIndex), 0).w > 0.5) {
      vec4 equation = texelFetch(u_roots, ivec2(0, rootIndex), 0), clips = texelFetch(u_roots, ivec2(2, rootIndex), 0);
      inside = inside || (equation.w <= 0.0 && clips.x >= 0.0 && clips.y >= 0.0);
      float t; vec3 n;
      if (ancestorLeaf(rootIndex, ray, hit, t, n)) {
        hit = t; normal = n; shadingNormal = n; edge = 1e30; cell = 1e30; found = true;
      }
      continue;
    }
    Transform root = readTransform(u_roots, rootIndex);
    origins[0] = inverseVector(root, -root.center); directions[0] = inverseVector(root, ray); sizes[0] = root.size; ranks[0] = root.rank; cursors[0] = -1;
    int level = 0;
    for (int step = 0; step < 65536; step++) {
      if (level < 0) break;
      if (++visits > (u_kind == 3 ? 65536 : 4096)) { complete = false; return found; }
      if (cursors[level] == -1) {
        COUNT_VISIT;
        float nearAt, farAt; vec3 boundNormal;
        if (!boundInterval(origins[level], directions[level], hit, nearAt, farAt, boundNormal)) { level--; continue; }
        if (max(0.0, nearAt) >= hit) { level--; continue; }
        float footprint = max(u_nearFootprint, max(0.0, nearAt) * u_pixelAngle) * detail;
        // Descend only when the new child features have enough pixel samples.
        // Stopping when the parent itself reaches two pixels creates subpixel holes.
        bool small = sizes[level] * u_featureSize <= footprint;
        bool terminal = small || ranks[level] >= u_maxRank || level == SPATIAL_STACK_DEPTH - 1;
        // Romanesco retains its core at every scale; child buds add to the union.
        if (terminal || u_kind == 3) {
          float t, e; vec3 n;
          if (u_kind == 3) {
            vec3 o = origins[level]; float r = u_coneSlope * (1.0 - o.y);
            inside = inside || (o.y >= -1.0 && o.y <= 1.0 && dot(o.xz, o.xz) <= r * r);
          }
          bool intersects;
          if (envelope && terminal) { t = max(0.0, nearAt); n = boundNormal; e = 1e30; intersects = true; }
          else intersects = leaf(origins[level], directions[level], hit, t, n, e);
          if (intersects) {
            COUNT_HIT;
            vec3 smoothNormal = n;
            float childFootprint = max(u_nearFootprint, t * u_pixelAngle) * detail;
            for (int j = level; j > 0; j--) {
              COUNT_NORMAL;
              Transform child = readChild(usesChildBounds() ? (cursors[j - 1] >> 16) - 1 : cursors[j - 1] - 1, directions[j - 1]);
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
      if (child.size <= 0.0) continue;
      if (u_kind == 3 && !usesChildBounds()) {
        float nearAt, farAt; vec3 boundNormal;
        if (!sphereInterval(origins[level] - child.center, directions[level], child.size * u_radius, hit, nearAt, farAt, boundNormal)) continue;
      }
      origins[level + 1] = inverseVector(child, origins[level] - child.center);
      directions[level + 1] = inverseVector(child, directions[level]);
      sizes[level + 1] = sizes[level] * child.size; ranks[level + 1] = ranks[level] + child.rank; cursors[level + 1] = -1; level++;
    }
    if (level >= 0) { complete = false; return found; }
  }
  return found;
}

// Merge all ray intervals connected to the eye. A later extension can expose
// an earlier branch, so only a complete unchanged pass proves the union exit.
bool traceUnionExit(vec3 ray, float detail, out float hit, out vec3 normal, out float cell, out bool complete) {
  hit = 0.0; normal = vec3(0.0); cell = 0.0; complete = true;
  vec3 origins[SPATIAL_STACK_DEPTH]; vec3 directions[SPATIAL_STACK_DEPTH];
  float sizes[SPATIAL_STACK_DEPTH]; float ranks[SPATIAL_STACK_DEPTH]; int cursors[SPATIAL_STACK_DEPTH];
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
        if (cursors[level] == -1) {
          float nearAt, farAt; vec3 n;
          if (!boundInterval(origins[level], directions[level], u_far, nearAt, farAt, n) || nearAt > hit || farAt <= hit) { level--; continue; }
          float footprint = max(u_nearFootprint, max(0.0, nearAt) * u_pixelAngle) * detail;
          bool terminal = sizes[level] * u_featureSize <= footprint || ranks[level] >= u_maxRank || level == SPATIAL_STACK_DEPTH - 1;
          float enter, leave;
          if (coneSegment(origins[level], directions[level], enter, leave, n) && enter <= hit && leave > hit) {
            hit = leave; cell = sizes[level];
            for (int j = level; j > 0; j--) {
              Transform child = readChild(usesChildBounds() ? (cursors[j - 1] >> 16) - 1 : cursors[j - 1] - 1, directions[j - 1]);
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
  bool found = traceNearest(ray, detail, envelope, hit, normal, shadingNormal, edge, cell, complete, inside);
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
      if (cursors[level] == -1) {
        float lower = boundDistance(origins[level]) * sizes[level];
        if (lower >= nearest) { level--; continue; }
        if (u_kind == 3) nearest = min(nearest, coneDistance(origins[level]) * sizes[level]);
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
