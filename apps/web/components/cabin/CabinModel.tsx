"use client";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import {
  cabinConfig as C,
  metalLooks,
  woodLooks,
  type CabinOptions,
} from "./config";
import {
  apexT,
  beveledBox,
  D,
  extrudeZ,
  F,
  H,
  halfW,
  innerRoofY,
  leftRoofPoint,
  merge,
  pitch,
  projectUVs,
  roofShape,
  slopeLen,
  withInstanceUvOffset,
} from "./geometry";
import {
  createConcreteTexture,
  createPuffTexture,
  createWoodTextures,
  seeded,
} from "./textures";

type Placement = {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
};

/** One draw call for many identical parts (boards, seams, posts…). */
function Instances({
  geometry,
  material,
  items,
  tint,
  uvJitter = false,
  castShadow = true,
  receiveShadow = true,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  items: Placement[];
  /** Per-instance brightness variation (e.g. board-to-board tone). */
  tint?: number;
  /** Requires a material from `withInstanceUvOffset`. */
  uvJitter?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    if (uvJitter) {
      const r = seeded(items.length * 13 + 1);
      const offsets = new Float32Array(items.length * 2);
      for (let i = 0; i < offsets.length; i++) offsets[i] = r() * 4;
      geometry.setAttribute(
        "instanceUvOffset",
        new THREE.InstancedBufferAttribute(offsets, 2),
      );
    }
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const rand = seeded(items.length * 31 + 5);
    const color = new THREE.Color();
    items.forEach((item, i) => {
      p.set(...item.position);
      e.set(...(item.rotation ?? [0, 0, 0]));
      q.setFromEuler(e);
      s.set(...(item.scale ?? [1, 1, 1]));
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      if (tint) {
        const k = 1 + (rand() - 0.5) * tint;
        mesh.setColorAt(i, color.setRGB(k, k, k));
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items, tint, uvJitter, geometry]);
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, items.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  );
}

function useMaterials(options: CabinOptions) {
  const wood = useMemo(() => {
    const look = woodLooks[options.wood];
    const { map, roughnessMap } = createWoodTextures(look, 7);
    return new THREE.MeshStandardMaterial({
      map,
      roughnessMap,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.8,
    });
  }, [options.wood]);

  // Interior ceiling and floor stay light spruce, as in most A-frames.
  const interiorWood = useMemo(() => {
    const { map, roughnessMap } = createWoodTextures(woodLooks.light, 19);
    return new THREE.MeshStandardMaterial({
      map,
      roughnessMap,
      roughness: 1,
      envMapIntensity: 0.35,
    });
  }, []);

  const metal = useMemo(() => {
    const look = metalLooks[options.metal];
    return new THREE.MeshStandardMaterial({
      color: look.color,
      metalness: look.metalness,
      roughness: look.roughness,
      envMapIntensity: 1,
    });
  }, [options.metal]);

  const shared = useMemo(() => {
    const concreteMap = createConcreteTexture();
    return {
      // Low-iron double glazing, light grey-green tint: interiors read darker
      // than the outdoors, as in daylight photography.
      glass: new THREE.MeshPhysicalMaterial({
        color: "#b9c4c2",
        metalness: 0,
        roughness: 0,
        transmission: 0.88,
        thickness: 0.02,
        ior: 1.52,
        envMapIntensity: 1.1,
        specularIntensity: 1,
      }),
      concrete: new THREE.MeshStandardMaterial({
        map: concreteMap,
        color: "#8a8780",
        roughness: 0.9,
      }),
      fabric: new THREE.MeshStandardMaterial({
        color: "#e7dfd2",
        roughness: 0.95,
        side: THREE.DoubleSide,
      }),
      // Image-based light ignores walls, so interior-only surfaces get a
      // reduced environment contribution.
      upholstery: new THREE.MeshStandardMaterial({
        color: "#6f6961",
        roughness: 0.92,
        envMapIntensity: 0.3,
      }),
      rug: new THREE.MeshStandardMaterial({
        color: "#b9af9e",
        roughness: 1,
        envMapIntensity: 0.3,
      }),
      lampGlow: new THREE.MeshStandardMaterial({
        color: "#2a2016",
        emissive: "#ffb066",
        emissiveIntensity: 0,
        toneMapped: false,
      }),
      stove: new THREE.MeshStandardMaterial({
        color: "#19191a",
        roughness: 0.7,
        metalness: 0.4,
      }),
      fireGlow: new THREE.MeshStandardMaterial({
        color: "#1a0d05",
        emissive: "#ff7a2e",
        emissiveIntensity: 0,
        toneMapped: false,
      }),
    };
  }, []);

  const deckWood = useMemo(() => withInstanceUvOffset(wood), [wood]);

  useLayoutEffect(
    () => () => {
      deckWood.dispose();
      wood.map?.dispose();
      wood.roughnessMap?.dispose();
      wood.dispose();
    },
    [wood, deckWood],
  );
  useLayoutEffect(() => () => metal.dispose(), [metal]);

  return { wood, deckWood, interiorWood, metal, ...shared };
}

/** Roof: timber structure, standing-seam metal skin, seams and ridge cap. */
function Roof({
  wood,
  interiorWood,
  metal,
}: {
  wood: THREE.Material;
  interiorWood: THREE.Material;
  metal: THREE.Material;
}) {
  const R = C.roof;
  const length = D + R.overhangFront + R.overhangBack;
  const z0 = -D / 2 - R.overhangBack;

  const timber = useMemo(
    () =>
      projectUVs(
        extrudeZ(roofShape(0, R.thickness, -R.eave), length, R.bevel),
        "z",
      ),
    [R.thickness, R.eave, R.bevel, length],
  );
  const skin = useMemo(
    () =>
      extrudeZ(
        roofShape(R.thickness + 0.002, R.thickness + R.skin, -R.eave - 0.03),
        length + 0.06,
        0.008,
      ),
    [R.thickness, R.skin, R.eave, length],
  );
  const capOffset = R.thickness + R.skin;
  const ridgeCap = useMemo(
    () =>
      extrudeZ(
        roofShape(
          capOffset + 0.001,
          capOffset + 0.022,
          apexT(capOffset) - 0.24,
        ),
        length + 0.1,
        0.006,
      ),
    [capOffset, length],
  );

  const seamHeight = 0.032;
  const seam = useMemo(() => beveledBox(1, seamHeight, 0.022, 0.006), []);
  const seams = useMemo(() => {
    const items: Placement[] = [];
    const tStart = -R.eave - 0.03;
    const tEnd = apexT(capOffset) - 0.2;
    const len = tEnd - tStart;
    const mid = leftRoofPoint(capOffset + seamHeight / 2, tStart + len / 2);
    for (let z = z0 + 0.25; z < z0 + length - 0.1; z += R.seamSpacing) {
      items.push({
        position: [mid.x, mid.y, z],
        rotation: [0, 0, pitch],
        scale: [len, 1, 1],
      });
      items.push({
        position: [-mid.x, mid.y, z],
        rotation: [0, 0, -pitch],
        scale: [len, 1, 1],
      });
    }
    return items;
  }, [R.eave, R.seamSpacing, capOffset, length, z0]);

  return (
    <group>
      {/* Caps (front/back cross-section) show exterior timber; slope faces form the light interior ceiling. */}
      <mesh
        geometry={timber}
        material={[wood, interiorWood]}
        position-z={z0}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={skin}
        material={metal}
        position-z={z0 - 0.03}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={ridgeCap}
        material={metal}
        position-z={z0 - 0.05}
        castShadow
      />
      <Instances geometry={seam} material={metal} items={seams} />
    </group>
  );
}

/** Rear gable: timber wall, light inside, board-and-batten cladding outside. */
function RearGable({
  wood,
  interiorWood,
}: {
  wood: THREE.Material;
  interiorWood: THREE.Material;
}) {
  const thickness = 0.12;
  const triangle = useMemo(() => {
    const inset = 0.02;
    const shape = new THREE.Shape();
    shape.moveTo(-halfW + inset, F);
    shape.lineTo(halfW - inset, F);
    shape.lineTo(0, F + H - inset * 2);
    shape.closePath();
    return shape;
  }, []);
  const wall = useMemo(
    () => projectUVs(extrudeZ(triangle, thickness, 0.01), "y"),
    [triangle],
  );
  const skin = useMemo(() => {
    const g = new THREE.ShapeGeometry(triangle);
    g.rotateY(Math.PI);
    return projectUVs(g, "y");
  }, [triangle]);
  // Battens built at true height so grain and bevels are never stretched.
  const battens = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (let x = -halfW + 0.22; x <= halfW - 0.22; x += 0.2) {
      const top = innerRoofY(Math.abs(x) + 0.025) - 0.02;
      const h = top - F;
      if (h < 0.15) continue;
      const g = beveledBox(0.05, h, 0.03, 0.008, "y");
      g.translate(x, F + h / 2, -D / 2 - 0.02);
      parts.push(g);
    }
    return merge(parts);
  }, []);
  return (
    <group>
      <mesh
        geometry={wall}
        material={interiorWood}
        position-z={-D / 2}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={skin}
        material={wood}
        position-z={-D / 2 - 0.004}
        receiveShadow
      />
      <mesh geometry={battens} material={wood} castShadow receiveShadow />
    </group>
  );
}

