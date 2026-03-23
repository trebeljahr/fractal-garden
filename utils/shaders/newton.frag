precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_zoomSize;

const int maxIterations = 40;
const float tolerance = 0.0001;

vec2 cAdd(vec2 a, vec2 b) {
    return a + b;
}

vec2 cSub(vec2 a, vec2 b) {
    return a - b;
}

vec2 cMul(vec2 a, vec2 b) {
    return vec2(
        a.x * b.x - a.y * b.y,
        a.x * b.y + a.y * b.x
    );
}

vec2 cScale(vec2 z, float scalar) {
    return vec2(z.x * scalar, z.y * scalar);
}

vec2 cDiv(vec2 a, vec2 b) {
    float denom = dot(b, b);
    return vec2(
        (a.x * b.x + a.y * b.y) / denom,
        (a.y * b.x - a.x * b.y) / denom
    );
}

vec2 cPow2(vec2 z) {
    return cMul(z, z);
}

vec2 cPow3(vec2 z) {
    return cMul(cPow2(z), z);
}

vec3 rootColor(int rootIndex) {
    if (rootIndex == 0) return vec3(1.00, 0.74, 0.26);
    if (rootIndex == 1) return vec3(0.24, 0.95, 0.84);
    return vec3(0.98, 0.42, 0.92);
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    vec2 z = u_center + uv * u_zoomSize;

    vec2 roots[3];
    roots[0] = vec2(1.0, 0.0);
    roots[1] = vec2(-0.5, 0.8660254);
    roots[2] = vec2(-0.5, -0.8660254);

    int iteration = 0;

    for (int i = 0; i < maxIterations; i++) {
        vec2 z2 = cPow2(z);
        vec2 derivative = cScale(z2, 3.0);

        if (dot(derivative, derivative) < tolerance) {
            break;
        }

        vec2 f = cSub(cPow3(z), vec2(1.0, 0.0));
        z = cSub(z, cDiv(f, derivative));
        iteration++;
    }

    int closestRoot = 0;
    float bestDistance = distance(z, roots[0]);

    for (int i = 1; i < 3; i++) {
        float d = distance(z, roots[i]);
        if (d < bestDistance) {
            bestDistance = d;
            closestRoot = i;
        }
    }

    float shade = 1.0 - float(iteration) / float(maxIterations);
    shade = 0.35 + 0.9 * pow(shade, 0.85);
    vec3 color = rootColor(closestRoot) * shade;
    float boundaryGlow = exp(-48.0 * bestDistance);
    color += boundaryGlow * vec3(0.95, 0.97, 1.0) * 0.45;

    if (bestDistance > 0.05) {
        color *= 0.55;
    }

    gl_FragColor = vec4(color, 1.0);
}
