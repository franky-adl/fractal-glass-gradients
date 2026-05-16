uniform vec2 uResolution;
uniform vec2 uGrainTextureSize;
uniform float uPixelRatio;

varying vec2 vUv;
varying vec2 vUvA;
varying vec3 vPos;

void main() {
    vUv = uv;
    vPos = position;
    float aspect = uResolution.x / uResolution.y;
    if (aspect < 1. || aspect > 2.3) {
        // adjust uv for mobile/ultrawide so that noise/film patterns look less squeezed/stretched
        vUvA = uResolution * uPixelRatio / uGrainTextureSize * uv;
    } else {
        vUvA = uv;
    }
    gl_Position = vec4(position, 1.0);
}