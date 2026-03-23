precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_rotation;
uniform vec2 u_pan;
uniform float u_cameraDistance;
uniform float u_power;
uniform float u_detail;
uniform vec3 u_background;
uniform vec3 u_color;

const int MAX_STEPS = 96;
const int MAX_ITERATIONS = 24;
const float MAX_DISTANCE = 12.0;
const float SURFACE_DISTANCE = 0.0012;

mat2 rot(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}

float mandelbulbDistanceEstimator(vec3 position) {
    vec3 z = position;
    float derivative = 1.0;
    float radius = 0.0;

    for (int i = 0; i < MAX_ITERATIONS; i++) {
        if (float(i) >= u_detail) {
            break;
        }

        radius = length(z);
        if (radius > 2.0) {
            break;
        }

        float safeRadius = max(radius, 0.0001);
        float theta = acos(clamp(z.z / safeRadius, -1.0, 1.0));
        float phi = atan(z.y, z.x);
        float raisedRadius = pow(safeRadius, u_power);

        derivative = pow(safeRadius, u_power - 1.0) * u_power * derivative + 1.0;
        theta *= u_power;
        phi *= u_power;

        z = raisedRadius * vec3(
            sin(theta) * cos(phi),
            sin(theta) * sin(phi),
            cos(theta)
        ) + position;
    }

    float safeRadius = max(radius, 0.0001);
    return 0.5 * log(safeRadius) * safeRadius / derivative;
}

vec3 estimateNormal(vec3 point) {
    vec2 e = vec2(0.0015, 0.0);
    return normalize(vec3(
        mandelbulbDistanceEstimator(point + e.xyy) - mandelbulbDistanceEstimator(point - e.xyy),
        mandelbulbDistanceEstimator(point + e.yxy) - mandelbulbDistanceEstimator(point - e.yxy),
        mandelbulbDistanceEstimator(point + e.yyx) - mandelbulbDistanceEstimator(point - e.yyx)
    ));
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);

    vec3 target = vec3(u_pan, 0.0);
    vec3 rayOrigin = vec3(0.0, 0.0, u_cameraDistance);
    rayOrigin.xz = rot(u_rotation.y) * rayOrigin.xz;
    rayOrigin.yz = rot(u_rotation.x) * rayOrigin.yz;
    rayOrigin += target;

    vec3 forward = normalize(target - rayOrigin);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = cross(forward, right);
    vec3 rayDirection = normalize(forward + uv.x * right + uv.y * up);

    float totalDistance = 0.0;
    float distanceToSurface = 0.0;
    int stepsTaken = 0;
    bool hit = false;

    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 position = rayOrigin + rayDirection * totalDistance;
        distanceToSurface = mandelbulbDistanceEstimator(position);

        if (distanceToSurface < SURFACE_DISTANCE) {
            hit = true;
            stepsTaken = i;
            break;
        }

        totalDistance += distanceToSurface;
        if (totalDistance > MAX_DISTANCE) {
            stepsTaken = i;
            break;
        }
    }

    vec3 background = mix(
        u_background,
        u_background + 0.08 * vec3(0.25, 0.35, 0.6),
        0.5 + 0.5 * uv.y
    );

    if (!hit) {
        float haze = exp(-0.55 * max(totalDistance - 2.0, 0.0));
        gl_FragColor = vec4(background * (0.75 + 0.25 * haze), 1.0);
        return;
    }

    vec3 position = rayOrigin + rayDirection * totalDistance;
    vec3 normal = estimateNormal(position);
    vec3 lightDirection = normalize(vec3(-0.45, 0.7, 0.55));
    float diffuse = max(dot(normal, lightDirection), 0.0);
    float rim = pow(1.0 - max(dot(normal, -rayDirection), 0.0), 3.0);
    float occlusion = 1.0 - float(stepsTaken) / float(MAX_STEPS);

    vec3 surface = u_color * (0.22 + 0.9 * diffuse);
    surface += 0.25 * rim * u_color;
    surface += vec3(0.15 * occlusion);
    surface += background * 0.2 * (0.5 + 0.5 * normal.y);

    float fog = exp(-0.08 * totalDistance * totalDistance);
    vec3 color = mix(background, surface, fog);

    gl_FragColor = vec4(color, 1.0);
}
