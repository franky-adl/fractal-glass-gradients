import { useRef, useEffect } from "react";
import { addPropertyControls, ControlType } from "framer";
import {
    WebGLRenderer,
    WebGLRenderTarget,
    Scene,
    PerspectiveCamera,
    OrthographicCamera,
    Vector2,
    Vector3,
    Clock,
    PlaneGeometry,
    ShaderMaterial,
    Mesh,
    TextureLoader,
    Color,
    RGBAFormat,
    LinearFilter,
    RepeatWrapping,
    MirroredRepeatWrapping,
} from "https://cdn.jsdelivr.net/npm/three@0.182.0/+esm";

// Type definitions
type RGB = [number, number, number];
type PaletteName = "Neon Flux" | "Sunset" | "Aurora";
type Palette = Record<PaletteName, RGB[]>;
type AlgoType = "Algo1" | "Algo2";
type PresetName = "Balanced" | "Flow-like";
type PresetMode = "Balanced" | "Flow-like" | "Custom";

interface PresetConfig {
    noiseScaleX: number;
    noiseScaleY: number;
    warpStrength: number;
    algo: AlgoType;
}

type Presets = Record<PresetName, PresetConfig>;

interface FractalGlassGradientsProps {
    patternPreset: PresetMode;
    palette: PaletteName;
    noiseScaleX: number;
    noiseScaleY: number;
    warpStrength: number;
    grainStrength: number;
    fluteWidth: number;
    fluteStrength: number;
    patternBrightness: number;
    warpSpeed: number;
    algo: AlgoType;
}

// Constants
const PALETTES: Palette = {
    "Neon Flux": [
        [0.02, 0.2, 0.75], // blue
        [0.8, 0.05, 0.55], // magenta
        [0.95, 0.1, 0.15], // red
        [0.97, 0.48, 0.08], // orange
        [0.2, 0.65, 0.88], // teal/cyan
    ],
    Sunset: [
        [0.95, 0.25, 0.05], // deep orange
        [0.85, 0.08, 0.35], // crimson
        [1.0, 0.6, 0.0], // amber
        [0.55, 0.05, 0.5], // purple
        [1.0, 0.85, 0.2], // gold
    ],
    Aurora: [
        [0.0, 0.75, 0.45], // emerald green
        [0.05, 0.45, 0.95], // bright blue
        [0.55, 0.05, 0.85], // violet
        [0.0, 0.9, 0.7], // cyan-green
        [0.3, 0.0, 0.65], // deep purple
    ],
};

const PRESETS: Presets = {
    Balanced: {
        noiseScaleX: 1.4,
        noiseScaleY: 1.0,
        warpStrength: 0.3,
        algo: "Algo1",
    },
    "Flow-like": {
        noiseScaleX: 0.35,
        noiseScaleY: 0.55,
        warpStrength: 0.4,
        algo: "Algo2",
    },
};

const snoise2dShader = `
vec3 mod289(vec3 x) {
return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
return mod289(((x*34.0)+10.0)*x);
}

float snoise(vec2 v)
{
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                        -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0
    // First corner
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);

    // Other corners
    vec2 i1;
    //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
    //i1.y = 1.0 - i1.x;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    // x0 = x0 - 0.0 + 0.0 * C.xx ;
    // x1 = x0 - i1 + 1.0 * C.xx ;
    // x2 = x0 - 1.0 + 2.0 * C.xx ;
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

    // Permutations
    i = mod289(i); // Avoid truncation effects in permutation
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
            + i.x + vec3(0.0, i1.x, 1.0 ));

    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;

    // Gradients: 41 points uniformly over a line, mapped onto a diamond.
    // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    // Normalise gradients implicitly by scaling m
    // Approximation of: m *= inversesqrt( a0*a0 + h*h );
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

    // Compute final noise value at P
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}
`;

const vertexShader = `
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
`;

const fragmentShader = `
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
`;

const noiseFragmentShader = `
uniform float uTime;
uniform float uNoiseScaleX;
uniform float uNoiseScaleY;
uniform float uWarpSpeed;
varying vec2 vUvA;

${snoise2dShader}

void main() {
    float t = uTime * uWarpSpeed;
    // Two independent samples for x and y warp directions
    float nx = snoise(vUvA * vec2(uNoiseScaleX, uNoiseScaleY) + t * 0.5);
    float ny = snoise(vUvA * vec2(uNoiseScaleX, uNoiseScaleY) * 0.93 - t * 0.3);
    // Pack [-1, 1] → [0, 1] for texture storage
    gl_FragColor = vec4(nx * 0.5 + 0.5, ny * 0.5 + 0.5, 0., 1.0);
}
`;

