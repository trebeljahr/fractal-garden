precision highp float;
uniform vec2 u_resolution;
uniform float u_pixelAngle;
uniform float u_nearFootprint;
uniform float u_detailScale;
uniform float u_farDistance;
uniform float u_fogDistanceScale;
uniform float u_fogStart;
uniform float u_fogDensity;
// This texture stores geometry, including very large ancestor cell widths.
uniform highp sampler2D u_grid;
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
uniform int u_lighting;
uniform int u_aoMode;

bool kept(vec3 digit) {
    float centers = (digit.x == 1.0 ? 1.0 : 0.0) + (digit.y == 1.0 ? 1.0 : 0.0) + (digit.z == 1.0 ? 1.0 : 0.0);
    if (u_pattern == 0) return centers <= 1.0;
    if (u_pattern == 1) return centers >= 2.0;
    if (u_pattern == 2) return centers > 0.0 && centers < 3.0;
    return centers > 0.0;
}

float occupiedRoot(vec3 p) {
    return all(greaterThan(p, u_low)) && all(lessThan(p, u_high)) ? 1.0 : 0.0;
}

float occupiedRule(vec3 p, vec4 grid, vec3 base) {
    return kept(mod(base + floor((p - grid.xyz) / grid.w), 3.0)) ? 1.0 : 0.0;
}

float cornerDarkness(float a, float b, float diagonal) {
    return a * b > 0.5 ? 1.0 : (a + b + diagonal) / 3.0;
}

// Query the visible voxel's neighbours, rather than its enclosing cavity's cubes.
// All neighbours share an ancestor scan; no secondary rays are traced.
float surfaceOcclusion(vec3 p, vec3 normal, vec4 surfaceGrid, int surfaceLevel) {
    if (surfaceLevel < 0) return 0.0; // An outer root face has no enclosing neighbours.
    float size = surfaceGrid.w;
    vec3 U = abs(normal.x) > 0.5 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 V = abs(normal.z) > 0.5 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
    vec3 low = surfaceGrid.xyz + floor((p - normal * size * 0.001 - surfaceGrid.xyz) / size) * size;
    vec2 face = clamp(vec2(dot(p - low, U), dot(p - low, V)) / size, 0.0, 1.0);
    vec4 weights = vec4(1.0);
    if (u_aoMode == 1) {
        vec4 distance = vec4(face.x, 1.0 - face.x, face.y, 1.0 - face.y);
        weights = 1.0 - smoothstep(vec4(0.0), vec4(0.18), distance);
        if (dot(weights, vec4(1.0)) == 0.0) return 0.0;
    }
    vec3 center = low + vec3(0.5 * size);
    // Anchor the outside layer to the exact crossed plane, even at deep zoom.
    center += normal * (dot(p - center, normal) + 0.5 * size);
    vec3 left = center - U * size, right = center + U * size;
    vec3 bottom = center - V * size, top = center + V * size;
    vec3 lb = left - V * size, rb = right - V * size;
    vec3 lt = left + V * size, rt = right + V * size;
    vec4 sides = vec4(occupiedRoot(left), occupiedRoot(right), occupiedRoot(bottom), occupiedRoot(top));
    sides *= step(vec4(0.0001), weights);
    vec4 corners = vec4(0.0);
    if (u_aoMode == 2) corners = vec4(occupiedRoot(lb), occupiedRoot(rb), occupiedRoot(lt), occupiedRoot(rt));
    for (int level = 0; level < 256; level++) {
        if (level > surfaceLevel || level >= u_levels) break;
        if (dot(sides + corners, vec4(1.0)) < 0.5) break;
        float x = (float(level) + 0.5) / 256.0;
        vec4 grid = texture2D(u_grid, vec2(x, 0.25));
        vec3 base = texture2D(u_grid, vec2(x, 0.75)).xyz;
        sides *= vec4(occupiedRule(left, grid, base), occupiedRule(right, grid, base),
                      occupiedRule(bottom, grid, base), occupiedRule(top, grid, base));
        if (u_aoMode == 2) {
            corners *= vec4(occupiedRule(lb, grid, base), occupiedRule(rb, grid, base),
                            occupiedRule(lt, grid, base), occupiedRule(rt, grid, base));
        }
    }
    if (u_aoMode == 1) {
        // Contact bands fade smoothly away from occupied side neighbours.
        vec4 contact = sides * weights;
        return 1.0 - (1.0 - contact.x) * (1.0 - contact.y) * (1.0 - contact.z) * (1.0 - contact.w);
    }
    // Minecraft's two-side/one-diagonal corner rule, bilinearly interpolated.
    vec4 dark = vec4(cornerDarkness(sides.x, sides.z, corners.x),
                     cornerDarkness(sides.y, sides.z, corners.y),
                     cornerDarkness(sides.x, sides.w, corners.z),
                     cornerDarkness(sides.y, sides.w, corners.w));
    return mix(mix(dark.x, dark.y, face.x), mix(dark.z, dark.w, face.x), face.y);
}

