#define PI 3.14159265359

uniform float uPixelRatio;
uniform float uTime;
uniform vec2 uResolution;
uniform float uWarpStrength;
uniform sampler2D uNoiseMap;
uniform sampler2D uGrainTexture;
uniform float uGrainStrength;
uniform float uFluteWidth;
uniform float uFluteStrength;
uniform float uToneMapExposure;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform vec3 uC4;
uniform vec3 uC5;
uniform int uAlgo;
varying vec2 vUv;
varying vec2 vUvA;

/**
 * Generates a dynamic scene of colorful Gaussian blobs with a fluted glass distortion effect.
 * param uv: Use a fluted uv for the input to keep the fluted glass effect
 */
vec3 GaussianBlobs(vec2 uv) {
    // Multi-color gradient scene — sampled via flutedUv for fluted glass effect
    float t = uTime * 0.6 + 3.5; // time with an offset for more interesting animation

    // Blob positions with slow organic animation
    vec2 p1 = vec2(-0.28 + sin(t * 0.7 + 0.5) * 0.15,  0.06 + cos(t * 0.5) * 0.12); // blue
    vec2 p2 = vec2(-0.06 + sin(t * 0.4 + 1.2) * 0.18,  0.16 + cos(t * 0.6) * 0.15); // magenta
    vec2 p3 = vec2( 0.07 + sin(t * 0.5 + 3.4) * 0.2,  0.00 + cos(t * 0.4) * 0.14); // red
    vec2 p4 = vec2( 0.22 + sin(t * 0.3 + 2.3) * 0.24, -0.10 + cos(t * 0.7) * 0.14); // orange
    vec2 p5 = vec2( 0.30 + sin(t * 0.6 + 1.1) * 0.18,  0.06 + cos(t * 0.4) * 0.13); // teal

    vec3 c1 = uC1;
    vec3 c2 = uC2;
    vec3 c3 = uC3;
    vec3 c4 = uC4;
    vec3 c5 = uC5;

    vec2 warpNoise = texture2D(uNoiseMap, vUv).rg * 2.0 - 1.0;
    vec2 warpedUv = uv + warpNoise * uWarpStrength;
    float d1 = dot(warpedUv - p1, warpedUv - p1);
    float d2 = dot(warpedUv - p2, warpedUv - p2);
    float d3 = dot(warpedUv - p3, warpedUv - p3);
    float d4 = dot(warpedUv - p4, warpedUv - p4);
    float d5 = dot(warpedUv - p5, warpedUv - p5);

    // Dark navy background + additive Gaussian blobs
    vec3 color = vec3(0.005, 0.010, 0.055);
    color += c1 * exp(-d1 * 12.0) * 1.4;
    color += c2 * exp(-d2 * 20.0) * 2.0;
    color += c3 * exp(-d3 *  9.0) * 1.6;
    color += c4 * exp(-d4 * 15.0) * 1.3;
    color += c5 * exp(-d5 * 25.0) * 0.8;

    return color;
}

vec2 rotate2d(vec2 v, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    mat2 m = mat2(c, -s, s, c);
    return m * v;
}

/**
 * Generates a dynamic scene of colorful Gaussian ellipses with a fluted glass distortion effect.
 * param uv: Use a fluted uv for the input to keep the fluted glass effect
 */
