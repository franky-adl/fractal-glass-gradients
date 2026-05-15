import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { Perf } from "r3f-perf";
import { useControls } from "leva";
import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";

export default function Experience() {
    const quadRef = useRef();
    const { noiseScaleX, noiseScaleY, warpStrength } = useControls({
        noiseScaleX: {
            value: 0.75,
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
        uNoiseScaleX: { value: 0.75 },
        uNoiseScaleY: { value: 1.2 },
        uWarpStrength: { value: 0.3 },
    });

    useFrame((state, delta) => {
        uniformsRef.current.uResolution.value.set(
            state.size.width,
            state.size.height,
        );
        uniformsRef.current.uTime.value += delta;
        uniformsRef.current.uNoiseScaleX.value = noiseScaleX;
        uniformsRef.current.uNoiseScaleY.value = noiseScaleY;
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