/** Glass facade with perimeter frame, mullions, transoms and a sliding door. */
function Facade({
  metal,
  glass,
}: {
  metal: THREE.Material;
  glass: THREE.Material;
}) {
  const f = C.facade;
  const zf = D / 2;
  const glassGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-halfW + 0.05, F + 0.02);
    shape.lineTo(halfW - 0.05, F + 0.02);
    shape.lineTo(0, F + H - 0.1);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);
  const profile = useMemo(
    () => beveledBox(1, f.mullionWidth, f.mullionDepth, 0.008),
    [f.mullionWidth, f.mullionDepth],
  );
  const frameProfile = useMemo(
    () => beveledBox(1, f.frame, f.mullionDepth + 0.04, 0.01),
    [f.frame, f.mullionDepth],
  );

  const members = useMemo(() => {
    const items: Placement[] = [];
    // Vertical mullions, clipped to the roof line.
    for (const mx of f.mullionsX) {
      for (const sx of [-1, 1]) {
        const x = mx * sx;
        const top = innerRoofY(x) - 0.05;
        const h = top - F;
        items.push({
          position: [x, F + h / 2, zf],
          rotation: [0, 0, Math.PI / 2],
          scale: [h, 1, 1],
        });
      }
    }
    // Transoms.
    for (const t of f.transoms) {
      const w = 2 * halfW * (1 - t / H) - 0.1;
      items.push({ position: [0, F + t, zf], scale: [w, 1, 1] });
    }
    // Centre mullion above the door.
    const above = F + f.transoms[0];
    const h = innerRoofY(0) - 0.08 - above;
    items.push({
      position: [0, above + h / 2, zf],
      rotation: [0, 0, Math.PI / 2],
      scale: [h, 1, 1],
    });
    return items;
  }, [f.mullionsX, f.transoms, zf]);

  const frame = useMemo(() => {
    const items: Placement[] = [];
    items.push({
      position: [0, F + f.frame / 2, zf],
      scale: [2 * halfW - 0.02, 1, 1],
    });
    const mid = leftRoofPoint(-f.frame / 2, slopeLen / 2);
    items.push({
      position: [mid.x, mid.y, zf],
      rotation: [0, 0, pitch],
      scale: [slopeLen, 1, 1],
    });
    items.push({
      position: [-mid.x, mid.y, zf],
      rotation: [0, 0, -pitch],
      scale: [slopeLen, 1, 1],
    });
    return items;
  }, [f.frame, zf]);

  // Two sliding sashes, one on each track.
  const sash = useMemo(() => beveledBox(1, 0.05, 0.05, 0.008), []);
  const sashes = useMemo(() => {
    const items: Placement[] = [];
    const w = f.doorWidth / 2;
    [
      [-w / 2, zf + 0.07],
      [w / 2, zf + 0.12],
    ].forEach(([cx, z]) => {
      items.push({ position: [cx, F + 0.04, z], scale: [w, 1, 1] });
      items.push({
        position: [cx, F + f.doorHeight - 0.03, z],
        scale: [w, 1, 1],
      });
      for (const sx of [-1, 1]) {
        items.push({
          position: [cx + (sx * (w - 0.05)) / 2, F + f.doorHeight / 2, z],
          rotation: [0, 0, Math.PI / 2],
          scale: [f.doorHeight - 0.02, 1, 1],
        });
      }
    });
    return items;
  }, [f.doorWidth, f.doorHeight, zf]);
  const handle = useMemo(() => beveledBox(0.025, 0.45, 0.03, 0.006), []);

  return (
    <group>
      <mesh geometry={glassGeometry} material={glass} position-z={zf} />
      <Instances geometry={profile} material={metal} items={members} />
      <Instances geometry={frameProfile} material={metal} items={frame} />
      <Instances geometry={sash} material={metal} items={sashes} />
      <mesh
        geometry={handle}
        material={metal}
        position={[f.doorWidth / 2 - 0.12, F + 1.05, zf + 0.165]}
        castShadow
      />
      <mesh
        geometry={handle}
        material={metal}
        position={[-0.12, F + 1.05, zf + 0.115]}
        castShadow
      />
    </group>
  );
}

