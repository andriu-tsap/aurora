"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, AdaptiveDpr } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import land from "./land.json";
const destinations = [
  [48.9, 24.5],
  [49.2, 20.1],
  [43.5, 16.4],
];
const origins = [
  [38.72, -9.14],
  [64.15, -21.94],
  [30.04, 31.24],
];
const point = (lat: number, lon: number, r = 2) =>
  new THREE.Vector3(
    r * Math.cos((lat * Math.PI) / 180) * Math.sin((lon * Math.PI) / 180),
    r * Math.sin((lat * Math.PI) / 180),
    r * Math.cos((lat * Math.PI) / 180) * Math.cos((lon * Math.PI) / 180),
  );
type Props = {
  active: number;
  onSelect: (index: number) => void;
  onReady: () => void;
  reduced: boolean;
  paused: boolean;
  mobile: boolean;
};
function World({ active, onSelect, onReady, reduced, paused, mobile }: Props) {
  const group = useRef<THREE.Group>(null);
  const particles = useRef<THREE.Group>(null);
  const positions = useMemo(
    () =>
      new Float32Array(
        land
          .filter((_, i) => !mobile || i % 2 === 0)
          .flatMap(([lon, lat]) => point(lat, lon, 2.008).toArray()),
      ),
    [mobile],
  );
  const routes = useMemo(
    () =>
      destinations.map(([lat, lon], i) => {
        const start = point(...(origins[i] as [number, number]), 2.025);
        const end = point(lat, lon, 2.025);
        return new THREE.QuadraticBezierCurve3(
          start,
          start.clone().add(end).normalize().multiplyScalar(2.65),
          end,
        );
      }),
    [],
  );
  useEffect(onReady, [onReady]);
  useFrame((state, delta) => {
    if (!group.current || paused) return;
    const longitude = destinations[active][1];
    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      (-longitude * Math.PI) / 180 +
        (reduced
          ? 0
          : Math.sin(state.clock.elapsedTime * 0.09) * 0.07 +
            state.pointer.x * 0.04),
      2,
      delta,
    );
    group.current.rotation.x = THREE.MathUtils.damp(
      group.current.rotation.x,
      0.4 + (reduced ? 0 : state.pointer.y * 0.025),
      2,
      delta,
    );
    if (!reduced)
      particles.current?.children.forEach((child, i) =>
        child.position.copy(
          routes[i].getPoint((state.clock.elapsedTime * 0.12 + i / 3) % 1),
        ),
      );
  });
  return (
    <group ref={group} rotation={[0.4, -0.26, -0.04]}>
      <mesh>
        <sphereGeometry args={[2, 64, 48]} />
        <meshStandardMaterial
          color="#0a2634"
          roughness={0.88}
          metalness={0.15}
        />
      </mesh>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#86dac7"
          size={mobile ? 0.016 : 0.013}
          sizeAttenuation
        />
      </points>
      <mesh scale={1.012}>
        <sphereGeometry args={[2, 48, 32]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={
            "varying vec3 vNormal; varying vec3 vView; void main(){ vec4 p=modelViewMatrix*vec4(position,1.); vNormal=normalize(normalMatrix*normal); vView=normalize(-p.xyz); gl_Position=projectionMatrix*p; }"
          }
          fragmentShader={
            "varying vec3 vNormal; varying vec3 vView; void main(){float rim=pow(1.-max(dot(normalize(vNormal),normalize(vView)),0.),4.); gl_FragColor=vec4(.12,.9,.73,rim*.6); }"
          }
        />
      </mesh>
      {routes.map((route, i) => (
        <Line
          key={i}
          points={route.getPoints(70)}
          color={i === active ? "#abffe8" : "#3e9e90"}
          lineWidth={i === active ? 1.6 : 0.8}
          transparent
          opacity={i === active ? 0.95 : 0.55}
        />
      ))}
      <group ref={particles}>
        {routes.map((route, i) => (
          <mesh key={i} position={route.getPoint(i / 3)}>
            <sphereGeometry args={[0.017, 8, 8]} />
            <meshBasicMaterial color="#e0fff6" />
          </mesh>
        ))}
      </group>
      {destinations.map(([lat, lon], i) => (
        <group key={i} position={point(lat, lon, 2.035)}>
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              onSelect(i);
            }}
            onPointerOver={() => {
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "";
            }}
          >
            <sphereGeometry args={[0.075, 12, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[i === active ? 0.025 : 0.016, 12, 8]} />
            <meshBasicMaterial color={i === active ? "#f4fff7" : "#61d7be"} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
export default function Globe(props: Props) {
  return (
    <div className="globe-canvas">
      <Canvas
        frameloop={props.paused || props.reduced ? "demand" : "always"}
        camera={{ position: [0, 0, 6.5], fov: 44 }}
        dpr={props.mobile ? [1, 1.25] : [1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[-3, 4, 5]}
          intensity={2.4}
          color="#c1f8ec"
        />
        <directionalLight
          position={[3, -2, -3]}
          intensity={0.7}
          color="#8274cf"
        />
        <World {...props} />
        <AdaptiveDpr pixelated />
      </Canvas>
    </div>
  );
}
