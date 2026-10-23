precision highp float;
uniform vec2 u_resolution;
uniform float u_viewDistance;
uniform sampler2D u_grid;
uniform int u_levels;
uniform int u_pattern;
uniform vec3 u_low;
uniform vec3 u_high;
uniform vec3 u_forward;
uniform vec3 u_right;
uniform vec3 u_up;
uniform vec3 u_background;
uniform vec3 u_fill;
uniform vec3 u_stroke;
uniform bool u_faces;
uniform bool u_wire;
uniform float u_lineWidth;

bool kept(vec3 digit) {
    float centers = (digit.x == 1.0 ? 1.0 : 0.0) + (digit.y == 1.0 ? 1.0 : 0.0) + (digit.z == 1.0 ? 1.0 : 0.0);
    if (u_pattern == 0) return centers <= 1.0;
    if (u_pattern == 1) return centers >= 2.0;
    if (u_pattern == 2) return centers > 0.0 && centers < 3.0;
    return centers > 0.0;
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution) / min(u_resolution.x, u_resolution.y);
    vec3 ray = normalize(u_forward + 0.58 * (uv.x * u_right + uv.y * u_up));
    vec3 safeRay = sign(ray) * max(abs(ray), vec3(1e-20));
    safeRay += (vec3(1.0) - abs(sign(ray))) * 1e-20;
    vec3 a = u_low / safeRay;
    vec3 b = u_high / safeRay;
    vec3 entry = min(a, b);
    vec3 exitAt = max(a, b);
    float near = max(max(entry.x, entry.y), entry.z);
    float far = min(u_viewDistance, min(min(exitAt.x, exitAt.y), exitAt.z));
    vec3 normal = entry.x >= entry.y && entry.x >= entry.z ? vec3(-sign(ray.x), 0.0, 0.0)
        : entry.y >= entry.z ? vec3(0.0, -sign(ray.y), 0.0) : vec3(0.0, 0.0, -sign(ray.z));
    float t = max(0.0, near);
    bool hit = false;
    vec3 local = vec3(0.0);
    float cellSize = 1.0;
    float footprint = 1e-6;
    vec3 rootNormal = normal;
    // Retry unusually expensive grazing rays at a coarser footprint instead
    // of turning an unfinished traversal into a false hole.
    for (int attempt = 0; attempt < 2; attempt++) {
      t = max(0.0, near);
      normal = rootNormal;
      if (far > t) {
        for (int stepIndex = 0; stepIndex < 512; stepIndex++) {
            if (t >= far) break;
            footprint = max(1e-6, t * 1.16 / min(u_resolution.x, u_resolution.y)) * (attempt == 0 ? 1.0 : 8.0);
            vec3 p = ray * (t + footprint * 0.025);
            bool empty = false;
            for (int level = 0; level < 256; level++) {
                if (level >= u_levels) break;
                float x = (float(level) + 0.5) / 256.0;
                vec4 grid = texture2D(u_grid, vec2(x, 0.25));
                vec3 base = texture2D(u_grid, vec2(x, 0.75)).xyz;
                float size = grid.w;
                vec3 cell = floor((p - grid.xyz) / size);
                vec3 digit = mod(base + cell, 3.0);
                vec3 low = grid.xyz + cell * size;
                if (!kept(digit)) {
                    vec3 edge = low + step(vec3(0.0), ray) * size;
                    vec3 distances = (edge - p) / safeRay;
                    distances = mix(vec3(1e30), distances, step(vec3(1e-15), abs(ray)));
                    float jump = min(min(distances.x, distances.y), distances.z);
                    normal = distances.x <= distances.y && distances.x <= distances.z ? vec3(-sign(ray.x), 0.0, 0.0)
                        : distances.y <= distances.z ? vec3(0.0, -sign(ray.y), 0.0) : vec3(0.0, 0.0, -sign(ray.z));
                    t += max(jump + footprint * 0.03, footprint * 0.05);
                    empty = true;
                    break;
                }
                if (size > footprint * 6.0) {
                    local = (p - low) / size;
                    cellSize = size;
                }
                if (size < footprint) break;
            }
            if (!empty) { hit = true; break; }
        }
    }
      if (hit || t >= far || far <= max(0.0, near)) break;
    }
    vec3 color = u_background;
    if (hit) {
        // Light the intersected face. A parent-cell normal produces large,
        // flat tiles which jump when the pixel footprint crosses a level.
        float diffuse = max(0.0, dot(normal, normalize(vec3(-0.5, 0.8, 0.6))));
        float facing = 0.15 * max(0.0, dot(normal, -ray));
        float light = 0.38 + 0.62 * diffuse + facing;
        color = u_fill * light;
        vec3 faceEdges = min(local, 1.0 - local);
        // Ignore the surface-normal axis when finding edges on this face.
        faceEdges += abs(normal) * 2.0;
        float edge = min(min(faceEdges.x, faceEdges.y), faceEdges.z) * cellSize;
        float outline = 1.0 - smoothstep(footprint * u_lineWidth * 0.25, footprint * (u_lineWidth * 0.25 + 0.6), edge);
        if (u_wire) color = mix(color, u_stroke * light, outline * (u_faces ? 0.25 : 1.0));
        if (!u_faces) color = mix(u_background, color, u_wire ? outline : 0.0);
        // Fog and traversal use the same smoothly changing distance, so the
        // far cutoff remains hidden while approaching smaller details.
        float fog = smoothstep(u_viewDistance * 0.25, u_viewDistance, t);
        color = mix(color, u_background, fog);
    }
    gl_FragColor = vec4(color, 1.0);
}
