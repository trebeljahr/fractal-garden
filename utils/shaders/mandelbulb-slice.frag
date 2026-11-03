// One flat cut through the Mandelbulb, seen from above. Uses the explorer's formula.
precision highp float;

uniform vec2 u_resolution;
uniform float u_span;
uniform float u_height;
uniform float u_power;

const int JUMPS = 24;

vec3 classic(float t) {
    return vec3(0.5) + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.1, 0.2)));
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution) / min(u_resolution.x, u_resolution.y);
    vec3 position = vec3(uv * u_span, u_height);
    vec3 z = position;
    float radius = length(z);
    float jumps = 0.0;

    for (int i = 0; i < JUMPS; i++) {
        if (radius > 2.0) {
            break;
        }
        float safeRadius = max(radius, 0.0001);
        float theta = acos(clamp(z.z / safeRadius, -1.0, 1.0)) * u_power;
        float phi = atan(z.y, z.x) * u_power;
        z = pow(safeRadius, u_power) * vec3(
            sin(theta) * cos(phi),
            sin(theta) * sin(phi),
            cos(theta)
        ) + position;
        radius = length(z);
        jumps += 1.0;
    }

    if (radius <= 2.0) {
        gl_FragColor = vec4(0.961, 0.773, 0.427, 1.0);
        return;
    }

    // Blend between jump counts so the bands don't show. The radius grows by a power each jump.
    float blend = log(max(log(radius) / log(2.0), 1.0)) / log(u_power);
    // Stop at the palette's pale end, or slow points wrap around to dark specks at the edge.
    gl_FragColor = vec4(classic(min(0.55 + (jumps - blend) * 0.07, 0.86)), 1.0);
}