/** Deck: individual boards with gaps, joists, rim, piers, stairs and railing. */
function Deck({
  wood,
  deckWood,
  metal,
  concrete,
}: {
  wood: THREE.Material;
  deckWood: THREE.Material;
  metal: THREE.Material;
  concrete: THREE.Material;
}) {
  const d = C.deck;
  const b = d.board;
  const z0 = D / 2 + 0.02;
  const zEnd = z0 + d.depth;
  const boardGeo = useMemo(
    () => beveledBox(d.width, b.thickness, b.width, b.bevel),
    [d.width, b.thickness, b.width, b.bevel],
  );
  const boards = useMemo(() => {
    const items: Placement[] = [];
    const pitchZ = b.width + b.gap;
    const count = Math.floor(d.depth / pitchZ);
    for (let i = 0; i < count; i++)
      items.push({
        position: [0, F - b.thickness / 2, z0 + b.width / 2 + i * pitchZ],
      });
    return items;
  }, [b.width, b.gap, b.thickness, d.depth, d.width, z0]);

  const beam = useMemo(
    () => beveledBox(0.05, 0.18, d.depth, 0.01, "z"),
    [d.depth],
  );
  const joists = useMemo(() => {
    const items: Placement[] = [];
    for (
      let x = -d.width / 2 + 0.1;
      x <= d.width / 2 - 0.1;
      x += d.joistSpacing
    )
      items.push({
        position: [x, F - b.thickness - 0.09, z0 + d.depth / 2],
      });
    return items;
  }, [d.width, d.joistSpacing, d.depth, b.thickness, z0]);

  const rimY = F - b.thickness - d.rimDepth / 2 + 0.005;
  const rims = useMemo(() => {
    const front = beveledBox(d.width + 0.08, d.rimDepth, 0.04, 0.01);
    front.translate(0, rimY, zEnd + 0.02);
    const sides = [-1, 1].map((sx) => {
      const g = beveledBox(0.04, d.rimDepth, d.depth, 0.01, "z");
      g.translate(sx * (d.width / 2 + 0.02), rimY, z0 + d.depth / 2);
      return g;
    });
    return merge([front, ...sides]);
  }, [d.width, d.rimDepth, d.depth, rimY, z0, zEnd]);

  const pierTop = F - b.thickness - 0.18;
  const pier = useMemo(
    () => projectUVs(beveledBox(C.pier.size, pierTop, C.pier.size, 0.02), "y"),
    [pierTop],
  );
  const piers = useMemo(() => {
    const items: Placement[] = [];
    for (const x of [-2.55, -0.9, 0.9, 2.55])
      for (const z of [z0 + 0.35, zEnd - 0.25, -D / 2 + 0.4, -1.3, 1.6])
        items.push({ position: [x, pierTop / 2, z] });
    return items;
  }, [pierTop, z0, zEnd]);

  // Stairs down from the deck front.
  const s = C.stairs;
  const steps = Math.round(F / s.rise);
  const treadGeo = useMemo(
    () => beveledBox(s.width, b.thickness, b.width, b.bevel),
    [s.width, b.thickness, b.width, b.bevel],
  );
  const treads = useMemo(() => {
    const items: Placement[] = [];
    for (let k = 1; k < steps; k++) {
      const top = F - k * s.rise;
      const zs = zEnd + 0.04 + (k - 1) * s.run;
      for (let j = 0; j < 2; j++)
        items.push({
          position: [
            0,
            top - b.thickness / 2,
            zs + b.width / 2 + j * (b.width + b.gap),
          ],
        });
    }
    return items;
  }, [steps, s.rise, s.run, zEnd, b.thickness, b.width, b.gap]);
  const stringerLen = Math.hypot(F, (steps - 1) * s.run + 0.35);
  const stringerAngle = Math.atan2(F, (steps - 1) * s.run + 0.35);
  const stringer = useMemo(
    () => beveledBox(0.05, 0.2, stringerLen, 0.01, "z"),
    [stringerLen],
  );

  // Railing: metal posts and bars, timber handrail; open at the stairs and
  // starting beyond the roof overhang at the sides.
  const r = C.railing;
  const sideStart = D / 2 + C.roof.overhangFront + 0.12;
  const railX = d.width / 2 - 0.05;
  const gapX = s.width / 2 + 0.08;
  const runs = useMemo(
    () => [
      // [x1, z1, x2, z2]
      [-railX, sideStart, -railX, zEnd - 0.05],
      [railX, sideStart, railX, zEnd - 0.05],
      [-railX, zEnd - 0.05, -gapX, zEnd - 0.05],
      [gapX, zEnd - 0.05, railX, zEnd - 0.05],
    ],
    [railX, sideStart, zEnd, gapX],
  );
  const postGeo = useMemo(
    () => beveledBox(r.postSize, r.height, r.postSize, 0.008, "y"),
    [r.postSize, r.height],
  );
  const barGeo = useMemo(() => beveledBox(1, 0.014, 0.014, 0.004), []);
  const { posts, bars, rails } = useMemo(() => {
    const posts: Placement[] = [];
    const bars: Placement[] = [];
    const railParts: THREE.BufferGeometry[] = [];
    for (const [x1, z1, x2, z2] of runs) {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const yaw = -Math.atan2(z2 - z1, x2 - x1);
      const segments = Math.max(1, Math.ceil(len / r.postSpacing));
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        posts.push({
          position: [x1 + (x2 - x1) * t, F + r.height / 2, z1 + (z2 - z1) * t],
        });
      }
      const cx = (x1 + x2) / 2;
      const cz = (z1 + z2) / 2;
      const rail = beveledBox(len + 0.12, 0.045, 0.12, 0.012);
      rail.rotateY(yaw);
      rail.translate(cx, F + r.height + 0.022, cz);
      railParts.push(rail);
      for (let k = 1; k <= r.bars; k++)
        bars.push({
          position: [cx, F + 0.12 + (k * (r.height - 0.2)) / (r.bars + 1), cz],
          rotation: [0, yaw, 0],
          scale: [len, 1, 1],
        });
    }
    return { posts, bars, rails: merge(railParts) };
  }, [runs, r.postSpacing, r.height, r.bars]);

  // Platform under the cabin body (hidden behind eaves, visible from low angles).
  const platform = useMemo(
    () => beveledBox(2 * halfW - 0.1, 0.24, D, 0.015, "z"),
    [],
  );

  return (
    <group>
      <Instances
        geometry={boardGeo}
        material={deckWood}
        items={boards}
        tint={0.16}
        uvJitter
      />
      <Instances
        geometry={beam}
        material={wood}
        items={joists}
        castShadow={false}
      />
      <mesh geometry={rims} material={wood} castShadow receiveShadow />
      <Instances geometry={pier} material={concrete} items={piers} />
      <mesh
        geometry={platform}
        material={wood}
        position={[0, F - 0.02 - 0.12, 0]}
        receiveShadow
      />
      <Instances
        geometry={treadGeo}
        material={deckWood}
        items={treads}
        tint={0.16}
        uvJitter
      />
      {[-1, 1].map((sx) => (
        <mesh
          key={sx}
          geometry={stringer}
          material={wood}
          position={[
            sx * (s.width / 2 - 0.04),
            F / 2 - 0.12,
            zEnd + ((steps - 1) * s.run + 0.35) / 2,
          ]}
          rotation={[stringerAngle, 0, 0]}
          castShadow
          receiveShadow
        />
      ))}
      <Instances geometry={postGeo} material={metal} items={posts} />
      <Instances geometry={barGeo} material={metal} items={bars} />
      <mesh geometry={rails} material={wood} castShadow receiveShadow />
    </group>
  );
}

