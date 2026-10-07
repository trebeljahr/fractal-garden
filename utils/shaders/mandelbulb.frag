precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_rotation;
uniform vec2 u_pan;
uniform float u_cameraDistance;
uniform float u_power;
uniform float u_detail;
uniform vec3 u_background;
uniform vec3 u_color;
// Cosine palette color(t) = a + b * cos(2pi * (c * t + d)). u_solid mixes
// towards the plain u_color instead.
uniform vec3 u_paletteA;
uniform vec3 u_paletteB;
uniform vec3 u_paletteC;
uniform vec3 u_paletteD;
uniform float u_solid;
uniform float u_shadows;

const int MAX_STEPS = 160;
const int MAX_ITERATIONS = 24;
const float MAX_DISTANCE = 12.0;
const float BOUNDING_RADIUS = 1.25;

mat2 rot(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}

// Distance estimate. `trap` collects the orbit's closest approach to the
// three coordinate planes (xyz) and to the origin (w, squared), which colors
// the surface by how each point's orbit behaved.
float mandelbulb(vec3 position, out vec4 trap) {
    vec3 z = position;
    float derivative = 1.0;
    float radius = length(z);
    trap = vec4(abs(z), dot(z, z));

    for (int i = 0; i < MAX_ITERATIONS; i++) {
        if (float(i) >= u_detail || radius > 2.0) {
            break;
        }

        float safeRadius = max(radius, 0.0001);
        float theta = acos(clamp(z.z / safeRadius, -1.0, 1.0)) * u_power;
        float phi = atan(z.y, z.x) * u_power;
        float raisedRadius = pow(safeRadius, u_power);

        derivative = pow(safeRadius, u_power - 1.0) * u_power * derivative + 1.0;
        z = raisedRadius * vec3(
            sin(theta) * cos(phi),
            sin(theta) * sin(phi),
            cos(theta)
        ) + position;

        trap = min(trap, vec4(abs(z), dot(z, z)));
        radius = length(z);
    }

    return 0.5 * log(max(radius, 0.0001)) * radius / derivative;
}

float distanceTo(vec3 position) {
    vec4 trap;
    return mandelbulb(position, trap);
}

// Tetrahedral differences: four estimates instead of six.
vec3 estimateNormal(vec3 point, float epsilon) {
    vec2 k = vec2(1.0, -1.0);
    return normalize(
        k.xyy * distanceTo(point + k.xyy * epsilon) +
        k.yyx * distanceTo(point + k.yyx * epsilon) +
        k.yxy * distanceTo(point + k.yxy * epsilon) +
        k.xxx * distanceTo(point + k.xxx * epsilon)
    );
}

float softShadow(vec3 origin, vec3 direction, float start) {
    float light = 1.0;
    float travelled = start;
    for (int i = 0; i < 48; i++) {
        float d = distanceTo(origin + direction * travelled);
        light = min(light, 6.0 * d / travelled);
        travelled += clamp(d, 0.004, 0.2);
        if (light < 0.01 || travelled > 2.5) {
            break;
        }
    }
    return clamp(light, 0.0, 1.0);
}

vec2 sphereHit(vec3 origin, vec3 direction, float radius) {
    float b = dot(origin, direction);
    float c = dot(origin, origin) - radius * radius;
    float h = b * b - c;
    if (h < 0.0) {
        return vec2(-1.0);
    }
    h = sqrt(h);
    return vec2(-b - h, -b + h);
}

vec3 palette(float t) {
    return u_paletteA + u_paletteB * cos(6.28318 * (u_paletteC * t + u_paletteD));
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    // Half the width of one pixel at unit distance: the surface is resolved
    // just finely enough to stay sharp at any zoom.
    float pixel = 1.0 / min(u_resolution.x, u_resolution.y);

    vec3 target = vec3(u_pan, 0.0);
    vec3 rayOrigin = vec3(0.0, 0.0, u_cameraDistance);
    rayOrigin.xz = rot(u_rotation.y) * rayOrigin.xz;
    rayOrigin.yz = rot(u_rotation.x) * rayOrigin.yz;
    rayOrigin += target;

    vec3 forward = normalize(target - rayOrigin);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = cross(forward, right);
    vec3 rayDirection = normalize(forward + uv.x * right + uv.y * up);

    vec3 background = mix(
        u_background,
        u_background + 0.08 * vec3(0.25, 0.35, 0.6),
        0.5 + 0.5 * uv.y
    );

    // Only march inside the sphere that holds the whole bulb.
    vec2 bounds = sphereHit(rayOrigin, rayDirection, BOUNDING_RADIUS);
    if (bounds.y < 0.0) {
        gl_FragColor = vec4(background, 1.0);
        return;
    }

    float totalDistance = max(bounds.x, 0.0);
    float farLimit = min(bounds.y, MAX_DISTANCE);
    float epsilon = 0.0;
    int stepsTaken = 0;
    bool hit = false;

    for (int i = 0; i < MAX_STEPS; i++) {
        stepsTaken = i;
        epsilon = max(totalDistance * pixel * 1.5, 0.000002);
        float d = distanceTo(rayOrigin + rayDirection * totalDistance);
        if (d < epsilon) {
            hit = true;
            break;
        }
        totalDistance += d;
        if (totalDistance > farLimit) {
            break;
        }
    }

    if (!hit) {
        gl_FragColor = vec4(background, 1.0);
        return;
    }

    vec3 position = rayOrigin + rayDirection * totalDistance;
    vec4 trap;
    mandelbulb(position, trap);
    vec3 normal = estimateNormal(position, epsilon);

    // Orbits that dive close to the origin sit in crevices: darken them.
    float occlusion = clamp(0.2 + 0.8 * pow(clamp(trap.w, 0.0, 1.0), 0.6), 0.0, 1.0);
    occlusion *= 1.0 - 0.6 * float(stepsTaken) / float(MAX_STEPS);

    float t = 1.4 * sqrt(clamp(trap.w, 0.0, 1.0)) + 0.5 * trap.y + 0.3 * trap.z;
    vec3 albedo = mix(palette(t), u_color, u_solid);
    // Light colors are tuned for linear space; convert sRGB inputs.
    albedo = pow(albedo, vec3(2.2));

    vec3 lightDirection = normalize(vec3(-0.45, 0.7, 0.55));
    float diffuse = max(dot(normal, lightDirection), 0.0);
    if (u_shadows > 0.5 && diffuse > 0.0) {
        diffuse *= softShadow(position + normal * epsilon * 4.0, lightDirection, epsilon * 8.0);
    }
    float sky = 0.5 + 0.5 * normal.y;
    float bounce = clamp(0.5 - 0.5 * normal.y, 0.0, 1.0);
    vec3 halfway = normalize(lightDirection - rayDirection);
    float specular = pow(max(dot(normal, halfway), 0.0), 32.0) * diffuse;
    float fresnel = pow(1.0 - max(dot(normal, -rayDirection), 0.0), 4.0);

    vec3 light = vec3(0.0);
    light += 2.6 * diffuse * vec3(1.0, 0.92, 0.8);
    light += 0.9 * sky * occlusion * vec3(0.55, 0.7, 1.0);
    light += 0.25 * bounce * occlusion * vec3(0.9, 0.6, 0.4);
    light += 0.35 * fresnel * occlusion;

    vec3 surface = albedo * light + 0.25 * specular;
    surface = pow(surface, vec3(1.0 / 2.2));

    float fog = exp(-0.08 * totalDistance * totalDistance);
    gl_FragColor = vec4(mix(background, surface, fog), 1.0);
}
