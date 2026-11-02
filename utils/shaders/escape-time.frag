// Shared escape-time shader for the Mandelbrot set, Julia sets, the Burning Ship and
// their relatives. The page prepends one FORMULA_* define.
precision highp float;

uniform vec2 u_resolution;
uniform float u_logPixelScale;
uniform vec2 u_center;
uniform float u_zoomSize;
uniform vec2 u_c;
uniform float u_maxIterations;
uniform int u_colorMode;
uniform int u_palette;
uniform float u_colorDensity;
uniform float u_colorOffset;
uniform vec3 u_interior;

// WebGL 1 loops need a constant bound; u_maxIterations breaks out earlier.
const int ITERATION_LIMIT = 8192;
const float escapeRadius = 256.0;
const float escapeRadius2 = escapeRadius * escapeRadius;
const float stripeDensity = 5.0;

const int MODE_SMOOTH = 0;
const int MODE_LOG = 1;
const int MODE_BANDED = 2;
const int MODE_DISTANCE = 3;
const int MODE_STRIPES = 4;
const int MODE_TRAP_POINT = 5;
const int MODE_TRAP_CROSS = 6;

// Barnsley's tree is drawn with a chosen circle: its picture depends on the radius.
#ifdef FORMULA_BARNSLEY_TREE
uniform float u_escapeRadius;
#define ESCAPE_LIMIT u_escapeRadius
#else
#define ESCAPE_LIMIT escapeRadius
#endif