/** Black flue with storm collar and rain cap, plus drifting smoke. */
function Chimney({
  metal,
  active,
  night,
}: {
  metal: THREE.Material;
  active: boolean;
  /** Sprites are unlit, so smoke is tinted for the scene light. */
  night: boolean;
}) {
  const ch = C.chimney;
  const outerApex = leftRoofPoint(
    C.roof.thickness + C.roof.skin,
    apexT(C.roof.thickness + C.roof.skin),
  ).y;
  const top = outerApex + ch.aboveRidge;
  const bottom = F + 0.85;
  const roofY =
    innerRoofY(ch.x) + (C.roof.thickness + C.roof.skin) / Math.cos(pitch);
  const puff = useMemo(() => createPuffTexture(), []);
  const smoke = useRef<THREE.Group>(null);
  const rand = useMemo(() => seeded(42), []);
  const particles = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        offset: i / 9,
        drift: (rand() - 0.5) * 0.3,
        spin: rand() * Math.PI,
      })),
    [rand],
  );
  const elapsed = useRef(1.4);
  useFrame((state, delta) => {
    if (active) elapsed.current += Math.min(delta, 0.05);
    smoke.current?.children.forEach((child, i) => {
      const p = particles[i];
      const life = (elapsed.current * 0.12 + p.offset) % 1;
      child.position.set(
        ch.x + life * 0.9 + p.drift * life,
        top + 0.15 + life * 2.6,
        ch.z - life * 0.35,
      );
      const size = 0.3 + life * 1.5;
      child.scale.set(size, size, size);
      const material = (child as THREE.Sprite).material;
      material.opacity = Math.sin(life * Math.PI) * (night ? 0.16 : 0.22);
      material.rotation = p.spin + life;
    });
    if (active) state.invalidate();
  });
  return (
    <group>
      <mesh
        material={metal}
        position={[ch.x, (top + bottom) / 2, ch.z]}
        castShadow
      >
        <cylinderGeometry args={[ch.radius, ch.radius, top - bottom, 24]} />
      </mesh>
      <mesh material={metal} position={[ch.x, roofY + 0.05, ch.z]} castShadow>
        <cylinderGeometry
          args={[ch.radius + 0.06, ch.radius + 0.12, 0.12, 24]}
        />
      </mesh>
      <mesh material={metal} position={[ch.x, top + 0.09, ch.z]} castShadow>
        <coneGeometry args={[ch.radius + 0.1, 0.12, 24]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          material={metal}
          position={[
            ch.x + Math.cos((i * Math.PI * 2) / 3) * (ch.radius + 0.02),
            top + 0.02,
            ch.z + Math.sin((i * Math.PI * 2) / 3) * (ch.radius + 0.02),
          ]}
        >
          <boxGeometry args={[0.012, 0.06, 0.012]} />
        </mesh>
      ))}
      <group ref={smoke}>
        {particles.map((_, i) => (
          <sprite key={i}>
            <spriteMaterial
              map={puff}
              color={night ? "#4a5163" : "#d8dcdf"}
              transparent
              depthWrite={false}
              opacity={0}
            />
          </sprite>
        ))}
      </group>
    </group>
  );
}

