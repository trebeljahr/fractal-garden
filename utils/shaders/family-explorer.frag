// One rule with one free number, drawn two ways. With u_family on, each pixel is a value of the
// free number and the route starts where the rule's slope is zero. With it off, the free number
// is fixed and each pixel is a starting point.
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_half;
uniform vec2 u_param;
uniform float u_family;
uniform float u_rule;
uniform float u_sharp;

const float NEWTON_TOLERANCE = 1e-3;
const vec3 BLUE_DEEP = vec3(0.012, 0.035, 0.145);
const vec3 BLUE = vec3(0.13, 0.42, 0.86);
const vec3 AMBER_DEEP = vec3(0.145, 0.05, 0.012);
const vec3 AMBER = vec3(0.93, 0.56, 0.14);
const vec3 ROSE_DEEP = vec3(0.13, 0.015, 0.09);
const vec3 ROSE = vec3(0.85, 0.2, 0.52);
const vec3 HOT = vec3(1.0, 0.96, 0.84);

vec2 times(vec2 a, vec2 b) {
  return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

vec2 over(vec2 a, vec2 b) {
  return vec2(a.x * b.x + a.y * b.y, a.y * b.x - a.x * b.y) / dot(b, b);
}

// Dark far from the edge and bright closer to it. The wave repeats, so a view deep among routes
// with high jump counts keeps its range of brightness instead of turning white.
vec3 glow(vec3 deep, vec3 bright, float t, float period) {
  float b = 0.5 - 0.5 * cos(6.2831853 * t / period);
  vec3 color = mix(deep, bright, smoothstep(0.0, 0.75, b));
  return mix(color, HOT, 0.85 * smoothstep(0.8, 1.0, b));
}

vec2 startFor(vec2 c) {
  if (u_rule < 0.5) return c / 3.0;
  if (u_rule > 5.5) {
    vec2 inner = vec2(1.0 - c.x, -c.y);
    float angle = atan(inner.y, inner.x) / 2.0;
    return pow(dot(inner, inner), 0.25) * vec2(cos(angle), sin(angle));
  }
  if (u_rule > 4.5) {
    float angle = atan(c.y, c.x) / 3.0;
    return pow(dot(c, c) / 4.0, 1.0 / 6.0) * vec2(cos(angle), sin(angle));
  }
  if (u_rule > 3.5) return vec2(0.0);
  if (u_rule > 2.5) return vec2(1.5707963, 0.0);
  if (u_rule > 1.5) {
    float angle = atan(c.y, c.x) / 4.0;
    return pow(dot(c, c), 0.125) * vec2(cos(angle), sin(angle));
  }
  return vec2(0.0);
}

vec3 colorAt(vec2 point) {
  vec2 c = u_family > 0.5 ? point : u_param;
  vec2 z = u_family > 0.5 ? startFor(c) : point;
  vec2 saved = z;
  float nextSave = 8.0;
  for (int jump = 0; jump < 600; jump++) {
    float jumps = float(jump);
    if (u_rule < 0.5) {
      vec2 toMinus = z + vec2(1.0, 0.0);
      vec2 toPlus = z - vec2(1.0, 0.0);
      vec2 toThird = z - c;
      float near = min(dot(toMinus, toMinus), min(dot(toPlus, toPlus), dot(toThird, toThird)));
      if (near < NEWTON_TOLERANCE * NEWTON_TOLERANCE) {
        float t = jumps + 1.0 - log(max(log(sqrt(near)) / log(NEWTON_TOLERANCE), 1.0)) / log(2.0);
        if (dot(toMinus, toMinus) == near) return glow(BLUE_DEEP, BLUE, t, 36.0);
        if (dot(toPlus, toPlus) == near) return glow(AMBER_DEEP, AMBER, t, 36.0);
        return glow(ROSE_DEEP, ROSE, t, 36.0);
      }
      vec2 square = times(z, z);
      vec2 value = times(square - vec2(1.0, 0.0), toThird);
      vec2 slope = 3.0 * square - 2.0 * times(c, z) - vec2(1.0, 0.0);
      if (dot(slope, slope) < 1e-20) return vec3(0.0);
      z -= over(value, slope);
    } else if (u_rule < 1.5) {
      z = times(z, z) + c;
      if (dot(z, z) > 1e6) {
        float t = jumps + 1.0 - log(log(dot(z, z)) / log(1e6)) / log(2.0);
        return glow(BLUE_DEEP, BLUE, t, 70.0);
      }
    } else if (u_rule < 2.5) {
      vec2 square = times(z, z);
      if (dot(square, square) < 1e-12) return glow(BLUE_DEEP, BLUE, jumps + 1.0, 70.0);
      z = square + over(c, square);
      if (dot(z, z) > 1e6) {
        float t = jumps + 1.0 - log(log(dot(z, z)) / log(1e6)) / log(2.0);
        return glow(BLUE_DEEP, BLUE, t * 1.6, 70.0);
      }
    } else if (u_rule < 4.5) {
      vec2 turned = u_rule < 3.5
        ? vec2(sin(z.x) * (exp(z.y) + exp(-z.y)) * 0.5, cos(z.x) * (exp(z.y) - exp(-z.y)) * 0.5)
        : vec2(cos(z.x) * (exp(z.y) + exp(-z.y)) * 0.5, -sin(z.x) * (exp(z.y) - exp(-z.y)) * 0.5);
      z = times(c, turned);
      if (abs(z.y) > 40.0) {
        float t = jumps + 1.0 - log(abs(z.y) / 40.0) / 40.0;
        return glow(BLUE_DEEP, BLUE, t * 2.0, 70.0);
      }
    } else if (u_rule > 5.5) {
      vec2 toOne = z - vec2(1.0, 0.0);
      float nearOne = dot(toOne, toOne);
      if (nearOne < 1e-6) {
        float t = jumps + 1.0 - log(max(log(sqrt(nearOne)) / log(1e-3), 1.0)) / log(2.0);
        return glow(AMBER_DEEP, AMBER, t * 1.6, 70.0);
      }
      vec2 bottom = 2.0 * z + c - vec2(2.0, 0.0);
      if (dot(bottom, bottom) < 1e-16) return glow(BLUE_DEEP, BLUE, jumps + 1.0, 70.0);
      vec2 part = over(times(z, z) + c - vec2(1.0, 0.0), bottom);
      z = times(part, part);
      if (dot(z, z) > 1e6) {
        float t = jumps + 1.0 - log(log(dot(z, z)) / log(1e6)) / log(2.0);
        return glow(BLUE_DEEP, BLUE, t * 1.6, 70.0);
      }
    } else {
      if (dot(z, z) < 1e-12) return glow(BLUE_DEEP, BLUE, jumps + 1.0, 70.0);
      z = times(z, z) + over(c, z);
      if (dot(z, z) > 1e6) {
        float t = jumps + 1.0 - log(log(dot(z, z)) / log(1e6)) / log(2.0);
        return glow(BLUE_DEEP, BLUE, t * 1.6, 70.0);
      }
    }
    // A route that returns to where it was is trapped, so a black pixel can stop early.
    vec2 away = z - saved;
    if (jumps > 8.0 && dot(away, away) < 1e-12 * max(1.0, dot(z, z))) return vec3(0.0);
    if (jumps >= nextSave) {
      saved = z;
      nextSave *= 2.0;
    }
  }
  return vec3(0.0);
}

void main() {
  vec2 step = 2.0 * u_half / u_resolution;
  vec2 corner = u_center - u_half + gl_FragCoord.xy * step;
  vec3 color;
  if (u_sharp > 0.5) {
    color = colorAt(corner + step * vec2(-0.25, -0.25));
    color += colorAt(corner + step * vec2(0.25, -0.25));
    color += colorAt(corner + step * vec2(-0.25, 0.25));
    color += colorAt(corner + step * vec2(0.25, 0.25));
    color *= 0.25;
  } else {
    color = colorAt(corner);
  }
  gl_FragColor = vec4(color, 1.0);
}
