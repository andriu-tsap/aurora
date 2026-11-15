"use client";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { createGroundTexture, seeded } from "./textures";

/**
 * Low-poly spruce: a slim trunk and eight drooping branch tiers whose skirts
 * alternate long and short radii, so the silhouette reads as branches rather
 * than smooth cones. Flat-shaded, muted needle colour.
 */
function firGeometry() {
  const rand = seeded(5);
  const parts: THREE.BufferGeometry[] = [];
  const trunk = new THREE.CylinderGeometry(0.09, 0.2, 2.2, 7, 1);
  trunk.translate(0, 1.1, 0);
  parts.push(trunk.toNonIndexed());
  trunk.dispose();
  const tiers = 8;
  const segments = 14;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const radius = 1.55 * (1 - t) ** 0.9 + 0.22;
    const height = 1.9 - t * 0.7;
    const cone = new THREE.ConeGeometry(radius, height, segments, 1, true);
    const pos = cone.getAttribute("position");
    for (let v = 0; v < pos.count; v++) {
      const y = pos.getY(v);
      if (y < 0) {
        const x = pos.getX(v);
        const z = pos.getZ(v);
        const angle = Math.atan2(z, x);
        const index = Math.round((angle / (Math.PI * 2)) * segments);
        const branch = index % 2 === 0 ? 1 : 0.62;
        const k = branch * (0.86 + rand() * 0.28);
        // Branch tips droop a little below the tier line.
        pos.setXYZ(
          v,
          x * k,
          y - (branch === 1 ? 0.18 + rand() * 0.12 : 0),
          z * k,
        );
      }
    }
    cone.rotateY(rand() * Math.PI);
    cone.translate(0, 1.9 + i * 0.98 + height / 2, 0);
    parts.push(cone.toNonIndexed());
    cone.dispose();
  }
  const needles = new THREE.Color("#1e3127");
  const bark = new THREE.Color("#3d2c20");
  parts.forEach((g, i) => {
    const count = g.getAttribute("position").count;
    const colors = new Float32Array(count * 3);
    const base = i === 0 ? bark : needles;
    // Lower tiers slightly darker (self-shadowing), tips a touch lighter.
    const shade = i === 0 ? 1 : 0.78 + (i / tiers) * 0.32;
    for (let v = 0; v < count; v++) {
      const jitter = 0.94 + rand() * 0.12;
      colors[v * 3] = base.r * shade * jitter;
      colors[v * 3 + 1] = base.g * shade * jitter;
      colors[v * 3 + 2] = base.b * shade * jitter;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.deleteAttribute("uv");
  });
  const merged = mergeGeometries(parts, false);
  if (!merged) throw new Error("Tree merge failed");
  merged.computeVertexNormals();
  return merged;
}

function rockGeometry(seed: number) {
  const rand = seeded(seed);
  const g = new THREE.IcosahedronGeometry(1, 1);
  const pos = g.getAttribute("position");
  for (let v = 0; v < pos.count; v++) {
    const k = 0.78 + rand() * 0.38;
    pos.setXYZ(v, pos.getX(v) * k, pos.getY(v) * k * 0.62, pos.getZ(v) * k);
  }
  const flat = g.toNonIndexed();
  g.dispose();
  flat.computeVertexNormals();
  return flat;
}

// Spruces frame the cabin from behind and the sides (≈ 9–13 m tall).
const trees: [number, number, number, number][] = [
  // x, z, height scale, yaw
  [-7.6, -5.2, 1.18, 0.4],
  [-10.8, -1.2, 0.98, 1.2],
  [-5.2, -10.2, 1.32, 2.2],
  [8.2, -4.4, 1.08, 0.9],
  [11.4, 0.4, 0.9, 2.7],
  [3.8, -11.6, 1.26, 1.7],
  [-14.5, -8.5, 1.12, 0.2],
  [15.2, -9.2, 1.22, 2.9],
];