/** Wall lantern: metal cage with an opal glass core that glows at night. */
function Lantern({
  x,
  metal,
  glow,
  night,
}: {
  x: number;
  metal: THREE.Material;
  glow: THREE.Material;
  night: boolean;
}) {
  const y = F + C.lantern.heightAboveFloor;
  const z = D / 2 + 0.16;
  const post = useMemo(() => beveledBox(0.016, 0.26, 0.016, 0.004, "y"), []);
  const plate = useMemo(() => beveledBox(0.16, 0.025, 0.16, 0.006), []);
  return (
    <group position={[x, y, z]}>
      <mesh geometry={plate} material={metal} position-y={0.145} castShadow />
      <mesh geometry={plate} material={metal} position-y={-0.145} castShadow />
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh
          key={i}
          geometry={post}
          material={metal}
          position={[sx * 0.065, 0, sz * 0.065]}
          castShadow
        />
      ))}
      <mesh material={glow}>
        <cylinderGeometry args={[0.045, 0.045, 0.22, 20]} />
      </mesh>
      <mesh material={metal} position={[0, 0.03, -0.11]}>
        <boxGeometry args={[0.03, 0.03, 0.1]} />
      </mesh>
      {night && (
        <pointLight
          color="#ffb877"
          intensity={1.6}
          distance={5}
          decay={2}
          position={[0, 0, 0.1]}
        />
      )}
    </group>
  );
}