vec2 complexMultiply(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

vec2 complexSquare(vec2 v) {
    return vec2(v.x * v.x - v.y * v.y, v.x * v.y * 2.0);
}

// Procedural palette generator by Inigo Quilez.
// See: http://iquilezles.org/articles/palettes/
vec3 cosinePalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

vec3 gradient5(float t, vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec3 c4, float p1, float p2, float p3) {
    if (t < p1) return mix(c0, c1, smoothstep(0.0, p1, t));
    if (t < p2) return mix(c1, c2, smoothstep(p1, p2, t));
    if (t < p3) return mix(c2, c3, smoothstep(p2, p3, t));
    return mix(c3, c4, smoothstep(p3, 1.0, t));
}

vec3 paletteColor(float t) {
    t = fract(t);

    // Classic: the cosine rainbow fractal.garden has always used.
    if (u_palette == 0) {
        return cosinePalette(t, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.1, 0.2));
    }
    // Ultra Fractal: the blue / white / gold gradient known from Wikipedia renders.
    if (u_palette == 1) {
        return gradient5(
            t,
            vec3(0.0, 0.027, 0.392),
            vec3(0.125, 0.42, 0.796),
            vec3(0.929, 1.0, 1.0),
            vec3(1.0, 0.667, 0.0),
            vec3(0.0, 0.008, 0.0),
            0.16, 0.42, 0.6425
        );
    }
    // Fire: black body heat, from dark red through orange to pale yellow.
    if (u_palette == 2) {
        return gradient5(
            t,
            vec3(0.02, 0.0, 0.0),
            vec3(0.3, 0.01, 0.0),
            vec3(0.85, 0.22, 0.0),
            vec3(1.0, 0.6, 0.05),
            vec3(1.0, 0.95, 0.6),
            0.5, 0.75, 0.9
        );
    }
    // Ice: midnight blue to cyan to white.
    if (u_palette == 3) {
        return gradient5(
            t,
            vec3(0.0, 0.01, 0.05),
            vec3(0.02, 0.1, 0.32),
            vec3(0.05, 0.45, 0.75),
            vec3(0.45, 0.85, 0.98),
            vec3(0.95, 1.0, 1.0),
            0.3, 0.55, 0.8
        );
    }
    // Rainbow: full hue cycle.
    if (u_palette == 4) {
        return cosinePalette(t, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
    }
    // Twilight: purple, pink and peach.
    if (u_palette == 5) {
        return cosinePalette(t, vec3(0.5), vec3(0.5), vec3(1.0, 1.0, 0.5), vec3(0.8, 0.9, 0.3));
    }
    // Grayscale.
    return vec3(t);
}

// Continuous iteration counts. Beyond the escape circle a point's log-size doubles
// per step for a square, triples for a cube, and only grows by log|c| for a linear map.
#ifdef FORMULA_CACTUS
float escapeOvershoot(float logZ) { return log(max(logZ, 1e-6)) / log(3.0); }
float escapeBlend(float logZ) { return 1.0 + log(log(escapeRadius) / max(logZ, 1e-6)) / log(3.0); }
#elif defined(FORMULA_BARNSLEY_TREE)
float escapeOvershoot(float logZ) { return (logZ - log(ESCAPE_LIMIT)) / max(log(length(u_c)), 1e-3); }
float escapeBlend(float logZ) { return 1.0 - escapeOvershoot(logZ); }
#else
float escapeOvershoot(float logZ) { return log2(max(logZ, 1e-6)); }
float escapeBlend(float logZ) { return 1.0 + log2(log(escapeRadius) / max(logZ, 1e-6)); }
#endif

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    float pixelSize = 2.0 * u_zoomSize / min(u_resolution.x, u_resolution.y) * exp2(-u_logPixelScale);

#ifdef FORMULA_BURNING_SHIP
    // Flip the imaginary axis so the ship sails upright.
    vec2 point = u_center + vec2(uv.x, -uv.y) * u_zoomSize;
#else
    vec2 point = u_center + uv * u_zoomSize;
#endif

#if defined(FORMULA_JULIA) || defined(FORMULA_BARNSLEY_TREE)
    vec2 z = point;
    vec2 c = u_c;
    vec2 dz = vec2(1.0, 0.0);
#elif defined(FORMULA_CACTUS)
    vec2 z = point;
    vec2 c = point;
    vec2 dz = vec2(1.0, 0.0);
#else
    vec2 z = vec2(0.0);
    vec2 c = point;
    vec2 dz = vec2(0.0);
#endif

#ifdef FORMULA_MANDELBROT
    // Strictly inside the main cardioid or period-two bulb, non-trap modes
    // always use the interior color. Leave a rounding margin at both borders.
    if (u_colorMode < MODE_TRAP_POINT) {
        float x = c.x - 0.25;
        float q = x*x + c.y*c.y;
        float bulb = (c.x+1.0)*(c.x+1.0) + c.y*c.y;
        if (q*(q+x) < 0.25*c.y*c.y - 0.000002 || bulb < 0.0625 - 0.000002) {
            gl_FragColor = vec4(u_interior,1.0);
            return;
        }
    }
#endif

    float iteration = 0.0;
    bool escaped = false;
    float trap = 1e10;
    float stripeSum = 0.0;
    float stripeLast = 0.0;

    for (int i = 0; i < ITERATION_LIMIT; i++) {
        if (iteration >= u_maxIterations) break;

#ifdef FORMULA_BURNING_SHIP
        vec2 fold = sign(z);
        vec2 az = abs(z);
        if (u_colorMode == MODE_DISTANCE) dz = 2.0 * complexMultiply(az, dz * fold) + vec2(1.0, 0.0);
        z = complexSquare(az) + c;
#elif defined(FORMULA_JULIA)
        if (u_colorMode == MODE_DISTANCE) dz = 2.0 * complexMultiply(z, dz);
        z = complexSquare(z) + c;
#elif defined(FORMULA_MANDELBAR)
        vec2 flipped = vec2(z.x, -z.y);
        if (u_colorMode == MODE_DISTANCE) dz = 2.0 * complexMultiply(flipped, vec2(dz.x, -dz.y)) + vec2(1.0, 0.0);
        z = complexSquare(flipped) + c;
#elif defined(FORMULA_CACTUS)
        // z^3 + (c - 1) z - c, written as z (z^2 + c - 1) - c.
        vec2 inner = complexSquare(z) + c - vec2(1.0, 0.0);
        if (u_colorMode == MODE_DISTANCE) dz = complexMultiply(inner + 2.0 * complexSquare(z), dz) + z - vec2(1.0, 0.0);
        z = complexMultiply(inner, z) - c;
#elif defined(FORMULA_BARNSLEY_TREE)
        // Move one unit toward the vertical axis, then rotate and scale by c.
        if (u_colorMode == MODE_DISTANCE) dz = complexMultiply(c, dz);
        z = complexMultiply(c, z - vec2(sign(z.x), 0.0));
#else
        if (u_colorMode == MODE_DISTANCE) dz = 2.0 * complexMultiply(z, dz) + vec2(1.0, 0.0);
        z = complexSquare(z) + c;
#endif

        if (u_colorMode == MODE_TRAP_POINT) {
            trap = min(trap, length(z));
        } else if (u_colorMode == MODE_TRAP_CROSS) {
            trap = min(trap, min(abs(z.x), abs(z.y)));
        } else if (u_colorMode == MODE_STRIPES) {
            stripeLast = 0.5 + 0.5 * sin(stripeDensity * atan(z.y, z.x));
            stripeSum += stripeLast;
        }

        if (dot(z, z) > ESCAPE_LIMIT * ESCAPE_LIMIT) {
            escaped = true;
            break;
        }
        iteration += 1.0;
    }

    bool trapMode = u_colorMode == MODE_TRAP_POINT || u_colorMode == MODE_TRAP_CROSS;

    if (!escaped && !trapMode) {
        gl_FragColor = vec4(u_interior, 1.0);
        return;
    }

    float logZ = log(dot(z, z)) / 2.0;
    // Continuous (normalized) iteration count, see "smooth coloring" on Wikipedia.
    float smoothIteration = max(iteration + 1.0 - escapeOvershoot(logZ), 0.0);
    float t;

    if (u_colorMode == MODE_LOG) {
        t = log(smoothIteration + 1.0) / log(u_maxIterations + 1.0);
    } else if (u_colorMode == MODE_BANDED) {
        t = iteration / 32.0;
    } else if (u_colorMode == MODE_DISTANCE) {
        float distanceEstimate = 0.5 * sqrt(dot(z, z)) * logZ / max(length(dz), 1e-20);
        float pixels = distanceEstimate / pixelSize;
        t = 1.0 - clamp(log2(1.0 + pixels) / 10.0, 0.0, 1.0);
    } else if (u_colorMode == MODE_STRIPES) {
        // Stripe average coloring (Härkönen), blended between the last two averages.
        float count = max(iteration + 1.0, 1.0);
        float average = stripeSum / count;
        float previous = count > 1.0 ? (stripeSum - stripeLast) / (count - 1.0) : average;
        float blend = clamp(escapeBlend(logZ), 0.0, 1.0);
        t = mix(previous, average, blend);
    } else if (trapMode) {
        t = sqrt(trap);
    } else {
        t = smoothIteration / 40.0;
    }

    if (u_colorMode == MODE_LOG || u_colorMode == MODE_DISTANCE) {
        // These modes map onto the gradient once; keep the top end from wrapping to the start.
        t = min(t, 0.9999);
    }

    vec3 color = paletteColor(t * u_colorDensity + u_colorOffset);

    // The distance estimate adds a soft glow toward the boundary instead of hard bands.
    if (u_colorMode == MODE_DISTANCE) {
        color *= 0.25 + 0.75 * t;
    }

    gl_FragColor = vec4(color, 1.0);
}
