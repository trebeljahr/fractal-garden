precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_zoomSize;

const int maxIterations = 48;
const float tolerance = 0.0001;
const float rootTolerance = 0.0008;
const float maxStableValue = 1000000.0;

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

bool isInvalidFloat(float value) {
    return value != value || abs(value) > maxStableValue;
}

bool isInvalidVec2(vec2 value) {
    return isInvalidFloat(value.x) || isInvalidFloat(value.y);
}

vec3 rootColor(int rootIndex) {
    if (rootIndex == 0) return vec3(1.0, 0.0, 0.0);
    if (rootIndex == 1) return vec3(0.0, 1.0, 0.0);
    return vec3(0.0, 0.0, 1.0);
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    vec2 z = u_center + uv * u_zoomSize;
    vec2 stableZ = z;

    vec2 roots[3];
    roots[0] = vec2(1.0, 0.0);
    roots[1] = vec2(-0.5, 0.8660254);
    roots[2] = vec2(-0.5, -0.8660254);

    int iteration = 0;
    int convergedRoot = -1;

    for (int i = 0; i < maxIterations; i++) {
        vec2 z2 = cPow2(z);
        vec2 derivative = cScale(z2, 3.0);

        if (dot(derivative, derivative) < tolerance) {
            break;
        }

        vec2 f = cSub(cPow3(z), vec2(1.0, 0.0));
        vec2 nextZ = cSub(z, cDiv(f, derivative));

        if (isInvalidVec2(nextZ)) {
            z = stableZ;
            break;
        }

        z = nextZ;
        stableZ = z;
        iteration = i + 1;

        float d0 = distance(z, roots[0]);
        float d1 = distance(z, roots[1]);
        float d2 = distance(z, roots[2]);

        if (d0 < rootTolerance || d1 < rootTolerance || d2 < rootTolerance) {
            convergedRoot = 0;
            float bestDistance = d0;

            if (d1 < bestDistance) {
                bestDistance = d1;
                convergedRoot = 1;
            }

            if (d2 < bestDistance) {
                convergedRoot = 2;
            }

            break;
        }
    }

    if (isInvalidVec2(z)) {
        z = stableZ;
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

    float brightness = 1.0;
    if (convergedRoot == -1 && bestDistance > rootTolerance) {
        brightness = 0.92;
    }

    vec3 color = rootColor(closestRoot) * brightness;

    gl_FragColor = vec4(color, 1.0);
}
