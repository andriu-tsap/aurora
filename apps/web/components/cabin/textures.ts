import * as THREE from "three";

import type { WoodLook } from "./config";

/** Small deterministic PRNG so textures and scatter are identical every load. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(size: number) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return { c, ctx };
}

function finish(c: HTMLCanvasElement, srgb: boolean, repeat = 1) {
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 8;
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Wood grain along the texture's U axis: long wavy fibres, growth-ring bands
 * and the occasional knot. Returns colour + roughness maps.
 * One texture tile represents 2 × 2 m (world-space UVs are in metres).
 */
export function createWoodTextures(look: WoodLook, seed = 7) {
  const size = 1024;
  const rand = seeded(seed);
  const { c, ctx } = canvas(size);
  const { c: rc, ctx: rctx } = canvas(size);
  ctx.fillStyle = look.base;
  ctx.fillRect(0, 0, size, size);
  rctx.fillStyle = `rgb(${Math.round(look.roughness * 255)},0,0)`;
  rctx.fillRect(0, 0, size, size);

  // Board-to-board tone variation (boards ≈ 14 cm → 72 px per tile row).
  const rows = 14;
  for (let r = 0; r < rows; r++) {
    const y = (r / rows) * size;
    ctx.fillStyle = `rgba(${rand() > 0.5 ? "255,240,220" : "40,25,10"},${0.03 + rand() * 0.06})`;
    ctx.fillRect(0, y, size, size / rows);
  }

  // Fibres.
  ctx.lineCap = "round";
  for (let i = 0; i < 900; i++) {
    const y0 = rand() * size;
    const amp = 2 + rand() * 6;
    const freq = 0.002 + rand() * 0.006;
    const phase = rand() * Math.PI * 2;
    ctx.strokeStyle = look.grain;
    ctx.globalAlpha = 0.05 + rand() * 0.16;
    ctx.lineWidth = 0.6 + rand() * 1.8;
    ctx.beginPath();
    for (let x = -10; x <= size + 10; x += 16) {
      const y = y0 + Math.sin(x * freq + phase) * amp;
      if (x === -10) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Knots with flowing rings.
  for (let k = 0; k < 5; k++) {
    const kx = rand() * size;
    const ky = rand() * size;
    for (let ring = 1; ring < 7; ring++) {
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = look.grain;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(kx, ky, ring * 6, ring * 2.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = look.grain;
    ctx.beginPath();
    ctx.ellipse(kx, ky, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Shou sugi ban: alligator crackle and slightly glossy ridges.
  if (look.charred) {
    for (let i = 0; i < 1600; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const len = 6 + rand() * 18;
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "#060505";
      ctx.lineWidth = 1 + rand() * 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y + (rand() - 0.5) * 3);
      ctx.stroke();
      if (rand() > 0.6) {
        ctx.beginPath();
        ctx.moveTo(x + len * rand(), y);
        ctx.lineTo(x + len * rand(), y + 4 + rand() * 7);
        ctx.stroke();
      }
      rctx.fillStyle = `rgb(${Math.round((0.45 + rand() * 0.2) * 255)},0,0)`;
      rctx.fillRect(x, y - 1, len, 2);
    }
  } else {
    for (let i = 0; i < 400; i++) {
      rctx.fillStyle = `rgb(${Math.round((look.roughness + (rand() - 0.5) * 0.18) * 255)},0,0)`;
      rctx.fillRect(
        rand() * size,
        rand() * size,
        40 + rand() * 160,
        1 + rand() * 2,
      );
    }
  }
  ctx.globalAlpha = 1;

  // Roughness lives in the green channel for three.js.
  const data = rctx.getImageData(0, 0, size, size);
  for (let i = 0; i < data.data.length; i += 4) {
    data.data[i + 1] = data.data[i];
    data.data[i] = 255;
    data.data[i + 2] = 255;
  }
  rctx.putImageData(data, 0, 0);

  return { map: finish(c, true, 0.5), roughnessMap: finish(rc, false, 0.5) };
}

/** Moss/meadow ground: low-frequency patches plus fine speckle. */
export function createGroundTexture(night: boolean, seed = 11) {
  const size = 1024;
  const rand = seeded(seed);
  const { c, ctx } = canvas(size);
  ctx.fillStyle = night ? "#252b1c" : "#4d5436";
  ctx.fillRect(0, 0, size, size);
  const palette = [
    "#474e33",
    "#5a5f3d",
    "#3c4230",
    "#6b6448",
    "#525839",
    "#77704f",
    "#5f5a44",
  ];
  for (let i = 0; i < 260; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 30 + rand() * 120;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, palette[Math.floor(rand() * palette.length)] + "aa");
    g.addColorStop(1, "#00000000");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 26000; i++) {
    ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
    ctx.globalAlpha = 0.35 + rand() * 0.5;
    ctx.fillRect(rand() * size, rand() * size, 1.5, 1.5 + rand() * 3);
  }
  ctx.globalAlpha = 1;
  return finish(c, true, 26);
}

/** Soft round puff used by chimney smoke sprites. */
export function createPuffTexture() {
  const { c, ctx } = canvas(128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,0.85)");
  g.addColorStop(0.45, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return finish(c, true);
}

/** Concrete for piers. */
export function createConcreteTexture(seed = 3) {
  const size = 256;
  const rand = seeded(seed);
  const { c, ctx } = canvas(size);
  ctx.fillStyle = "#8d8b86";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 5000; i++) {
    const v = 110 + Math.floor(rand() * 60);
    ctx.fillStyle = `rgba(${v},${v - 2},${v - 6},0.5)`;
    ctx.fillRect(rand() * size, rand() * size, 1.5, 1.5);
  }
  return finish(c, true, 1);
}
