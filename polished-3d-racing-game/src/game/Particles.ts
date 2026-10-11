import * as THREE from "three";

// A single pooled THREE.Points cloud driven by a tiny custom shader so every
// particle can have its own size, colour and fade. Recycling is a ring buffer,
// so spawning never allocates during play.

type SpawnOpts = {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  size: number;
  color: THREE.Color;
  life: number;
  gravity?: number;
  drag?: number;
  shrink?: number; // size multiplier at end of life (0 = vanish, >1 = grow)
};

export class Particles {
  points: THREE.Points;
  private capacity: number;
  private pos: Float32Array;
  private col: Float32Array;
  private siz: Float32Array;
  private alp: Float32Array;

  private vx: Float32Array;
  private vy: Float32Array;
  private vz: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private grav: Float32Array;
  private drag: Float32Array;
  private shrink: Float32Array;
  private size0: Float32Array;

  private head = 0;
  private geom: THREE.BufferGeometry;
  private mat: THREE.ShaderMaterial;

  constructor(capacity = 600, texture: THREE.Texture) {
    this.capacity = capacity;
    this.pos = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.siz = new Float32Array(capacity);
    this.alp = new Float32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.vz = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.grav = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.shrink = new Float32Array(capacity);
    this.size0 = new Float32Array(capacity);

    this.geom = new THREE.BufferGeometry();
    this.geom.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    this.geom.setAttribute("aColor", new THREE.BufferAttribute(this.col, 3));
    this.geom.setAttribute("aSize", new THREE.BufferAttribute(this.siz, 1));
    this.geom.setAttribute("aAlpha", new THREE.BufferAttribute(this.alp, 1));
    this.geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: texture }, uScale: { value: 620 } },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;
        varying float vAlpha;
        varying vec3 vColor;
        uniform float uScale;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (uScale / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        precision mediump float;
        uniform sampler2D uTex;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vec4 t = texture2D(uTex, gl_PointCoord);
          gl_FragColor = vec4(vColor, 1.0) * t * vAlpha;
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geom, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  spawn(o: SpawnOpts) {
    const i = this.head;
    this.head = (this.head + 1) % this.capacity;
    const i3 = i * 3;
    this.pos[i3] = o.x;
    this.pos[i3 + 1] = o.y;
    this.pos[i3 + 2] = o.z;
    this.vx[i] = o.vx;
    this.vy[i] = o.vy;
    this.vz[i] = o.vz;
    this.col[i3] = o.color.r;
    this.col[i3 + 1] = o.color.g;
    this.col[i3 + 2] = o.color.b;
    this.size0[i] = o.size;
    this.siz[i] = o.size;
    this.alp[i] = 1;
    this.maxLife[i] = o.life;
    this.life[i] = o.life;
    this.grav[i] = o.gravity ?? 0;
    this.drag[i] = o.drag ?? 0;
    this.shrink[i] = o.shrink ?? 0;
  }

  update(dt: number) {
    const { pos, vx, vy, vz, life, maxLife, grav, drag, shrink, size0, siz, alp } = this;
    for (let i = 0; i < this.capacity; i++) {
      if (life[i] <= 0) {
        if (alp[i] !== 0) alp[i] = 0;
        continue;
      }
      life[i] -= dt;
      const i3 = i * 3;
      // integrate
      vy[i] -= grav[i] * dt;
      const d = Math.max(0, 1 - drag[i] * dt);
      vx[i] *= d;
      vy[i] *= d;
      vz[i] *= d;
      pos[i3] += vx[i] * dt;
      pos[i3 + 1] += vy[i] * dt;
      pos[i3 + 2] += vz[i] * dt;

      const t = Math.max(0, life[i] / maxLife[i]); // 1 -> 0
      alp[i] = t * t; // quadratic fade
      const endScale = shrink[i];
      siz[i] = size0[i] * (endScale + (1 - endScale) * t);
    }
    this.geom.attributes.position.needsUpdate = true;
    this.geom.attributes.aColor.needsUpdate = true;
    this.geom.attributes.aSize.needsUpdate = true;
    this.geom.attributes.aAlpha.needsUpdate = true;
  }

  reset() {
    this.life.fill(0);
    this.alp.fill(0);
    this.siz.fill(0);
  }
}
