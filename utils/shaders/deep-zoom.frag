// Appended to the existing escape-time shader's shared palette/color uniforms.
// Each scalar is an unevaluated product mantissa * 2^exponent. Keeping the
// components separate also preserves the tiny imaginary values near Ship needles.
uniform sampler2D u_reference;
uniform vec2 u_referenceSize;
uniform float u_referenceLength;
uniform float u_criticalStart;
uniform float u_criticalLength;
uniform bool u_exactPixel;
uniform vec4 u_deltaCenter;
uniform vec2 u_scale;
uniform vec2 u_pixelOffset;
uniform sampler2D u_approximation;
uniform vec2 u_approximationSize;
uniform float u_approximationLogDeltaC;
uniform float u_approximationMaxLogRadius;
uniform bool u_hasApproximation;
uniform float u_nativeReferenceStart;
uniform bool u_hasNativeReference;
const int DEEP_ITERATION_LIMIT = 8192;

vec2 fe(float m, float e) {
    if (m == 0.0) return vec2(0.0);
    float shift = floor(log2(abs(m)));
    // Below all recoverable scales within this renderer's iteration budget.
    if (e + shift < -100000.0) return vec2(0.0);
    return vec2(m * exp2(-shift), e + shift);
}
vec2 feAdd(vec2 a, vec2 b) {
    if (a.x == 0.0) return b;
    if (b.x == 0.0) return a;
    float e = max(a.y, b.y);
    return fe((a.y-e < -120.0 ? 0.0 : a.x * exp2(a.y-e)) + (b.y-e < -120.0 ? 0.0 : b.x * exp2(b.y-e)), e);
}
vec2 feNeg(vec2 a) { return vec2(-a.x, a.y); }
vec2 feMul(vec2 a, vec2 b) { return fe(a.x * b.x, a.y + b.y); }
vec2 feTwice(vec2 a) { return a.x == 0.0 ? a : vec2(a.x, a.y + 1.0); }
float ordinary(vec2 a) { return a.y < -120.0 ? 0.0 : a.x * exp2(min(a.y, 120.0)); }
vec4 cxAdd(vec4 a, vec4 b) { return vec4(feAdd(a.xy, b.xy), feAdd(a.zw, b.zw)); }
vec4 cxMul(vec4 a, vec4 b) {
    return vec4(feAdd(feMul(a.xy,b.xy), feNeg(feMul(a.zw,b.zw))),
                feAdd(feMul(a.xy,b.zw), feMul(a.zw,b.xy)));
}
vec4 cxSquare(vec4 a) {
    return vec4(feAdd(feMul(a.xy,a.xy), feNeg(feMul(a.zw,a.zw))), feTwice(feMul(a.xy,a.zw)));
}
vec4 cxTwice(vec4 a) { return vec4(feTwice(a.xy), feTwice(a.zw)); }
vec2 cxValue(vec4 a) { return vec2(ordinary(a.xy), ordinary(a.zw)); }
float scaled(vec2 a, float e) { return a.x == 0.0 || a.y-e < -120.0 ? 0.0 : a.x * exp2(min(a.y-e,60.0)); }
float cxLogLength(vec4 a) {
    if (a.x == 0.0 && a.z == 0.0) return -1e6;
    float e = max(a.x == 0.0 ? -1e6 : a.y, a.z == 0.0 ? -1e6 : a.w);
    vec2 m = vec2(scaled(a.xy,e),scaled(a.zw,e));
    return e + log2(max(length(m), 1e-30));
}
float logAdd(float a, float b) {
    float top=max(a,b);
    if (top < -500000.0) return -1e6;
    return top+log2(1.0+exp2(-min(120.0,abs(a-b))));
}
vec4 referenceAt(float index) {
    vec2 uv = (vec2(mod(index,u_referenceSize.x), floor(index/u_referenceSize.x)) + 0.5) / u_referenceSize;
    return texture2D(u_reference, uv);
}
vec4 approximationAt(float index) {
    vec2 uv = (vec2(mod(index,u_approximationSize.x),floor(index/u_approximationSize.x)) + 0.5) / u_approximationSize;
    return texture2D(u_approximation,uv);
}
// |a+b|-|a|, without subtracting almost equal large values.
vec2 diffAbs(vec2 a, vec2 b) {
    vec2 sum = feAdd(a,b);
    if (a.x >= 0.0) return sum.x >= 0.0 ? b : feNeg(feAdd(feTwice(a),b));
    return sum.x <= 0.0 ? feNeg(b) : feAdd(feTwice(a),b);
}
vec4 perturbFull(vec4 ref, vec4 delta, vec4 dc) {
#ifdef FORMULA_BURNING_SHIP
    delta = vec4(diffAbs(ref.xy,delta.xy), diffAbs(ref.zw,delta.zw));
    ref.x = abs(ref.x);
    ref.z = abs(ref.z);
#endif
    return cxAdd(cxAdd(cxTwice(cxMul(ref,delta)),cxSquare(delta)),dc);
}
vec4 perturb(vec4 ref, vec4 delta, vec4 dc) {
    // Most iterations can use native vec2 arithmetic with one shared scale.
    // Critical/small reference components and widely separated deltas use the
    // full range path; those cases must never silently underflow.
    float e = max(delta.x == 0.0 ? -1e6 : delta.y, delta.z == 0.0 ? -1e6 : delta.w);
    bool balanced = (delta.x == 0.0 || e-delta.y < 60.0) && (delta.z == 0.0 || e-delta.w < 60.0);
    #ifdef FORMULA_BURNING_SHIP
    bool regular = ref.x != 0.0 && ref.z != 0.0 && ref.y > -60.0 && ref.w > -60.0;
#else
    bool regular = (ref.x != 0.0 && ref.y > -60.0) || (ref.z != 0.0 && ref.w > -60.0);
#endif
    if (regular && balanced && e > -1e5 && e < 30.0) {
        vec2 r = cxValue(ref);
        vec2 d = vec2(scaled(delta.xy,e),scaled(delta.zw,e));
        float s = e > -120.0 ? exp2(e) : 0.0;
#ifdef FORMULA_BURNING_SHIP
        // Scale the cancellation-safe absolute difference, including crossings.
        vec2 sum = r + s*d;
        d.x = r.x >= 0.0 ? (sum.x >= 0.0 ? d.x : -2.0*r.x/s-d.x) : (sum.x <= 0.0 ? -d.x : 2.0*r.x/s+d.x);
        d.y = r.y >= 0.0 ? (sum.y >= 0.0 ? d.y : -2.0*r.y/s-d.y) : (sum.y <= 0.0 ? -d.y : 2.0*r.y/s+d.y);
        r = abs(r);
#endif
        // A larger forcing term must use the full path to avoid overflow.
        if ((dc.x == 0.0 || dc.y-e < 60.0) && (dc.z == 0.0 || dc.w-e < 60.0)) {
            vec2 forcing = vec2(scaled(dc.xy,e),scaled(dc.zw,e));
            vec2 next = 2.0*complexMultiply(r,d) + s*complexSquare(d) + forcing;
            return vec4(fe(next.x,e),fe(next.y,e));
        }
    }
    return perturbFull(ref,delta,dc);
}

