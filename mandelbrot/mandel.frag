precision highp float;

uniform int u_maxIterations;
uniform vec2 iResolution;

vec2 f(vec2 x, vec2 c) {
    return mat2(x, - x.y, x.x) * x + c;
}
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

vec3 paletteColor(float t) {
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.0);
    vec3 d = vec3(0.0, 0.1, 0.2);
    return palette(fract(t + 0.5), a, b, c, d);
}

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution;
    vec2 z = vec2(0.0);
    bool escaped = false;
    int iterations = 0;
    for(int i = 0; i < 10000; i ++ ) {
        if (i > u_maxIterations)break;
        iterations = i;
        z = f(z, c);
        if (length(z) > 2.0) {
            escaped = true;
            break;
        }
    }
    // 0.5, 0.5, 0.5		0.5, 0.5, 0.5	1.0, 0.7, 0.4	0.00, 0.15, 0.20
    // 0.5, 0.5, 0.5		0.5, 0.5, 0.5	1.0, 1.0, 1.0	0.00, 0.10, 0.20
    
    // vec3 a = vec3(0.5);
    // vec3 b = vec3(0.5);
    // vec3 c = vec3(1.0);
    // vec3 d = vec3(0.0, 0.1, 0.2);
    
    // gl_FragColor = escaped ? vec4(palette(float(iterations)/float(u_maxIterations), vec3(0.0),vec3(0.59,0.55,0.75),vec3(0.1, 0.2, 0.3),vec3(0.75)),1.0) : vec4(vec3(0.85, 0.99, 1.0), 1.0);
    // gl_FragColor = escaped ? vec4(palette(float(iterations)/float(u_maxIterations), vec3(0.0),vec3(0.59,0.55,0.75),vec3(0.2, 0.3, 0.3),vec3(0.75)),1.0) : vec4(vec3(0.85, 0.99, 1.0), 1.0);
    // gl_FragColor = escaped ? vec4(palette(float(iterations)/float(u_maxIterations), a, b, c, d),1.0) : vec4(vec3(0.0, 0.0, 0.0), 1.0);
    
    vec3 color = iterations >= u_maxIterations ? vec3(0.0) : paletteColor(float(iterations) / float(u_maxIterations));
    gl_FragColor = vec4(color, 1.0);
}