// High-precision worker results: iteration index, log(|z|), escaped, repaired.
// Existing valid pixels are untouched. Palette evaluation stays on the GPU.
uniform sampler2D u_pixelSummary;
uniform vec2 u_tileOrigin;
uniform vec2 u_tileSize;

void main() {
    vec4 result = texture2D(u_pixelSummary, (gl_FragCoord.xy-u_tileOrigin)/u_tileSize);
    if (result.a == 0.0) discard;
    if (result.b == 0.0) { gl_FragColor = vec4(u_interior, 1.0); return; }
    float smoothIteration = max(result.r+1.0-log2(max(result.g, 1e-6)), 0.0);
    float t = smoothIteration/40.0;
    if (u_colorMode == MODE_LOG) t = min(log(smoothIteration+1.0)/log(u_maxIterations+1.0), 0.9999);
    else if (u_colorMode == MODE_BANDED) t = result.r/32.0;
    gl_FragColor = vec4(paletteColor(t*u_colorDensity+u_colorOffset), 1.0);
}