/** Meadow tufts: six thin blades each, scattered around (not under) the cabin. */
function tuftGeometry() {
  const rand = seeded(23);
  const positions: number[] = [];
  const colors: number[] = [];
  const palette = ["#4b5132", "#545936", "#44492e", "#5c5a3b", "#4f5533"].map(
    (c) => new THREE.Color(c),
  );
  for (let b = 0; b < 6; b++) {
    const angle = (b / 6) * Math.PI * 2 + rand() * 0.5;
    const lean = 0.18 + rand() * 0.22;
    const w = 0.07;
    const h = 0.4 + rand() * 0.25;
    const cx = Math.cos(angle);
    const cz = Math.sin(angle);
    // Blade: a slim triangle, tip leaning outward.
    const ox = Math.cos(angle) * 0.06;
    const oz = Math.sin(angle) * 0.06;
    positions.push(
      ox - cz * w,
      0,
      oz + cx * w,
      ox + cz * w,
      0,
      oz - cx * w,
      ox + cx * lean,
      h,
      oz + cz * lean,
    );
    const base = palette[Math.floor(rand() * palette.length)];
    const tip = base.clone().offsetHSL(0.02, 0.02, 0.05);
    colors.push(
      base.r,
      base.g,
      base.b,
      base.r,
      base.g,
      base.b,
      tip.r,
      tip.g,
      tip.b,
    );
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  // Up-facing normals so blades shade like the ground beneath them.
  const normals = new Float32Array(positions.length);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  g.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  return g;
}

function tuftPlacements(count: number) {
  const rand = seeded(77);
  const items: THREE.Matrix4[] = [];
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  while (items.length < count) {
    const r = 3.2 + Math.sqrt(rand()) * 10;
    const a = rand() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r + 1;
    // Keep clear of the cabin, deck and stairs footprint.
    if (Math.abs(x) < 3.6 && z > -4.6 && z < 9.2) continue;
    const s = 0.3 + rand() * 0.22;
    items.push(
      new THREE.Matrix4().compose(
        new THREE.Vector3(x, 0, z),
        q.setFromEuler(e.set(0, rand() * Math.PI, 0)),
        new THREE.Vector3(s, s * (0.7 + rand() * 0.6), s),
      ),
    );
  }
  return items;
}

const rocks: [number, number, number, number, number][] = [
  // x, z, scale, yaw, seed
  [-3.9, 7.6, 0.42, 0.3, 1],
  [-4.6, 8.3, 0.24, 1.1, 2],
  [3.7, 8.9, 0.36, 2.0, 3],
  [5.2, 5.4, 0.55, 0.8, 4],
  [-6.2, 3.2, 0.3, 2.4, 5],
  [1.9, 10.4, 0.2, 0.5, 6],
];

export function Landscape({ night }: { night: boolean }) {
  const groundMap = useMemo(() => createGroundTexture(night), [night]);
  useLayoutEffect(() => () => groundMap.dispose(), [groundMap]);
  const ground = useMemo(() => {
    const g = new THREE.CircleGeometry(60, 96, 0, Math.PI * 2);
    g.rotateX(-Math.PI / 2);
    // Gentle undulation away from the cabin; flat where it stands.
    const pos = g.getAttribute("position");
    for (let v = 0; v < pos.count; v++) {
      const x = pos.getX(v);
      const z = pos.getZ(v);
      const r = Math.hypot(x, z);
      const falloff = THREE.MathUtils.smoothstep(r, 11, 26);
      pos.setY(
        v,
        falloff * (Math.sin(x * 0.18) * 0.8 + Math.cos(z * 0.15 + 1) * 0.9),
      );
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const fir = useMemo(() => firGeometry(), []);
  const treeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.92,
      }),
    [],
  );
  const treeRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = treeRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    trees.forEach(([x, z, s, yaw], i) => {
      m.compose(
        new THREE.Vector3(x, 0, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)),
        new THREE.Vector3(s * 0.95, s * 1.08, s * 0.95),
      );
      mesh.setMatrixAt(i, m);
      const k = 0.85 + (i % 3) * 0.1;
      mesh.setColorAt(i, color.setRGB(k, k, k));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);
  const rockMeshes = useMemo(
    () => rocks.map((r) => ({ data: r, geometry: rockGeometry(r[4]) })),
    [],
  );
  const rockMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#5f5c56",
        roughness: 0.88,
        flatShading: true,
      }),
    [],
  );
  const tuft = useMemo(() => tuftGeometry(), []);
  const tuftMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        roughness: 0.95,
      }),
    [],
  );
  const tuftRef = useRef<THREE.InstancedMesh>(null);
  const tufts = useMemo(() => tuftPlacements(2000), []);
  useLayoutEffect(() => {
    const mesh = tuftRef.current;
    if (!mesh) return;
    tufts.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [tufts]);
  return (
    <group>
      <Sky night={night} />
      <instancedMesh
        ref={tuftRef}
        args={[tuft, tuftMaterial, tufts.length]}
        receiveShadow
      />
      <mesh geometry={ground} receiveShadow>
        <meshStandardMaterial
          map={groundMap}
          roughness={1}
          envMapIntensity={0.6}
        />
      </mesh>
      <instancedMesh
        ref={treeRef}
        args={[fir, treeMaterial, trees.length]}
        castShadow
        receiveShadow
      />
      {rockMeshes.map(({ data: [x, z, s, yaw], geometry }, i) => (
        <mesh
          key={i}
          geometry={geometry}
          material={rockMaterial}
          position={[x, s * 0.12, z]}
          rotation={[0, yaw, 0]}
          scale={s}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}

/** Gradient sky dome: warm horizon to cool zenith (no image files). */
function Sky({ night }: { night: boolean }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
        uniforms: {
          horizon: { value: new THREE.Color() },
          zenith: { value: new THREE.Color() },
          glow: { value: new THREE.Color() },
          sunDir: { value: new THREE.Vector3() },
        },
        vertexShader: `varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p;
}`,
        fragmentShader: `uniform vec3 horizon;
uniform vec3 zenith;
uniform vec3 glow;
uniform vec3 sunDir;
varying vec3 vDir;
void main() {
  float h = clamp(vDir.y, 0.0, 1.0);
  // Narrow warm band at the horizon, cooler sky above it.
  vec3 col = mix(horizon, zenith, pow(smoothstep(0.0, 0.32, h), 0.8));
  float sun = pow(max(dot(normalize(vDir), sunDir), 0.0), 6.0);
  col += glow * sun * (1.0 - h);
  gl_FragColor = vec4(col, 1.0);
}`,
      }),
    [],
  );
  useLayoutEffect(() => {
    const u = material.uniforms;
    if (night) {
      u.horizon.value.set("#1b2440");
      u.zenith.value.set("#050913");
      u.glow.value.set("#000000");
    } else {
      u.horizon.value.set("#e7d2b6");
      u.zenith.value.set("#7d91a5");
      u.glow.value.set("#f6c48f");
    }
    u.sunDir.value.set(-11.5, 4, 9.5).normalize();
  }, [material, night]);
  return (
    <mesh
      material={material}
      scale={100}
      renderOrder={-1}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 32, 16]} />
    </mesh>
  );
}
