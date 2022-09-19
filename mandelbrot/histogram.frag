precision highp float;

uniform vec2 iResolution;

const float escapeRadius = 4.0;
const float escapeRadius2 = escapeRadius * escapeRadius;
const int maxIterations = 40;

vec2 ipow2(vec2 v) {
  return vec2(v.x * v.x - v.y * v.y, v.x * v.y * 2.0);
}

// Procedural palette generator by Inigo Quilez.
// See: http://iquilezles.org/articles/palettes/
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

vec3 paletteColor(float t) {
  vec3 a = vec3(0.5);
  vec3 b = vec3(0.5);
  vec3 c = vec3(1.0);
  vec3 d = vec3(0.0, 0.1, 0.2);
  return palette(fract(t + 0.5), a, b, c, d);
}

void main() {
  vec2 uv = gl_FragCoord.xy - iResolution.xy * vec2(1.0 / 1.6, 1.0 / 2.0);
  uv *= 10.0 / min(3.0 * iResolution.x, 4.0 * iResolution.y);
  
  vec2 z = vec2(0.0);
  vec2 c = uv;
  int iteration;
  
  for(int i = 0; i < maxIterations; i ++ ) {
    z = ipow2(z) + c;
    if (dot(z, z) > escapeRadius2) {
      break;
    }
    iteration ++ ;
  }
  
  vec3 color = iteration >= maxIterations ? vec3(0.0) : paletteColor(float(iteration) / float(maxIterations));
  
  gl_FragColor = vec4(color, 1.0);
}