/**
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 600
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function FractalGlassGradients(
    props: FractalGlassGradientsProps,
): JSX.Element {
    const {
        patternPreset,
        palette,
        noiseScaleX,
        noiseScaleY,
        warpStrength,
        grainStrength,
        fluteWidth,
        fluteStrength,
        patternBrightness,
        warpSpeed,
        algo,
    } = props;
    const grainTextureUrl =
        "https://cdn.jsdelivr.net/gh/franky-adl/fractal-glass-gradients@master/public/film_grain_contrasted.jpg";

    const preset = patternPreset !== "Custom" ? PRESETS[patternPreset] : null;
    const effectiveNoiseScaleX = preset ? preset.noiseScaleX : noiseScaleX;
    const effectiveNoiseScaleY = preset ? preset.noiseScaleY : noiseScaleY;
    const effectiveWarpStrength = preset ? preset.warpStrength : warpStrength;
    const effectiveAlgo = preset ? preset.algo : algo;

    const containerRef = useRef<HTMLDivElement>(null);

    const noiseSceneRef = useRef<Scene | null>(null);
    const noiseCameraRef = useRef<OrthographicCamera | null>(null);
    const noiseFBORef = useRef<WebGLRenderTarget | null>(null);
    const noiseUniformsRef = useRef<Record<string, { value: unknown }>>({
        uTime: { value: 0 },
        uNoiseScaleX: { value: effectiveNoiseScaleX },
        uNoiseScaleY: { value: effectiveNoiseScaleY },
        uWarpSpeed: { value: warpSpeed },
    });

    const uniformsRef = useRef<
        Record<string, { value: unknown | Vector2 | Vector3 }>
    >({
        uResolution: {
            value: new Vector2(window.innerWidth, window.innerHeight),
        },
        uPixelRatio: { value: window.devicePixelRatio },
        uTime: { value: 0 },
        uWarpStrength: { value: effectiveWarpStrength },
        uNoiseMap: { value: noiseFBORef.current?.texture },
        uGrainTexture: { value: null },
        uGrainTextureSize: { value: new Vector2(1920, 1260) },
        uGrainStrength: { value: grainStrength },
        uFluteWidth: { value: fluteWidth },
        uFluteStrength: { value: fluteStrength },
        uToneMapExposure: { value: patternBrightness },
        uC1: { value: new Vector3(...PALETTES["Neon Flux"][0]) },
        uC2: { value: new Vector3(...PALETTES["Neon Flux"][1]) },
        uC3: { value: new Vector3(...PALETTES["Neon Flux"][2]) },
        uC4: { value: new Vector3(...PALETTES["Neon Flux"][3]) },
        uC5: { value: new Vector3(...PALETTES["Neon Flux"][4]) },
        uAlgo: { value: 0 },
    });

    function setupNoiseScene() {
        if (!noiseSceneRef.current) {
            const rt = new WebGLRenderTarget(256, 256, {
                format: RGBAFormat,
                magFilter: LinearFilter,
                minFilter: LinearFilter,
            });
            rt.texture.wrapS = MirroredRepeatWrapping;
            rt.texture.wrapT = MirroredRepeatWrapping;
            noiseFBORef.current = rt;

            const scene = new Scene();
            scene.add(
                new Mesh(
                    new PlaneGeometry(2, 2),
                    new ShaderMaterial({
                        vertexShader,
                        fragmentShader: noiseFragmentShader,
                        uniforms: noiseUniformsRef.current,
                    }),
                ),
            );
            noiseSceneRef.current = scene;
            noiseCameraRef.current = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
        }
    }

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Lower res buffer for noise map rendering
        setupNoiseScene();

        const width = container.clientWidth;
        const height = container.clientHeight;

        const renderer = new WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        container.appendChild(renderer.domElement);

        const scene = new Scene();

        const camera = new PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 0, 3);

        const textureLoader = new TextureLoader();
        const grainTexture = textureLoader.load(grainTextureUrl, (texture) => {
            uniformsRef.current.uGrainTexture.value = texture;
            texture.needsUpdate = true;
        });
        grainTexture.wrapS = RepeatWrapping;
        grainTexture.wrapT = RepeatWrapping;

        const geometry = new PlaneGeometry(2, 2, 1, 1);
        const material = new ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: uniformsRef.current,
        });
        const fullScreenQuad = new Mesh(geometry, material);
        scene.add(fullScreenQuad);

        let rafId: number;
        const clock = new Clock();

        function animate(now: number) {
            rafId = requestAnimationFrame(animate);
            const delta = clock.getDelta();

            noiseUniformsRef.current.uTime.value += delta;
            uniformsRef.current.uTime.value += delta;

            renderer.setRenderTarget(noiseFBORef.current);
            renderer.render(noiseSceneRef.current, noiseCameraRef.current);
            renderer.setRenderTarget(null);

            uniformsRef.current.uNoiseMap.value = noiseFBORef.current.texture;

            renderer.render(scene, camera);
        }
        rafId = requestAnimationFrame(animate);

        const resizeObserver = new ResizeObserver(() => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            renderer.setPixelRatio(window.devicePixelRatio);
            if (uniformsRef.current) {
                uniformsRef.current.uPixelRatio.value = window.devicePixelRatio;
                uniformsRef.current.uResolution.value.set(w, h);
            }
        });
        resizeObserver.observe(container);

        return () => {
            cancelAnimationFrame(rafId);
            resizeObserver.disconnect();
            renderer.dispose();
            geometry.dispose();
            material.dispose();
            grainTexture.dispose();
            container.removeChild(renderer.domElement);
        };
    }, []);

    useEffect(() => {
        if (noiseUniformsRef.current) {
            noiseUniformsRef.current.uNoiseScaleX.value = effectiveNoiseScaleX;
            noiseUniformsRef.current.uNoiseScaleY.value = effectiveNoiseScaleY;
            noiseUniformsRef.current.uWarpSpeed.value = warpSpeed;
        }
        if (uniformsRef.current) {
            uniformsRef.current.uWarpStrength.value = effectiveWarpStrength;
            uniformsRef.current.uGrainStrength.value = grainStrength;
            uniformsRef.current.uFluteWidth.value = fluteWidth;
            uniformsRef.current.uFluteStrength.value = fluteStrength;
            uniformsRef.current.uToneMapExposure.value = patternBrightness;
            const pal = PALETTES[palette];
            (uniformsRef.current.uC1.value as Vector3).set(...pal[0]);
            (uniformsRef.current.uC2.value as Vector3).set(...pal[1]);
            (uniformsRef.current.uC3.value as Vector3).set(...pal[2]);
            (uniformsRef.current.uC4.value as Vector3).set(...pal[3]);
            (uniformsRef.current.uC5.value as Vector3).set(...pal[4]);

            uniformsRef.current.uAlgo.value = effectiveAlgo === "Algo1" ? 0 : 1;
        }
    }, [
        effectiveNoiseScaleX,
        effectiveNoiseScaleY,
        warpSpeed,
        effectiveWarpStrength,
        grainStrength,
        fluteWidth,
        fluteStrength,
        patternBrightness,
        palette,
        effectiveAlgo,
    ]);

    return (
        <div
            ref={containerRef}
            style={{ width: "100%", height: "100%", background: "#111" }}
        />
    );
}

FractalGlassGradients.defaultProps = {
    patternPreset: "Balanced",
    palette: "Neon Flux",
    noiseScaleX: 1.4,
    noiseScaleY: 1.0,
    warpStrength: 0.3,
    grainStrength: 0.5,
    fluteWidth: 70.0,
    fluteStrength: 140.0,
    patternBrightness: 0.9,
    warpSpeed: 0.12,
    algo: "Algo1",
} as Partial<FractalGlassGradientsProps>;

addPropertyControls(FractalGlassGradients as any, {
    patternPreset: {
        type: ControlType.Enum,
        title: "Pattern",
        options: ["Balanced", "Flow-like", "Custom"],
        defaultValue: "Balanced",
    },
    palette: {
        type: ControlType.Enum,
        title: "Palette",
        options: ["Neon Flux", "Sunset", "Aurora"],
        defaultValue: "Neon Flux",
    },
    // Preset-controlled group — hidden unless "Custom" is selected
    algo: {
        type: ControlType.Enum,
        title: "Algo",
        options: ["Algo1", "Algo2"],
        defaultValue: "Algo1",
        hidden(props: Partial<FractalGlassGradientsProps>) {
            return props.patternPreset !== "Custom";
        },
    },
    noiseScaleX: {
        type: ControlType.Number,
        title: "Warp X-Scale",
        min: 0.1,
        max: 5.0,
        step: 0.05,
        defaultValue: 1.4,
        hidden(props: Partial<FractalGlassGradientsProps>) {
            return props.patternPreset !== "Custom";
        },
    },
    noiseScaleY: {
        type: ControlType.Number,
        title: "Warp Y-Scale",
        min: 0.1,
        max: 5.0,
        step: 0.05,
        defaultValue: 1.0,
        hidden(props: Partial<FractalGlassGradientsProps>) {
            return props.patternPreset !== "Custom";
        },
    },
    warpStrength: {
        type: ControlType.Number,
        title: "Warp Strength",
        min: 0.0,
        max: 2.0,
        step: 0.01,
        defaultValue: 0.3,
        hidden(props: Partial<FractalGlassGradientsProps>) {
            return props.patternPreset !== "Custom";
        },
    },
    // Independent controls always visible
    warpSpeed: {
        type: ControlType.Number,
        title: "Warp Speed",
        min: 0.0,
        max: 2.0,
        step: 0.01,
        defaultValue: 0.12,
    },
    grainStrength: {
        type: ControlType.Number,
        title: "Film Grain",
        min: 0.0,
        max: 1.0,
        step: 0.005,
        defaultValue: 0.5,
    },
    fluteWidth: {
        type: ControlType.Number,
        title: "Flute Width",
        min: 5.0,
        max: 200.0,
        step: 1.0,
        defaultValue: 70.0,
    },
    fluteStrength: {
        type: ControlType.Number,
        title: "Flute Refraction",
        min: 0.0,
        max: 200.0,
        step: 1.0,
        defaultValue: 140.0,
    },
    patternBrightness: {
        type: ControlType.Number,
        title: "Brightness",
        min: 0.01,
        max: 2.0,
        step: 0.01,
        defaultValue: 0.9,
    },
});
