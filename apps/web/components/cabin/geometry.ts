import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { cabinConfig } from "./config";

const C = cabinConfig;
export const halfW = C.width / 2;
export const H = C.ridge;
export const F = C.floorLevel;
export const D = C.depth;
export const slopeLen = Math.hypot(halfW, H);
/** Roof pitch from horizontal. */
export const pitch = Math.atan2(H, halfW);
/** Unit vector up the left slope (base → ridge). */
const u = new THREE.Vector2(halfW / slopeLen, H / slopeLen);
/** Outward unit normal of the left slope. */
const n = new THREE.Vector2(-H / slopeLen, halfW / slopeLen);

/** Point on the left roof plane: `offset` along the outward normal, `t` metres along the slope from the floor line. */
export function leftRoofPoint(offset: number, t: number) {
  return new THREE.Vector2(
    -halfW + offset * n.x + t * u.x,
    F + offset * n.y + t * u.y,
  );
}

/** Slope distance from the floor line to the ridge (x = 0) for a given offset. */
export function apexT(offset: number) {
  return (halfW - offset * n.x) / u.x;
}

/** Inner roof height above ground at horizontal position x. */
export function innerRoofY(x: number) {
  return F + H * (1 - Math.abs(x) / halfW);
}

/**
 * Inverted-V cross-section between two offsets from the inner roof plane,
 * starting `fromT` metres along the slope (negative = below the floor line).
 */
export function roofShape(offIn: number, offOut: number, fromT: number) {
  const lin = leftRoofPoint(offIn, fromT);
  const lout = leftRoofPoint(offOut, fromT);
  const apexOut = leftRoofPoint(offOut, apexT(offOut));
  const apexIn = leftRoofPoint(offIn, apexT(offIn));
  const shape = new THREE.Shape();
  shape.moveTo(lin.x, lin.y);
  shape.lineTo(lout.x, lout.y);
  shape.lineTo(0, apexOut.y);
  shape.lineTo(-lout.x, lout.y);
  shape.lineTo(-lin.x, lin.y);
  shape.lineTo(0, apexIn.y);
  shape.closePath();
  return shape;
}

/** Extrude a cross-section along Z with a real edge bevel; length is the finished length. */
export function extrudeZ(shape: THREE.Shape, length: number, bevel: number) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, length - 2 * bevel),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 2,
    curveSegments: 1,
  });
  geometry.translate(0, 0, bevel);
  return geometry;
}

/**
 * Box-project UVs in metres so procedural textures keep real-world scale.
 * The grain runs along `grain` wherever that axis lies in the face plane.
 */
export function projectUVs(
  geometry: THREE.BufferGeometry,
  grain: "x" | "y" | "z",
) {
  const pos = geometry.getAttribute("position");
  const nor = geometry.getAttribute("normal");
  const uv = new Float32Array(pos.count * 2);
  const v = new THREE.Vector3();
  const nn = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    nn.fromBufferAttribute(nor, i);
    const ax = Math.abs(nn.x);
    const ay = Math.abs(nn.y);
    const az = Math.abs(nn.z);
    const dominant = ax >= ay && ax >= az ? "x" : ay >= az ? "y" : "z";
    const axes = (["x", "y", "z"] as const).filter((a) => a !== dominant);
    const along = (axes as readonly string[]).includes(grain) ? grain : axes[0];
    const across = axes.find((a) => a !== along) ?? axes[1];
    uv[i * 2] = v[along];
    uv[i * 2 + 1] = v[across];
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geometry;
}

/** Bevelled box with metre-scale UVs. */
export function beveledBox(
  w: number,
  h: number,
  d: number,
  radius: number,
  grain: "x" | "y" | "z" = "x",
) {
  const r = Math.min(radius, Math.min(w, h, d) / 2 - 0.0005);
  return projectUVs(new RoundedBoxGeometry(w, h, d, 2, r), grain);
}

/** Count rendered triangles of a scene graph, including instances. */
export function countTriangles(root: THREE.Object3D) {
  let total = 0;
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const g = mesh.geometry;
    const tris = g.index
      ? g.index.count / 3
      : g.getAttribute("position").count / 3;
    const instances = (mesh as THREE.InstancedMesh).isInstancedMesh
      ? (mesh as THREE.InstancedMesh).count
      : 1;
    total += tris * instances;
  });
  return Math.round(total);
}

/**
 * Clone a textured material so each instance samples a different patch of
 * the texture (per-instance `instanceUvOffset`). Keeps identical boards
 * from showing the same knots.
 */
export function withInstanceUvOffset<T extends THREE.MeshStandardMaterial>(
  material: T,
): T {
  const clone = material.clone() as T;
  clone.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute vec2 instanceUvOffset;",
      )
      .replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
#ifdef USE_MAP
  vMapUv += instanceUvOffset;
#endif
#ifdef USE_ROUGHNESSMAP
  vRoughnessMapUv += instanceUvOffset;
#endif`,
      );
  };
  clone.customProgramCacheKey = () => "instance-uv-offset";
  return clone;
}

/** Merge already-positioned geometries into one draw call. */
export function merge(parts: THREE.BufferGeometry[]) {
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  if (!merged) throw new Error("Geometry merge failed");
  return merged;
}
