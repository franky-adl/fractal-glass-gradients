uniform float uPixelRatio;
uniform float uTime;
uniform vec2 uResolution;
uniform float uNoiseScaleX;
uniform float uNoiseScaleY;
uniform float uWarpStrength;
varying vec2 vUv;
varying vec3 vPos;

#include ./snoise2d.glsl

// draw a red circle of 200px radius with the provided origin
vec3 drawCircle(vec2 coords, vec2 origin) {
    float radius = 200.0;
    float distanceFromOrigin = length(coords - origin);
    if (distanceFromOrigin < radius) {
        return vec3(1.0, 0.0, 0.0);
    }
    return vec3(0.0);
}

// added from https://www.shadertoy.com/view/MdBfR1
// demo range of 'k':  2.0 .. 8.0
float sstep(float x, float k)
{
    x = clamp(x, 0.0, 1.0);
    float s = sign(x-0.5);
    float o = (1.0+s)/2.0;
    return o - 0.5*s*pow(2.0*(o-s*x),k);
}

vec2 rotate2d(vec2 v, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    mat2 m = mat2(c, -s, s, c);
    return m * v;
}

void main() {
    vec2 mappedCoords = gl_FragCoord.xy / uPixelRatio - uResolution * 0.5;
    
    // Set up fluted/reeded effect
    // The fluted coordinates is basically a transformation of the mapped coordinates to simulate the horizontal refraction of fluted glass.
    float fluteWidth = 50.0;
    vec2 scaledUv = mappedCoords / vec2(fluteWidth);
    vec2 fractUv = vec2(fract(scaledUv.x), scaledUv.y);
    float flutedX = fractUv.x - 0.5;
    float fluteStrength = 70.;
    vec2 flutedCoords = vec2(mappedCoords.x + flutedX * fluteStrength, mappedCoords.y);
    // vec2 flutedUv = (flutedCoords + uResolution * 0.5) / uResolution;
    vec2 flutedUv = flutedCoords / 1000.;

    // Multi-color gradient scene — sampled via flutedUv for fluted glass effect
    vec2 uv = flutedUv;
    float t = uTime * 0.42;

    // Blob positions with slow organic animation
    vec2 p1 = vec2(-0.28 + sin(t * 0.7 + 0.5) * 0.15,  0.06 + cos(t * 0.5) * 0.12); // blue
    vec2 p2 = vec2(-0.06 + sin(t * 0.4 + 1.2) * 0.18,  0.16 + cos(t * 0.6) * 0.15); // magenta
    vec2 p3 = vec2( 0.07 + sin(t * 0.5 + 3.4) * 0.2,  0.00 + cos(t * 0.4) * 0.14); // red
    vec2 p4 = vec2( 0.22 + sin(t * 0.3 + 2.3) * 0.24, -0.10 + cos(t * 0.7) * 0.14); // orange
    vec2 p5 = vec2( 0.30 + sin(t * 0.6 + 1.1) * 0.18,  0.06 + cos(t * 0.4) * 0.13); // teal

    vec3 c1 = vec3(0.02, 0.20, 0.75); // blue
    vec3 c2 = vec3(0.80, 0.05, 0.55); // magenta
    vec3 c3 = vec3(0.95, 0.10, 0.15); // red
    vec3 c4 = vec3(0.97, 0.48, 0.08); // orange
    vec3 c5 = vec3(0.20, 0.65, 0.88); // teal/cyan

    vec2 warpedUv = uv + vec2(snoise(uv * vec2(uNoiseScaleX, uNoiseScaleY) + t * 0.5), snoise(uv * vec2(uNoiseScaleX, uNoiseScaleY) * 0.93 - t * 0.3)) * uWarpStrength;
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

    // Exponential tone mapping — compresses overbright, keeps rich colors
    color = 1.0 - exp(-color * 1.2);

    gl_FragColor = vec4(color, 1.0);
}