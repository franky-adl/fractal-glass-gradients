varying vec2 vUv;
varying vec3 vPos;

void main() {
    vUv = uv;
    vPos = position;
    gl_Position = vec4(position, 1.0);
}