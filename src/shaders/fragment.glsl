uniform float uPixelRatio;
uniform float uTime;
uniform vec2 uResolution;
uniform float uWarpStrength;
uniform sampler2D uNoiseMap;
uniform sampler2D uGrainTexture;
uniform float uGrainStrength;
uniform float uFluteWidth;
uniform float uFluteStrength;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform vec3 uC4;
uniform vec3 uC5;
varying vec2 vUv;
varying vec2 vUvA;

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

    // Multi-color gradient scene — sampled via flutedUv for fluted glass effect
    vec2 uv = flutedUv;
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

    // Exponential tone mapping — compresses overbright, keeps rich colors
    color = 1.0 - exp(-color * 1.2);

    // Film grain effect
    float grain = texture2D(uGrainTexture, vUvA).r * 2.0 - 1.0; // Convert from [0, 1] to [-1, 1]
    color += grain * uGrainStrength * max(color.r, max(color.g, color.b)); // Modulate grain strength by the brightness of the pixel
    color = clamp(color, 0.0, 1.0);

    gl_FragColor = vec4(color, 1.0);
}