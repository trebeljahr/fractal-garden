precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_zoomSize;

const float escapeRadius = 4.0;
const float escapeRadius2 = escapeRadius * escapeRadius;
const int maxIterations = 80;
const float invMaxIterations = 1.0 / float(maxIterations);

vec2 complexSquare(vec2 v) {
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
    vec3 d = vec3(0.0, 0.12, 0.22);
    return palette(fract(t + 0.55), a, b, c, d);
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    vec2 c = u_center + uv * u_zoomSize;
    vec2 z = vec2(0.0);
    int iteration = 0;

    for (int i = 0; i < maxIterations; i++) {
        z = complexSquare(abs(z)) + c;
        if (dot(z, z) > escapeRadius2) {
            break;
        }
        iteration++;
    }

    vec3 color = vec3(0.0);
    float distance2 = dot(z, z);
    if (distance2 > escapeRadius2) {
        float nu = log2(log(distance2) / 2.0);
        float fractionalIteration = clamp(
            (float(iteration + 1) - nu) * invMaxIterations,
            0.0,
            1.0
        );
        color = paletteColor(fractionalIteration);
    }

    gl_FragColor = vec4(color, 1.0);
}
