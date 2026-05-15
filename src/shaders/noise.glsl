uniform float uTime;
uniform float uNoiseScaleX;
uniform float uNoiseScaleY;
varying vec2 vUv;

#include ./snoise2d.glsl

void main() {
    float t = uTime * 0.42;
    // Two independent samples for x and y warp directions
    float nx = snoise(vUv * vec2(uNoiseScaleX, uNoiseScaleY) + t * 0.5);
    float ny = snoise(vUv * vec2(uNoiseScaleX, uNoiseScaleY) * 0.93 - t * 0.3);
    // Pack [-1, 1] → [0, 1] for texture storage
    gl_FragColor = vec4(nx * 0.5 + 0.5, ny * 0.5 + 0.5, 0.0, 1.0);
}
