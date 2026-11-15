"use client";
import {
  AdaptiveDpr,
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  SoftShadows,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  N8AO,
  SMAA,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";

import { CabinModel } from "./CabinModel";
import type { CabinOptions } from "./config";
import { countTriangles } from "./geometry";
import { Landscape } from "./Landscape";

export type CabinStats = { triangles: number };

type Props = {
  options: CabinOptions;
  /** Lower-cost path: no SSAO/PCSS, smaller shadow maps, lower DPR. */
  mobile: boolean;
  reduced: boolean;
  /** Increment to reset the camera to the default view. */
  resetKey: number;
  view?: CameraView;
  onReady?: (stats: CabinStats) => void;
};

const palette = {
  // Fog colour matches the sky horizon so the ground melts into it.
  day: { sky: "#e8c9a4", fogNear: 26, fogFar: 85 },
  night: { sky: "#141c33", fogNear: 20, fogFar: 72 },
};

export type CameraView = "hero" | "side" | "aerial" | "front";

// Named framings. "hero" is the three-quarter front view at roughly eye
// level, as in architectural photography; the others feed gallery renders.
const views: Record<
  CameraView,
  { target: THREE.Vector3; wide: THREE.Vector3; portrait: THREE.Vector3 }
> = {
  hero: {
    target: new THREE.Vector3(0, 2.75, 1.4),
    wide: new THREE.Vector3(7.4, 3.1, 17.2),
    portrait: new THREE.Vector3(8.6, 3.4, 20.2),
  },
  // Mirror of "hero" from the sunlit west side: slope and glass gable.
  side: {
    target: new THREE.Vector3(0, 2.7, 1.2),
    wide: new THREE.Vector3(-10.2, 3.0, 15.4),
    portrait: new THREE.Vector3(-12, 3.4, 18.4),
  },
  aerial: {
    target: new THREE.Vector3(0, 1.6, 1.8),
    wide: new THREE.Vector3(11.5, 11, 15.5),
    portrait: new THREE.Vector3(13.5, 13, 18),
  },
  // Straight-on front, pulled back and raised so the ridge and chimney keep
  // a margin of air above them (the old framing cropped both).
  front: {
    target: new THREE.Vector3(0, 3.1, 2),
    wide: new THREE.Vector3(0.9, 3.3, 25),
    portrait: new THREE.Vector3(1, 3.6, 34),
  },
};
const viewDesktop = views.hero.wide;

/** Fits the default framing to the viewport aspect and handles reset. */
function CameraRig({ resetKey, view }: { resetKey: number; view: CameraView }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3;
    update: () => void;
  } | null;
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const portrait = size.width / size.height < 0.9;
    const framing = views[view];
    const target = framing.target;
    camera.position.copy(portrait ? framing.portrait : framing.wide);
    camera.fov = portrait ? 38 : 32;
    camera.updateProjectionMatrix();
    camera.lookAt(target);
    if (controls) {
      controls.target.copy(target);
      controls.update();
    }
    invalidate();
  }, [camera, size.width, size.height, controls, resetKey, view, invalidate]);
  return null;
}

/** Reports readiness after a few settled frames and measures geometry. */
function Ready({ onReady }: { onReady?: (stats: CabinStats) => void }) {
  const frames = useRef(0);
  const done = useRef(false);
  const scene = useThree((s) => s.scene);
  useFrame((state) => {
    if (done.current) return;
    frames.current += 1;
    if (frames.current < 4) {
      state.invalidate();
      return;
    }
    done.current = true;
    const stats = { triangles: countTriangles(scene) };
    (window as Window & { __auroraCabin?: CabinStats }).__auroraCabin = stats;
    onReady?.(stats);
  });
  return null;
}