vec3 GaussianEllipses(vec2 uv) {
    float t = uTime * 0.6 + 3.5;

    vec2 p1 = vec2(-0.32 + sin(t * 0.5 + 1.8) * 0.20, -0.12 + cos(t * 0.8 + 0.3) * 0.16);
    vec2 p2 = vec2( 0.10 + sin(t * 0.6 + 2.5) * 0.14,  0.24 + cos(t * 0.3 + 1.7) * 0.18);
    vec2 p3 = vec2(-0.15 + sin(t * 0.9 + 0.7) * 0.22, -0.08 + cos(t * 0.5 + 2.9) * 0.11);
    vec2 p4 = vec2( 0.28 + sin(t * 0.4 + 3.1) * 0.17,  0.18 + cos(t * 0.6 + 0.9) * 0.20);
    vec2 p5 = vec2(-0.05 + sin(t * 0.7 + 4.2) * 0.13, -0.20 + cos(t * 0.9 + 1.5) * 0.15);

    vec3 c1 = uC1;
    vec3 c2 = uC2;
    vec3 c3 = uC3;
    vec3 c4 = uC4;
    vec3 c5 = uC5;

    vec2 warpNoise = texture2D(uNoiseMap, vUv).rg * 2. - 1.;
    vec2 warpedUv = uv + vec2(warpNoise.r * uWarpStrength, warpNoise.g * uWarpStrength * 0.2);

    vec2 dv1 = warpedUv - p1;
    vec2 dv2 = warpedUv - p2;
    vec2 dv3 = warpedUv - p3;
    vec2 dv4 = warpedUv - p4;
    vec2 dv5 = warpedUv - p5;

    // Per-blob rotation angles (radians)
    float a1 =  0.3;
    float a2 = -1.1;
    float a3 =  0.8;
    float a4 = -0.5;
    float a5 =  1.4;

    vec2 r1 = rotate2d(dv1, a1);
    vec2 r2 = rotate2d(dv2, a2);
    vec2 r3 = rotate2d(dv3, a3);
    vec2 r4 = rotate2d(dv4, a4);
    vec2 r5 = rotate2d(dv5, a5);

    // Elliptical Gaussian distance: dx^2 * ax + dy^2 * ay
    // ax != ay stretches each blob into an ellipse; equivalent to exp(-dot(d,d)*w) when ax == ay == w
    float e1 = r1.x * r1.x *  8.0 + r1.y * r1.y * 1.0;
    float e2 = r2.x * r2.x * 25.0 + r2.y * r2.y * 12.0;
    float e3 = r3.x * r3.x *  6.0 + r3.y * r3.y * 14.0;
    float e4 = r4.x * r4.x * 20.0 + r4.y * r4.y *  8.0;
    float e5 = r5.x * r5.x * 30.0 + r5.y * r5.y * 15.0;

    vec3 color = vec3(0.005, 0.010, 0.055);
    color += c1 * exp(-e1) * 1.4;
    color += c2 * exp(-e2) * 2.0;
    color += c3 * exp(-e3) * 1.6;
    color += c4 * exp(-e4) * 1.3;
    color += c5 * exp(-e5) * 0.8;

    return color;
}

void main() {
    vec2 mappedCoords = gl_FragCoord.xy / uPixelRatio - uResolution * 0.5;
    
    // Set up fluted/reeded effect
    // The fluted coordinates is basically a transformation of the mapped coordinates to simulate the horizontal refraction of fluted glass.
    vec2 scaledUv = mappedCoords / vec2(uFluteWidth);
    vec2 fractUv = vec2(fract(scaledUv.x), scaledUv.y);
    float flutedX = (uFluteStrength) * (fractUv.x - 0.5);
    float flutedY = -(uFluteStrength) * atanh(pow(fractUv.x, 6.));
    vec2 flutedCoords = vec2(mappedCoords.x + flutedX, mappedCoords.y + flutedY);
    // vec2 flutedUv = (flutedCoords + uResolution * 0.5) / uResolution;
    vec2 flutedUv = flutedCoords / 1000.;

    vec3 color = (uAlgo == 0) ? GaussianBlobs(flutedUv) : GaussianEllipses(flutedUv);

    // Exponential tone mapping — compresses overbright, keeps rich colors
    color = 1.0 - exp(-color * uToneMapExposure);

    // Film grain effect
    float grain = texture2D(uGrainTexture, vUvA).r * 2.0 - 1.0; // Convert from [0, 1] to [-1, 1]
    color += grain * uGrainStrength * max(color.r, max(color.g, color.b)); // Modulate grain strength by the brightness of the pixel
    color = clamp(color, 0.0, 1.0);

    gl_FragColor = vec4(color, 1.0);
}