import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { Perf } from "r3f-perf";
import { useControls } from "leva";
import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";
import noiseFragmentShader from "./shaders/noise.glsl";

export default function Experience() {
    const quadRef = useRef();
    const { noiseScaleX, noiseScaleY, warpStrength } = useControls({
        noiseScaleX: {
            value: 1.4,
            min: 0.1,
            max: 5.0,
            step: 0.05,
            label: "Noise Scale X",
        },
        noiseScaleY: {
            value: 1.2,
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
    });

    const noiseSceneRef = useRef(null);
    const noiseCameraRef = useRef(null);
    const noiseFBORef = useRef(null);
    const noiseUniformsRef = useRef({
        uTime: { value: 0 },
        uNoiseScaleX: { value: 1.4 },
        uNoiseScaleY: { value: 1.2 },
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
