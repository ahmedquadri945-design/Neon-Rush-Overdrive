import * as THREE from "three";

// All textures are generated procedurally on <canvas> so the game ships with
// zero external image assets (keeps the single-file build self-contained).

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext("2d")! };
}

function toTexture(canvas: HTMLCanvasElement, repeat?: [number, number]) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (repeat) tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 4;
  return tex;
}

// Dark asphalt with dashed lane dividers + glowing shoulder lines.
export function createRoadTexture(): THREE.Texture {
  const W = 512;
  const H = 1024;
  const { c, ctx } = makeCanvas(W, H);

  // Base asphalt
  ctx.fillStyle = "#15131f";
  ctx.fillRect(0, 0, W, H);

  // subtle noise / variation
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const a = Math.random() * 0.05;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Lane boundaries (LANE_COUNT = 5 -> inner lines at u = 0.2,0.4,0.6,0.8)
  const laneLines = [0.2, 0.4, 0.6, 0.8];
  ctx.fillStyle = "rgba(220,235,255,0.85)";
  const dashH = 90;
  const gap = 70;
  for (const u of laneLines) {
    const x = u * W - 3;
    for (let y = 0; y < H; y += dashH + gap) {
      ctx.fillRect(x, y, 6, dashH);
    }
  }

  // Solid glowing shoulder lines
  const shoulder = (x: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, 0, 8, H);
  };
  shoulder(6, "#22d3ee");
  shoulder(W - 14, "#ff2d95");

  return toTexture(c);
}

// Dark ground with a faint tech grid.
export function createGroundTexture(): THREE.Texture {
  const S = 512;
  const { c, ctx } = makeCanvas(S, S);
  ctx.fillStyle = "#0b0818";
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = "rgba(120,90,220,0.35)";
  ctx.lineWidth = 2;
  const step = S / 8;
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, S);
    ctx.moveTo(0, i * step);
    ctx.lineTo(S, i * step);
    ctx.stroke();
  }
  const tex = toTexture(c, [40, 40]);
  return tex;
}

// Building facade: dark walls with emissive window grid.
export function createBuildingTexture(): THREE.Texture {
  const W = 128;
  const H = 256;
  const { c, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "#0a0a16";
  ctx.fillRect(0, 0, W, H);

  const cols = 6;
  const rows = 16;
  const cw = W / cols;
  const ch = H / rows;
  const palette = ["#8be9fd", "#ff79c6", "#ffd76b", "#a78bfa", "#5eead4"];
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const lit = Math.random();
      if (lit < 0.42) continue; // dark window
      const color = palette[Math.floor(Math.random() * palette.length)];
      ctx.globalAlpha = 0.5 + Math.random() * 0.5;
      ctx.fillStyle = color;
      const pad = 3;
      ctx.fillRect(col * cw + pad, r * ch + pad, cw - pad * 2, ch - pad * 2);
    }
  }
  ctx.globalAlpha = 1;
  return toTexture(c);
}

// Soft radial glow (used for sun, underglow, particle sprites, halos).
export function createGlowTexture(inner = "rgba(255,255,255,1)"): THREE.Texture {
  const S = 128;
  const { c, ctx } = makeCanvas(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const tex = toTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}