function Lighting({ night, mobile }: { night: boolean; mobile: boolean }) {
  const shadowSize = mobile ? 1024 : 2048;
  return (
    <>
      <hemisphereLight
        args={night ? ["#2a3a66", "#0d120c", 0.1] : ["#c9d3e0", "#4a4a34", 0.1]}
      />
      {night ? (
        <directionalLight
          color="#9fb4e6"
          intensity={0.55}
          position={[9, 13, -5]}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.03}
        >
          <orthographicCamera
            attach="shadow-camera"
            args={[-14, 14, 14, -14, 1, 50]}
          />
        </directionalLight>
      ) : (
        // Golden hour: sun ~17° above the horizon from the west-southwest, warm
        // and strong against a cool, dim fill. Shadows run long across the
        // meadow to the right of the cabin, where the camera sees them.
        <directionalLight
          color="#ffb46a"
          intensity={5.2}
          position={[-14.5, 4.6, 5.2]}
          castShadow
          shadow-mapSize={[shadowSize, shadowSize]}
          shadow-bias={-0.0003}
          shadow-normalBias={0.025}
        >
          <orthographicCamera
            attach="shadow-camera"
            args={[-19, 19, 19, -19, 1, 60]}
          />
        </directionalLight>
      )}
      {/* Image-based light built from emissive cards: no HDR downloads. */}
      <Environment
        key={night ? "env-night" : "env-day"}
        resolution={256}
        frames={1}
        environmentIntensity={night ? 0.26 : 0.34}
      >
        <color attach="background" args={[night ? "#070b18" : "#c9d4dc"]} />
        {night ? (
          <>
            <Lightformer
              form="rect"
              intensity={0.5}
              color="#7d93c9"
              position={[0, 14, 0]}
              rotation-x={Math.PI / 2}
              scale={[40, 40, 1]}
            />
            <Lightformer
              form="circle"
              intensity={2}
              color="#cfdcff"
              position={[9, 10, -8]}
              scale={2}
            />
            <Lightformer
              form="rect"
              intensity={1.2}
              color="#ffb877"
              position={[0, 2, 9]}
              scale={[6, 3, 1]}
            />
          </>
        ) : (
          <>
            <Lightformer
              form="rect"
              intensity={1.1}
              color="#e6eef5"
              position={[0, 14, 0]}
              rotation-x={Math.PI / 2}
              scale={[40, 40, 1]}
            />
            <Lightformer
              form="rect"
              intensity={3.2}
              color="#ffd6a6"
              position={[-12, 5, 9]}
              scale={[12, 5, 1]}
              target={[0, 0, 0]}
            />
            <Lightformer
              form="rect"
              intensity={0.8}
              color="#b9cde0"
              position={[12, 4, -8]}
              scale={[14, 6, 1]}
              target={[0, 0, 0]}
            />
            <Lightformer
              form="rect"
              intensity={0.35}
              color="#5b6a3a"
              position={[0, -3, 0]}
              rotation-x={-Math.PI / 2}
              scale={[40, 40, 1]}
            />
          </>
        )}
      </Environment>
    </>
  );
}

function Scene({
  options,
  mobile,
  reduced,
  resetKey,
  view = "hero",
  onReady,
}: Props) {
  const night = options.time === "night";
  const sky = palette[options.time];
  const [active, setActive] = useState(!reduced);
  const idle = useRef<number | undefined>(undefined);
  const scheduleIdle = () => {
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => setActive(false), 6000);
  };
  useEffect(() => {
    if (!reduced) scheduleIdle();
    return () => window.clearTimeout(idle.current);
  }, [reduced]);

  return (
    <>
      <color attach="background" args={[sky.sky]} />
      <fog attach="fog" args={[sky.sky, sky.fogNear, sky.fogFar]} />
      {!mobile && <SoftShadows size={12} samples={14} focus={0.7} />}
      <Lighting night={night} mobile={mobile} />
      <CabinModel options={options} animate={active && !reduced} />
      <Landscape night={night} />
      <ContactShadows
        key={`${options.time}-${options.curtains}`}
        position={[0, 0.012, 0.6]}
        scale={24}
        resolution={1024}
        blur={2.6}
        far={3}
        opacity={night ? 0.35 : 0.55}
        color="#1d1a14"
        frames={1}
      />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={8}
        maxDistance={26}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 2 - 0.07}
        onStart={() => {
          window.clearTimeout(idle.current);
          if (!reduced) setActive(true);
        }}
        onEnd={scheduleIdle}
        regress
      />
      <CameraRig resetKey={resetKey} view={view} />
      {mobile ? (
        <EffectComposer multisampling={4} enableNormalPass={false}>
          <Bloom
            luminanceThreshold={1.4}
            luminanceSmoothing={0.15}
            intensity={night ? 0.85 : 0}
            mipmapBlur
          />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <SMAA />
          <Vignette offset={0.32} darkness={0.42} />
        </EffectComposer>
      ) : (
        <EffectComposer multisampling={4} enableNormalPass={false}>
          {/* SSAO (N8AO) on desktop only. */}
          <N8AO
            aoRadius={0.55}
            intensity={1.6}
            distanceFalloff={0.6}
            halfRes
            quality="medium"
          />
          {/* Only HDR emitters (lanterns, lamps) exceed the threshold. */}
          <Bloom
            luminanceThreshold={1.4}
            luminanceSmoothing={0.15}
            intensity={night ? 0.85 : 0}
            mipmapBlur
          />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <SMAA />
          <Vignette offset={0.32} darkness={0.42} />
        </EffectComposer>
      )}
      <AdaptiveDpr pixelated />
      <Ready onReady={onReady} />
    </>
  );
}

export default function CabinScene(props: Props) {
  return (
    <Canvas
      shadows={{ type: THREE.PCFSoftShadowMap }}
      frameloop="demand"
      dpr={props.mobile ? [1, 1.5] : [1, 1.75]}
      camera={{ position: viewDesktop.toArray(), fov: 32, near: 0.1, far: 140 }}
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        stencil: false,
      }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <Scene {...props} />
    </Canvas>
  );
}