bool nativeRebase(vec2 z, vec2 d) {
    float scale = max(max(abs(z.x),abs(z.y)),max(abs(d.x),abs(d.y)));
    if (scale > 0.0 && scale < 1e-10) { z /= scale; d /= scale; }
    return dot(z,z) < dot(d,d);
}

void main() {
    // Repair tiles measure from their own reference pixel. Subtract in pixel
    // coordinates, before scaling, so shrinking tiles also shrink input error.
    vec2 uv = (2.0*gl_FragCoord.xy-u_resolution-2.0*u_pixelOffset)/min(u_resolution.x,u_resolution.y);
#ifdef FORMULA_BURNING_SHIP
    uv.y = -uv.y;
#endif
    vec4 offset = u_exactPixel ? vec4(0.0) : cxAdd(u_deltaCenter,vec4(fe(uv.x*u_scale.x,u_scale.y),fe(uv.y*u_scale.x,u_scale.y)));
#ifdef FORMULA_JULIA
    vec4 delta = offset;
    vec4 dc = vec4(0.0);
    vec4 derivative = vec4(u_scale,0.0,0.0);
#else
    vec4 delta = vec4(0.0);
    vec4 dc = offset;
    vec4 derivative = vec4(0.0);
#endif
    float refIndex = 0.0;
    float refStart = 0.0;
    float refLength = u_referenceLength;
    vec4 ref = referenceAt(0.0);
    vec4 actual = cxAdd(ref,delta);
    vec2 z = cxValue(actual);
#ifdef FORMULA_BURNING_SHIP
    // Track accumulated roundoff, not just instantaneous cancellation. Folded
    // trajectories can amplify a small coefficient error over many rebases.
    float logError=-1e6;
    float uvLength=max(abs(uv.x),abs(uv.y));
    float inputError=u_exactPixel ? -1e6 : logAdd(cxLogLength(u_deltaCenter),uvLength==0.0 ? -1e6 : u_scale.y+log2(u_scale.x*uvLength))-22.0;
#endif
    bool canSkip = false;
#ifdef FORMULA_MANDELBROT
    canSkip = u_hasApproximation && u_colorMode < MODE_DISTANCE && cxLogLength(dc) <= u_approximationLogDeltaC;
#endif
    float iteration = 0.0;
    bool escaped = false;
    bool glitch = false;
    float trap = 1e10;
    float stripeSum = 0.0;
    float stripeLast = 0.0;
    bool finishedNative = false;
#ifdef FORMULA_MANDELBROT
    // In this range delta-c is a normal float. Keep it and the orbit delta in
    // native arithmetic throughout; range-sensitive views retain the full path.
    bool nativeForcing = (dc.x == 0.0 || dc.y >= -120.0) && (dc.z == 0.0 || dc.w >= -120.0);
    if (u_hasNativeReference && u_scale.y >= -110.0 && nativeForcing && u_colorMode != MODE_DISTANCE && !u_exactPixel) {
        float skipRadius = exp2(u_approximationMaxLogRadius);
        vec2 d = vec2(0.0);
        vec2 forcing = cxValue(dc);
        vec2 r = referenceAt(u_nativeReferenceStart).xy;
        bool restartFull = false;
        for (int i=0; i<DEEP_ITERATION_LIMIT; i++) {
            if (iteration >= u_maxIterations) break;
            // Long sensitive orbits retain the established componentwise path.
            // This limit is identical during movement and at rest.
            if (i >= 128) { restartFull = true; break; }
            if (canSkip && max(abs(d.x),abs(d.y)) < skipRadius) {
                vec4 header = approximationAt(5.0*refIndex);
                float coefficients = 1.0;
                // Divide before measuring: dot(d,d) can underflow at these zooms.
                if (!(header.y > 1.0 && iteration+header.y <= u_maxIterations && length(d/exp2(header.x)) < 1.0)) {
                    header.xy=header.zw; coefficients=3.0;
                }
                if (header.y > 1.0 && iteration+header.y <= u_maxIterations && length(d/exp2(header.x)) < 1.0) {
                    vec2 a = cxValue(approximationAt(5.0*refIndex+coefficients));
                    vec2 b = cxValue(approximationAt(5.0*refIndex+coefficients+1.0));
                    d = complexMultiply(a,d)+complexMultiply(b,forcing);
                    refIndex += header.y;
                    iteration += header.y;
                    r = referenceAt(u_nativeReferenceStart+refIndex).xy;
                    z = r+d;
                    if (nativeRebase(z,d) || refIndex >= u_referenceLength-1.0) {
                        d=z; refIndex=0.0; r=vec2(0.0);
                    }
                    continue;
                }
            }
            d = 2.0*complexMultiply(r,d) + complexSquare(d) + forcing;
            refIndex += 1.0;
            r = referenceAt(u_nativeReferenceStart+refIndex).xy;
            z = r+d;
            if (u_colorMode == MODE_TRAP_POINT) trap = min(trap,length(z));
            else if (u_colorMode == MODE_TRAP_CROSS) trap = min(trap,min(abs(z.x),abs(z.y)));
            else if (u_colorMode == MODE_STRIPES) {
                stripeLast = 0.5+0.5*sin(stripeDensity*atan(z.y,z.x));
                stripeSum += stripeLast;
            }
            if (dot(z,z) > escapeRadius2) { escaped=true; break; }
            if (nativeRebase(z,d) || refIndex >= u_referenceLength-1.0) {
                d=z; refIndex=0.0; r=vec2(0.0);
            }
            iteration += 1.0;
        }
        finishedNative = !restartFull;
        if (restartFull) {
            delta=vec4(0.0); refIndex=0.0; ref=referenceAt(0.0);
            actual=ref; z=cxValue(actual); iteration=0.0;
            trap=1e10; stripeSum=0.0; stripeLast=0.0;
            canSkip=false;
        }
    }
#endif
    if (!finishedNative) {
    for (int i=0; i<DEEP_ITERATION_LIMIT; i++) {
        if (iteration >= u_maxIterations) break;
#ifdef FORMULA_MANDELBROT
        if (canSkip && max(delta.x == 0.0 ? -1e6 : delta.y, delta.z == 0.0 ? -1e6 : delta.w) < u_approximationMaxLogRadius) {
            vec4 header = approximationAt(5.0*refIndex);
            float coefficients = 1.0;
            float logDelta = cxLogLength(delta);
            if (!(header.y > 1.0 && iteration+header.y <= u_maxIterations && logDelta < header.x)) {
                header.xy=header.zw; coefficients=3.0;
            }
            if (header.y > 1.0 && iteration+header.y <= u_maxIterations && logDelta < header.x) {
                vec4 a = approximationAt(5.0*refIndex+coefficients);
                vec4 b = approximationAt(5.0*refIndex+coefficients+1.0);
                delta = cxAdd(cxMul(a,delta),cxMul(b,dc));
                refIndex += header.y;
                iteration += header.y;
                ref = referenceAt(refIndex);
                actual = cxAdd(ref,delta);
                z = cxValue(actual);
                // All intermediate states in an admitted block are below bailout.
                if (cxLogLength(actual) < cxLogLength(delta) || refIndex >= u_referenceLength-1.0) {
                    delta=actual; refIndex=0.0; ref=referenceAt(0.0);
                }
                continue;
            }
        }
#endif
        if (u_colorMode == MODE_DISTANCE) {
            vec4 derivativeZ = actual;
#ifdef FORMULA_BURNING_SHIP
            derivative.x *= sign(actual.x);
            derivative.z *= sign(actual.z);
            derivativeZ.x = abs(derivativeZ.x);
            derivativeZ.z = abs(derivativeZ.z);
#endif
            derivative = cxTwice(cxMul(derivativeZ,derivative));
#ifndef FORMULA_JULIA
            derivative = cxAdd(derivative,vec4(u_scale,0.0,0.0));
#endif
        }
#ifdef FORMULA_BURNING_SHIP
        float logDelta=cxLogLength(delta);
        float arithmeticError=max(cxLogLength(ref)+logDelta+1.0,2.0*logDelta)-20.0;
        logError=logAdd(logError+1.0+cxLogLength(actual),logAdd(arithmeticError,inputError));
#endif
        delta = perturb(ref,delta,dc);
        refIndex += 1.0;
        ref = referenceAt(refStart+refIndex);
        actual = cxAdd(ref,delta);
#ifdef FORMULA_BURNING_SHIP
        if (logError > -500000.0 && logError > cxLogLength(actual)-6.0) { glitch=true; break; }
#endif
        z = cxValue(actual);
        if (u_colorMode == MODE_TRAP_POINT) trap = min(trap,length(z));
        else if (u_colorMode == MODE_TRAP_CROSS) trap = min(trap,min(abs(z.x),abs(z.y)));
        else if (u_colorMode == MODE_STRIPES) {
            stripeLast = 0.5+0.5*sin(stripeDensity*atan(z.y,z.x));
            stripeSum += stripeLast;
        }
        if (dot(z,z) > escapeRadius2) { escaped=true; break; }
        {
#ifdef FORMULA_JULIA
            if (cxLogLength(actual) < cxLogLength(ref)-5.0) { glitch=true; break; }
            if (cxLogLength(actual) < cxLogLength(delta) || refIndex >= refLength-1.0) {
                // Rebase onto z0=0 for this same c, never onto the camera seed.
                delta=actual;
                refIndex=0.0;
                refStart=u_criticalStart;
                refLength=u_criticalLength;
                ref=referenceAt(refStart);
            }
#else
#ifdef FORMULA_BURNING_SHIP
            // Cancellation in either folded component can amplify error.
            if ((ref.x != 0.0 && (actual.x == 0.0 || actual.y < ref.y-12.0)) ||
                (ref.z != 0.0 && (actual.z == 0.0 || actual.w < ref.w-12.0))) { glitch=true; break; }
#endif
            if (cxLogLength(actual) < cxLogLength(delta) || refIndex >= u_referenceLength-1.0) {
#ifdef FORMULA_BURNING_SHIP
                logError=logAdd(logError,cxLogLength(ref)-22.0);
#endif
                delta=actual;
                refIndex=0.0;
                ref=referenceAt(0.0);
            }
#endif
        }
        iteration += 1.0;
    }
    }
    // Alpha is a validity mask. The renderer replaces these tiles with fresh
    // high-precision references; it never treats them as interior pixels.
    if (glitch) { gl_FragColor=vec4(u_interior,0.0); return; }
    bool trapMode = u_colorMode == MODE_TRAP_POINT || u_colorMode == MODE_TRAP_CROSS;
    if (!escaped && !trapMode) { gl_FragColor=vec4(u_interior,1.0); return; }
    float logZ=log(max(dot(z,z),1e-30))/2.0;
    float smoothIteration=max(iteration+1.0-log2(max(logZ,1e-6)),0.0);
    float t;
    if (u_colorMode == MODE_LOG) t=log(smoothIteration+1.0)/log(u_maxIterations+1.0);
    else if (u_colorMode == MODE_BANDED) t=iteration/32.0;
    else if (u_colorMode == MODE_DISTANCE) {
        // derivative is scaled by the view half-span, so no tiny pixel size or
        // huge derivative is ever converted to an ordinary float.
        float logPixels = log2(max(0.5*length(z)*logZ,1e-30)) - cxLogLength(derivative)
            + log2(min(u_resolution.x,u_resolution.y)/2.0) + u_logPixelScale;
        t=1.0-clamp(log2(1.0+exp2(clamp(logPixels,-100.0,100.0)))/10.0,0.0,1.0);
    } else if (u_colorMode == MODE_STRIPES) {
        float count=max(iteration+1.0,1.0);
        float average=stripeSum/count;
        float previous=count>1.0 ? (stripeSum-stripeLast)/(count-1.0) : average;
        float blend=clamp(1.0+log2(log(escapeRadius)/max(logZ,1e-6)),0.0,1.0);
        t=mix(previous,average,blend);
    } else if (trapMode) t=sqrt(trap);
    else t=smoothIteration/40.0;
    if (u_colorMode == MODE_LOG || u_colorMode == MODE_DISTANCE) t=min(t,0.9999);
    vec3 color=paletteColor(t*u_colorDensity+u_colorOffset);
    if (u_colorMode == MODE_DISTANCE) color*=0.25+0.75*t;
    gl_FragColor=vec4(color,1.0);
}