/** Pleated linen curtains on the lower glazing. */
function Curtains({
  closed,
  material,
}: {
  closed: boolean;
  material: THREE.Material;
}) {
  const height = 2.38;
  const width = 3.2;
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, height, 80, 1);
    const pos = g.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, Math.sin((x + 0.5) * Math.PI * 2 * 10) * 0.028);
    }
    g.translate(0.5, height / 2, 0);
    g.computeVertexNormals();
    return g;
  }, []);
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);
  const openWidth = 0.32;
  useFrame((state, delta) => {
    const target = closed ? width / 2 + 0.04 : openWidth;
    let moving = false;
    for (const [mesh, sign] of [
      [left.current, 1],
      [right.current, -1],
    ] as const) {
      if (!mesh) continue;
      const next = THREE.MathUtils.damp(mesh.scale.x, target, 5, delta);
      if (Math.abs(next - target) > 0.002) moving = true;
      mesh.scale.x = next;
      mesh.scale.z = Math.min(2.4, (width / 2 / next) * 0.55);
      mesh.position.x = sign === 1 ? -width / 2 : width / 2;
      mesh.scale.x = next * sign;
    }
    if (moving) state.invalidate();
  });
  const z = D / 2 - 0.22;
  return (
    <group position={[0, F + 0.02, z]}>
      <mesh
        ref={left}
        geometry={geometry}
        material={material}
        scale={[openWidth, 1, 1]}
        castShadow
      />
      <mesh
        ref={right}
        geometry={geometry}
        material={material}
        position-z={0.035}
        scale={[-openWidth, 1, 1]}
        castShadow
      />
      <mesh position={[0, height + 0.03, 0]}>
        <boxGeometry args={[width + 0.1, 0.025, 0.025]} />
        <meshStandardMaterial color="#1c1d1f" metalness={0.5} roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Interior visible through the glass: floor, loft, sofa, stove, pendant. */
function Interior({
  interiorWood,
  metal,
  upholstery,
  rug,
  stove,
  fireGlow,
  lampGlow,
  night,
}: {
  interiorWood: THREE.Material;
  metal: THREE.Material;
  upholstery: THREE.Material;
  rug: THREE.Material;
  stove: THREE.Material;
  fireGlow: THREE.Material;
  lampGlow: THREE.Material;
  night: boolean;
}) {
  const L = C.loft;
  const floor = useMemo(
    () => beveledBox(2 * halfW - 0.3, 0.04, D - 0.1, 0.01, "z"),
    [],
  );
  const loft = useMemo(() => {
    const y0 = F + L.height;
    const y1 = y0 + L.thickness;
    const w0 = 2 * halfW * (1 - L.height / H) - 0.04;
    const w1 = 2 * halfW * (1 - (L.height + L.thickness) / H) - 0.04;
    const shape = new THREE.Shape();
    shape.moveTo(-w0 / 2, y0);
    shape.lineTo(w0 / 2, y0);
    shape.lineTo(w1 / 2, y1);
    shape.lineTo(-w1 / 2, y1);
    shape.closePath();
    return projectUVs(extrudeZ(shape, L.depthFromRear, 0.012), "z");
  }, [L.height, L.thickness, L.depthFromRear]);
  const loftEdge = -D / 2 + L.depthFromRear;
  const loftRailY = F + L.height + L.thickness;
  const loftWidth = 2 * halfW * (1 - (L.height + L.thickness + 0.9) / H) - 0.1;
  const seat = useMemo(() => beveledBox(2.3, 0.42, 0.95, 0.06), []);
  const back = useMemo(() => beveledBox(2.3, 0.45, 0.22, 0.06), []);
  const arm = useMemo(() => beveledBox(0.2, 0.6, 0.95, 0.05), []);
  const table = useMemo(() => beveledBox(1.1, 0.06, 0.6, 0.02), []);
  const tableLeg = useMemo(() => beveledBox(0.04, 0.34, 0.04, 0.008, "y"), []);
  const sofaZ = 1.35;
  return (
    <group>
      <mesh
        geometry={floor}
        material={interiorWood}
        position={[0, F - 0.02, 0]}
        receiveShadow
      />
      <mesh
        geometry={loft}
        material={interiorWood}
        position-z={-D / 2}
        castShadow
        receiveShadow
      />
      {/* Loft guard: metal top rail and slim balusters. */}
      <mesh
        material={metal}
        position={[0, loftRailY + 0.9, loftEdge - 0.03]}
        castShadow
      >
        <boxGeometry args={[loftWidth, 0.04, 0.04]} />
      </mesh>
      {Array.from(
        { length: 13 },
        (_, i) => -loftWidth / 2 + (i * loftWidth) / 12,
      ).map((x) => (
        <mesh
          key={x}
          material={metal}
          position={[x, loftRailY + 0.45, loftEdge - 0.03]}
        >
          <boxGeometry args={[0.018, 0.9, 0.018]} />
        </mesh>
      ))}
      {/* Sofa facing the glass. */}
      <group position={[0, F, sofaZ]}>
        <mesh
          geometry={seat}
          material={upholstery}
          position={[0, 0.21, 0]}
          castShadow
          receiveShadow
        />
        <mesh
          geometry={back}
          material={upholstery}
          position={[0, 0.6, -0.38]}
          castShadow
        />
        <mesh
          geometry={arm}
          material={upholstery}
          position={[-1.15, 0.3, 0]}
          castShadow
        />
        <mesh
          geometry={arm}
          material={upholstery}
          position={[1.15, 0.3, 0]}
          castShadow
        />
      </group>
      <mesh
        material={rug}
        position={[0, F + 0.006, sofaZ + 1.45]}
        receiveShadow
      >
        <boxGeometry args={[2.6, 0.012, 1.7]} />
      </mesh>
      <group position={[0, F, sofaZ + 1.4]}>
        <mesh
          geometry={table}
          material={interiorWood}
          position-y={0.37}
          castShadow
          receiveShadow
        />
        {[
          [-0.48, -0.24],
          [0.48, -0.24],
          [-0.48, 0.24],
          [0.48, 0.24],
        ].map(([x, z]) => (
          <mesh
            key={`${x}${z}`}
            geometry={tableLeg}
            material={metal}
            position={[x, 0.17, z]}
          />
        ))}
      </group>
      {/* Wood stove under the flue. */}
      <group position={[C.chimney.x, F, C.chimney.z]}>
        <mesh material={stove} position-y={0.42} castShadow>
          <boxGeometry args={[0.5, 0.72, 0.45]} />
        </mesh>
        <mesh material={fireGlow} position={[0, 0.4, 0.226]}>
          <planeGeometry args={[0.3, 0.26]} />
        </mesh>
      </group>
      {/* Pendant lamp from the ridge. */}
      <group position={[0, F + 3.25, 2.75]}>
        <mesh material={metal} position-y={(innerRoofY(0) - (F + 3.25)) / 2}>
          <cylinderGeometry
            args={[0.004, 0.004, innerRoofY(0) - (F + 3.25), 6]}
          />
        </mesh>
        <mesh material={metal} castShadow>
          <cylinderGeometry args={[0.08, 0.26, 0.28, 32, 1, true]} />
        </mesh>
        <mesh material={lampGlow} position-y={-0.12} rotation-x={Math.PI / 2}>
          <circleGeometry args={[0.24, 32]} />
        </mesh>
      </group>
      {night && (
        <>
          {/* Shadowed so walls and roof stop the light from leaking outside. */}
          <pointLight
            color="#ffb46e"
            intensity={22}
            distance={6.5}
            decay={2}
            position={[0, F + 2.6, 1.6]}
            castShadow
            shadow-mapSize={[512, 512]}
            shadow-bias={-0.004}
            shadow-normalBias={0.09}
          />
          <pointLight
            color="#ff9a52"
            intensity={4}
            distance={2.2}
            decay={2}
            position={[C.chimney.x, F + 0.5, C.chimney.z + 0.6]}
          />
          <pointLight
            color="#ffc68a"
            intensity={5}
            distance={3.2}
            decay={2}
            position={[0, F + L.height + 1.2, -D / 2 + 1.6]}
          />
        </>
      )}
    </group>
  );
}

export function CabinModel({
  options,
  animate,
}: {
  options: CabinOptions;
  /** Smoke and other ambient motion run only while the scene is active. */
  animate: boolean;
}) {
  const m = useMaterials(options);
  const night = options.time === "night";
  const closed = options.curtains === "closed";
  const spotTarget = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    m.lampGlow.emissiveIntensity = night ? 5 : 0;
    m.fireGlow.emissiveIntensity = night ? 3 : 0.6;
    const fabric = m.fabric as THREE.MeshStandardMaterial;
    fabric.emissive.set("#ffb46b");
    fabric.emissiveIntensity = night && closed ? 0.32 : 0;
  }, [m, night, closed]);

  return (
    <group>
      <Roof wood={m.wood} interiorWood={m.interiorWood} metal={m.metal} />
      <RearGable wood={m.wood} interiorWood={m.interiorWood} />
      <Facade metal={m.metal} glass={m.glass} />
      <Deck
        wood={m.wood}
        deckWood={m.deckWood}
        metal={m.metal}
        concrete={m.concrete}
      />
      <Chimney metal={m.metal} active={animate} night={night} />
      <Curtains closed={closed} material={m.fabric} />
      <Interior
        interiorWood={m.interiorWood}
        metal={m.metal}
        upholstery={m.upholstery}
        rug={m.rug}
        stove={m.stove}
        fireGlow={m.fireGlow}
        lampGlow={m.lampGlow}
        night={night}
      />
      {[-1, 1].map((sx) => (
        <Lantern
          key={sx}
          x={sx * C.lantern.x}
          metal={m.metal}
          glow={m.lampGlow}
          night={night}
        />
      ))}
      <primitive object={spotTarget} position={[0, F, D / 2 + 2.4]} />
      {night && (
        // Warm spill from the glazing onto the deck; casts mullion shadows.
        <spotLight
          target={spotTarget}
          color="#ffb877"
          intensity={closed ? 14 : 40}
          distance={12}
          angle={1.0}
          penumbra={0.9}
          decay={2}
          position={[0, F + 2.4, D / 2 - 1.2]}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0015}
          shadow-normalBias={0.04}
        />
      )}
    </group>
  );
}