// Near-field relief uses axial distance, so a flat face stays evenly lit.
// The whole root supplies the outside reference; inside it, the eye is the reference.
float depthRelief(float axialDepth) {
    // Select the support corner directly. Subtracting an enormous center and
    // half-width would lose the nearby plane at deep ancestor boundaries.
    vec3 corner = mix(u_high, u_low, step(vec3(0.0), u_forward));
    float front = max(0.0, dot(corner, u_forward));
    float depth = max(0.0, axialDepth - front) * (96.0 * u_fogDistanceScale);
    return 0.55 + 0.45 * exp(-0.9 * depth);
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
    float far = min(u_farDistance, min(min(exitAt.x, exitAt.y), exitAt.z));
    vec3 normal = entry.x >= entry.y && entry.x >= entry.z ? vec3(-sign(ray.x), 0.0, 0.0)
        : entry.y >= entry.z ? vec3(0.0, -sign(ray.y), 0.0) : vec3(0.0, 0.0, -sign(ray.z));
    float t = max(0.0, near);
    bool hit = false;
    vec3 local = vec3(0.0);
    float cellSize = 1.0;
    float footprint = u_nearFootprint;
    vec3 rootNormal = normal;
    vec4 surfaceGrid = vec4(0.0);
    int surfaceLevel = -1;
    vec4 occlusionGrid = vec4(0.0);
    int occlusionLevel = -1;
    float surfaceDepth = 0.0;
    float surfaceT = t;
    vec3 shadingNormal = normal;
    vec3 resolvedNormal = normal;
    float detailVisibility = 1.0;
    // Positive subpixel footprints retain the requested extra subdivision.
    // An unset diagnostic uniform still uses the original one-pixel cone.
    float detailScale = u_detailScale > 0.0 ? u_detailScale : 1.0;
    // Retry unusually expensive grazing rays at a coarser footprint instead
    // of turning an unfinished traversal into a false hole.
    for (int attempt = 0; attempt < 2; attempt++) {
      t = max(0.0, near);
      normal = rootNormal;
      surfaceLevel = -1;
      occlusionLevel = -1;
      surfaceDepth = 0.0;
      surfaceT = t;
      shadingNormal = rootNormal;
      resolvedNormal = rootNormal;
      detailVisibility = 1.0;
      int retainedLevels = 0;
      vec3 retainedLow = vec3(-1e30);
      vec3 retainedHigh = vec3(1e30);
      float retainedWidth = 1.0;
      bool retainedOutline = false;
      vec3 retainedOutlineLow = vec3(0.0);
      float retainedOutlineWidth = 1.0;
      if (far > t) {
        for (int stepIndex = 0; stepIndex < 512; stepIndex++) {
            if (t >= far) break;
            footprint = max(u_nearFootprint, t * u_pixelAngle) * detailScale * (attempt == 0 ? 1.0 : 8.0);
            vec3 p = ray * (t + footprint * 0.025);
            // Empty-cell jumps often stay inside the same retained parents.
            // Reuse that prefix until the sample leaves their shared bounds.
            // A growing pixel cone must still visit its new detail/edge cutoff.
            float inset = footprint * 0.05;
            if (retainedLevels > 0 && (
                any(lessThanEqual(p, retainedLow + vec3(inset))) ||
                any(greaterThanEqual(p, retainedHigh - vec3(inset))) ||
                retainedWidth < footprint ||
                (retainedOutline && retainedOutlineWidth <= footprint * 6.0))) {
                retainedLevels = 0;
                retainedLow = vec3(-1e30);
                retainedHigh = vec3(1e30);
                retainedOutline = false;
            }
            if (retainedOutline) {
                local = (p - retainedOutlineLow) / retainedOutlineWidth;
                cellSize = retainedOutlineWidth;
            }
            bool empty = false;
            int firstLevel = retainedLevels;
            for (int offset = 0; offset < 256; offset++) {
                int level = firstLevel + offset;
                if (level >= u_levels) break;
                float x = (float(level) + 0.5) / 256.0;
                vec4 grid = texture2D(u_grid, vec2(x, 0.25));
                float size = grid.w;
                // Stop before evaluating holes smaller than the ray's pixel cone.
                // Distance and clearance share the camera's zoom-scaled units.
                if (size < footprint) break;
                vec4 rule = texture2D(u_grid, vec2(x, 0.75));
                vec3 base = rule.xyz;
                vec3 cell = floor((p - grid.xyz) / size);
                vec3 digit = mod(base + cell, 3.0);
                vec3 low = grid.xyz + cell * size;
                if (!kept(digit)) {
                    // Add the integer boundary index before scaling. Building
                    // low first loses a nearby plane when cell == -1 and the
                    // ancestor width is much larger than the local offset.
                    vec3 edge = grid.xyz + (cell + step(vec3(0.0), ray)) * size;
                    vec3 distances = (edge - p) / safeRay;
                    // A parallel-axis quotient can overflow for huge ancestors.
                    // Select explicitly: arithmetic mix can multiply infinity
                    // by zero and poison the face-normal comparisons with NaN.
                    distances = vec3(abs(ray.x) < 1e-15 ? 1e30 : distances.x,
                                     abs(ray.y) < 1e-15 ? 1e30 : distances.y,
                                     abs(ray.z) < 1e-15 ? 1e30 : distances.z);
                    float jump = min(min(distances.x, distances.y), distances.z);
                    normal = distances.x <= distances.y && distances.x <= distances.z ? vec3(-sign(ray.x), 0.0, 0.0)
                        : distances.y <= distances.z ? vec3(0.0, -sign(ray.y), 0.0) : vec3(0.0, 0.0, -sign(ray.z));
                    // A newly resolved hole starts with its enclosing face's
                    // light. Reveal its own orientation over one subdivision,
                    // rather than changing brightness at the detail cutoff.
                    detailVisibility = smoothstep(1.0, 3.0, size / footprint);
                    if (detailVisibility == 1.0) resolvedNormal = normal;
                    shadingNormal = mix(resolvedNormal, normal, detailVisibility);
                    surfaceGrid = grid;
                    surfaceLevel = level;
                    surfaceDepth = rule.w;
                    // Remove the traversal's forward bias from the shading position.
                    surfaceT = t + footprint * 0.025 + jump;
                    t += max(jump + footprint * 0.03, footprint * 0.05);
                    empty = true;
                    break;
                }
                // AO follows the visible voxel, including holes in larger parents.
                occlusionGrid = grid;
                occlusionLevel = level;
                retainedLevels = level + 1;
                retainedLow = max(retainedLow, low);
                retainedHigh = min(retainedHigh, grid.xyz + (cell + vec3(1.0)) * size);
                retainedWidth = size;
                if (size > footprint * 6.0) {
                    local = (p - low) / size;
                    cellSize = size;
                    retainedOutline = true;
                    retainedOutlineLow = low;
                    retainedOutlineWidth = size;
                }
            }
            if (!empty) { hit = true; break; }
        }
    }
      if (hit || t >= far || far <= max(0.0, near)) break;
    }
    vec3 color = u_background;
    if (hit) {
        // Fully resolved faces use their exact hit normal; the smallest
        // visible subdivision reveals its lighting gradually.
        vec3 litNormal = length(shadingNormal) > 0.001 ? normalize(shadingNormal) : normal;
        // Mosely's left/right faces use a second, slightly darker material.
        // Follow the same detail fade as lighting so tiny new faces ease in.
        float faceTint = u_pattern >= 2 && u_faces ? 1.0 - 0.22 * abs(shadingNormal.x) : 1.0;
        vec3 material = u_fill * faceTint;
        float diffuse = max(0.0, dot(litNormal, normalize(vec3(-0.5, 0.8, 0.6))));
        float facing = 0.15 * max(0.0, dot(litNormal, -ray));
        float light = 0.38 + 0.62 * diffuse + facing;
        color = material * light;
        float occlusion = 0.0;
        if (u_aoMode > 0 && u_faces && surfaceLevel >= 0) {
            float resolved = detailVisibility * smoothstep(2.0, 8.0, occlusionGrid.w / max(u_nearFootprint, t * u_pixelAngle));
            // CPU-pruned ancestors are valid in the local horizon, including these neighbours.
            resolved *= 1.0 - smoothstep(0.125, 0.25, occlusionGrid.w / u_farDistance);
            if (resolved > 0.0) occlusion = resolved * surfaceOcclusion(ray * surfaceT, normal, occlusionGrid, occlusionLevel);
        }
        float ambientVisibility = 1.0 - (u_aoMode == 2 ? 0.7 : 0.55) * occlusion;
        vec3 edgeColor = u_stroke * light;
        if (u_lighting == 1 && u_faces) {
            vec3 key = normalize(-0.65 * u_right + 0.85 * u_up - 0.65 * u_forward);
            float sideLight = max(0.0, dot(litNormal, key));
            vec3 ambient = mix(vec3(0.27, 0.30, 0.36), vec3(0.36, 0.36, 0.33), 0.5 + 0.5 * dot(litNormal, u_up));
            vec3 illumination = min(vec3(1.0), ambient * ambientVisibility + 0.82 * sideLight * vec3(1.04, 1.0, 0.94));
            illumination *= depthRelief(surfaceT * dot(ray, u_forward));
            color = material * illumination;
            edgeColor = u_stroke * illumination;
        } else if (u_aoMode > 0) {
            color = material * (0.38 * ambientVisibility + 0.62 * diffuse + facing);
        }
        vec3 faceEdges = min(local, 1.0 - local);
        // Ignore the surface-normal axis when finding edges on this face.
        faceEdges += abs(normal) * 2.0;
        float edge = min(min(faceEdges.x, faceEdges.y), faceEdges.z) * cellSize;
        footprint = max(u_nearFootprint, t * u_pixelAngle);
        float outline = 1.0 - smoothstep(footprint * u_lineWidth * 0.25, footprint * (u_lineWidth * 0.25 + 0.6), edge);
        if (u_wire) color = mix(color, edgeColor, outline * (u_faces ? (u_lighting == 1 ? 0.18 : 0.25) : 1.0));
        if (!u_faces) color = mix(u_background, color, u_wire ? outline : 0.0);
        // Normalize one gentle haze curve to the background at the horizon.
        // No separate terminal fade that suddenly hides the next chamber.
        float distance = t * u_fogDistanceScale;
        float haze = 1.0 - exp(-u_fogDensity * max(0.0, distance - u_fogStart));
        float fog = clamp(haze / (1.0 - exp(-u_fogDensity * (1.0 - u_fogStart))), 0.0, 1.0);
        // A cool middle distance separates layers; the horizon still matches the backdrop.
        vec3 atmosphere = u_background;
        if (u_lighting == 1 && u_faces) atmosphere = mix(u_background, vec3(0.13, 0.18, 0.23), 0.3 * (1.0 - fog));
        color = mix(color, atmosphere, fog);
    }
    gl_FragColor = vec4(color, 1.0);
}
