import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { Perf } from "r3f-perf";
import { useControls } from "leva";
import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";
import noiseFragmentShader from "./shaders/noise.glsl";

const PALETTES = {
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

export default function Experience() {
    const size = useThree((state) => state.size);
    const quadRef = useRef();
    const {
        palette,
        noiseScaleX,
        noiseScaleY,
        warpStrength,
        grainStrength,
        fluteWidth,
        fluteStrength,
    } = useControls({
        palette: {
            value: "Neon Flux",
            options: ["Neon Flux", "Sunset", "Aurora"],
            label: "Color Palette",
        },
        noiseScaleX: {
            value: 1.4,
            min: 0.1,
            max: 5.0,
            step: 0.05,
            label: "Noise Scale X",
        },
        noiseScaleY: {
            value: 1,
            min: 0.1,
            max: 5.0,
            step: 0.05,
            label: "Noise Scale Y",
        },
        warpStrength: {
            value: 0.3,
            min: 0.0,
            max: 2.0,
            step: 0.01,
            label: "Warp Strength",
        },
        grainStrength: {
            value: 0.5,
            min: 0.0,
            max: 1.0,
            step: 0.005,
            label: "Grain Strength",
        },
        fluteWidth: {
            value: 70.0,
            min: 5.0,
            max: 200.0,
            step: 1.0,
            label: "Flute Width",
        },
        fluteStrength: {
            value: 140.0,
            min: 0.0,
            max: 200.0,
            step: 1.0,
            label: "Flute Strength",
        },
    });

    useEffect(() => {
        uniformsRef.current.uPixelRatio.value = window.devicePixelRatio;
    }, [size]);

    const noiseSceneRef = useRef(null);
    const noiseCameraRef = useRef(null);
    const noiseFBORef = useRef(null);
    const noiseUniformsRef = useRef({
        uTime: { value: 0 },
        uNoiseScaleX: { value: 1.4 },
        uNoiseScaleY: { value: 1 },
    });

    if (!noiseSceneRef.current) {
        const rt = new THREE.WebGLRenderTarget(256, 256, {
            format: THREE.RGBAFormat,
            magFilter: THREE.LinearFilter,
            minFilter: THREE.LinearFilter,
        });
        rt.texture.wrapS = THREE.MirroredRepeatWrapping;
        rt.texture.wrapT = THREE.MirroredRepeatWrapping;
        noiseFBORef.current = rt;

        const scene = new THREE.Scene();
        scene.add(
            new THREE.Mesh(
                new THREE.PlaneGeometry(2, 2),
                new THREE.ShaderMaterial({
                    vertexShader,
                    fragmentShader: noiseFragmentShader,
                    uniforms: noiseUniformsRef.current,
                }),
            ),
        );
        noiseSceneRef.current = scene;
        noiseCameraRef.current = new THREE.OrthographicCamera(
            -1,
            1,
            1,
            -1,
            0,
            1,
        );
    }

    const grainTexture = useLoader(
        THREE.TextureLoader,
        "./film_grain_contrasted.jpg",
    );

    useEffect(() => {
        grainTexture.wrapS = THREE.RepeatWrapping;
        grainTexture.wrapT = THREE.RepeatWrapping;
        grainTexture.needsUpdate = true;
    }, [grainTexture]);

    const uniformsRef = useRef({
        uResolution: {
            value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
        uPixelRatio: {
            value: window.devicePixelRatio,
        },
        uTime: {
            value: 0,
        },
        uWarpStrength: { value: 0.3 },
        uNoiseMap: { value: noiseFBORef.current.texture },
        uGrainTexture: { value: grainTexture },
        uGrainTextureSize: {
            value: new THREE.Vector2(1920, 1260),
        },
        uGrainStrength: { value: 0.05 },
        uFluteWidth: { value: 50.0 },
        uFluteStrength: { value: 70.0 },
        uC1: { value: new THREE.Vector3(...PALETTES["Neon Flux"][0]) },
        uC2: { value: new THREE.Vector3(...PALETTES["Neon Flux"][1]) },
        uC3: { value: new THREE.Vector3(...PALETTES["Neon Flux"][2]) },
        uC4: { value: new THREE.Vector3(...PALETTES["Neon Flux"][3]) },
        uC5: { value: new THREE.Vector3(...PALETTES["Neon Flux"][4]) },
    });

    useFrame((state, delta) => {
        noiseUniformsRef.current.uTime.value += delta;
        noiseUniformsRef.current.uNoiseScaleX.value = noiseScaleX;
        noiseUniformsRef.current.uNoiseScaleY.value = noiseScaleY;
        const { gl } = state;
        gl.setRenderTarget(noiseFBORef.current);
        gl.render(noiseSceneRef.current, noiseCameraRef.current);
        gl.setRenderTarget(null);

        uniformsRef.current.uResolution.value.set(
            state.size.width,
            state.size.height,
        );
        uniformsRef.current.uTime.value += delta;
        uniformsRef.current.uWarpStrength.value = warpStrength;
        if (grainTexture.image) {
            uniformsRef.current.uGrainTextureSize.value.set(
                grainTexture.image.width,
                grainTexture.image.height,
            );
        }
        uniformsRef.current.uGrainStrength.value = grainStrength;
        uniformsRef.current.uFluteWidth.value = fluteWidth;
        uniformsRef.current.uFluteStrength.value = fluteStrength;
        const pal = PALETTES[palette];
        uniformsRef.current.uC1.value.set(...pal[0]);
        uniformsRef.current.uC2.value.set(...pal[1]);
        uniformsRef.current.uC3.value.set(...pal[2]);
        uniformsRef.current.uC4.value.set(...pal[3]);
        uniformsRef.current.uC5.value.set(...pal[4]);
    });

    return (
        <>
            <OrbitControls makeDefault />
            <Perf position="top-left" />
            <mesh ref={quadRef}>
                <planeGeometry args={[2, 2, 1, 1]} />
                <shaderMaterial
                    vertexShader={vertexShader}
                    fragmentShader={fragmentShader}
                    uniforms={uniformsRef.current}
                />
            </mesh>
        </>
    );
}
