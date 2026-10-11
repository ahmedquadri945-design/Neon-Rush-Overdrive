import * as THREE from "three";
import { CAR_WIDTH, CAR_LENGTH } from "./constants";

// Stylised low-poly vehicles assembled from boxes/cylinders. Shared geometry and
// materials are created once and reused to keep draw state cheap.

let GEO: {
  box: THREE.BoxGeometry;
  wheel: THREE.CylinderGeometry;
  shadow: THREE.CircleGeometry;
  flame: THREE.ConeGeometry;
} | null = null;

function geo() {
  if (!GEO) {
    GEO = {
      box: new THREE.BoxGeometry(1, 1, 1),
      wheel: new THREE.CylinderGeometry(0.42, 0.42, 0.34, 12),
      shadow: new THREE.CircleGeometry(1, 20),
      flame: new THREE.ConeGeometry(0.22, 1.4, 8, 1, true),
    };
    GEO.wheel.rotateZ(Math.PI / 2);
  }
  return GEO;
}

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.5,
    metalness: 0.35,
    ...opts,
  });
}

function neon(color: number, intensity = 2.2) {
  return new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 1,
    metalness: 0,
  });
}

function shadowMat() {
  return new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
}

function addWheel(parent: THREE.Object3D, x: number, y: number, z: number) {
  const g = geo();
  const m = mat(0x0c0c12, { roughness: 0.9, metalness: 0.1 });
  const w = new THREE.Mesh(g.wheel, m);
  w.position.set(x, y, z);
  parent.add(w);
  return w;
}

export type PlayerCar = {
  group: THREE.Group;
  body: THREE.Group; // rolls/pitches
  wheels: THREE.Mesh[];
  flames: THREE.Group;
};

export function buildPlayerCar(color = 0x0ea5b7): PlayerCar {
  const g = geo();
  const group = new THREE.Group();

  // ground shadow (kept level)
  const shadow = new THREE.Mesh(g.shadow, shadowMat());
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(CAR_WIDTH * 0.72, CAR_LENGTH * 0.62, 1);
  shadow.position.y = 0.03;
  group.add(shadow);

  const body = new THREE.Group();
  group.add(body);

  const bodyMat = mat(color, { roughness: 0.35, metalness: 0.55 });
  const darkMat = mat(0x11131c, { roughness: 0.6, metalness: 0.4 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0b1020,
    emissive: 0x1ec8ff,
    emissiveIntensity: 0.35,
    roughness: 0.15,
    metalness: 0.6,
  });

  // main chassis
  const chassis = new THREE.Mesh(g.box, bodyMat);
  chassis.scale.set(CAR_WIDTH, 0.55, CAR_LENGTH);
  chassis.position.y = 0.62;
  body.add(chassis);

  // nose wedge (front = -z)
  const nose = new THREE.Mesh(g.box, bodyMat);
  nose.scale.set(CAR_WIDTH * 0.9, 0.34, 1.5);
  nose.position.set(0, 0.5, -CAR_LENGTH / 2 - 0.3);
  body.add(nose);

  // side skirts / neon trim
  const trimL = new THREE.Mesh(g.box, neon(0x22d3ee, 2.6));
  trimL.scale.set(0.08, 0.1, CAR_LENGTH * 0.8);
  trimL.position.set(-CAR_WIDTH / 2 - 0.02, 0.5, 0);
  body.add(trimL);
  const trimR = trimL.clone();
  trimR.position.x = CAR_WIDTH / 2 + 0.02;
  body.add(trimR);

  // cabin / canopy
  const cabin = new THREE.Mesh(g.box, glassMat);
  cabin.scale.set(CAR_WIDTH * 0.78, 0.5, 2.0);
  cabin.position.set(0, 1.05, 0.15);
  body.add(cabin);

  // roof accent
  const roof = new THREE.Mesh(g.box, darkMat);
  roof.scale.set(CAR_WIDTH * 0.5, 0.06, 1.2);
  roof.position.set(0, 1.32, 0.2);
  body.add(roof);

  // rear spoiler
  const spoiler = new THREE.Mesh(g.box, darkMat);
  spoiler.scale.set(CAR_WIDTH * 0.95, 0.08, 0.5);
  spoiler.position.set(0, 1.15, CAR_LENGTH / 2 - 0.1);
  body.add(spoiler);
  const supL = new THREE.Mesh(g.box, darkMat);
  supL.scale.set(0.1, 0.3, 0.2);
  supL.position.set(-CAR_WIDTH / 2 + 0.25, 0.98, CAR_LENGTH / 2 - 0.15);
  body.add(supL);
  const supR = supL.clone();
  supR.position.x = CAR_WIDTH / 2 - 0.25;
  body.add(supR);

  // headlights (front)
  const hlMat = neon(0xfff6d5, 3.0);
  const hlL = new THREE.Mesh(g.box, hlMat);
  hlL.scale.set(0.5, 0.14, 0.1);
  hlL.position.set(-CAR_WIDTH / 2 + 0.45, 0.62, -CAR_LENGTH / 2 - 0.95);
  body.add(hlL);
  const hlR = hlL.clone();
  hlR.position.x = CAR_WIDTH / 2 - 0.45;
  body.add(hlR);

  // taillight bar (rear)
  const tl = new THREE.Mesh(g.box, neon(0xff2244, 2.4));
  tl.scale.set(CAR_WIDTH * 0.8, 0.12, 0.08);
  tl.position.set(0, 0.78, CAR_LENGTH / 2 + 0.02);
  body.add(tl);

  // wheels
  const wheels: THREE.Mesh[] = [];
  const wy = 0.42;
  const wx = CAR_WIDTH / 2 - 0.12;
  const wz = CAR_LENGTH / 2 - 0.85;
  wheels.push(addWheel(body, -wx, wy, -wz));
  wheels.push(addWheel(body, wx, wy, -wz));
  wheels.push(addWheel(body, -wx, wy, wz));
  wheels.push(addWheel(body, wx, wy, wz));

  // underglow
  const glow = new THREE.Mesh(
    g.shadow,
    new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.scale.set(CAR_WIDTH * 1.1, CAR_LENGTH * 1.05, 1);
  glow.position.y = 0.06;
  body.add(glow);

  // boost flames (hidden until boosting)
  const flames = new THREE.Group();
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x66e6ff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (const sx of [-0.5, 0.5]) {
    const f = new THREE.Mesh(g.flame, flameMat);
    f.position.set(sx, 0.6, CAR_LENGTH / 2 + 0.6);
    f.rotation.x = -Math.PI / 2;
    flames.add(f);
  }
  flames.visible = false;
  group.add(flames);

  return { group, body, wheels, flames };
}

export type TrafficCar = {
  group: THREE.Group;
  wheels: THREE.Mesh[];
};

export function buildTrafficCar(color: number, isTruck = false): TrafficCar {
  const g = geo();
  const group = new THREE.Group();

  const shadow = new THREE.Mesh(g.shadow, shadowMat());
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(CAR_WIDTH * 0.72, CAR_LENGTH * 0.62, 1);
  shadow.position.y = 0.03;
  group.add(shadow);

  const bodyMat = mat(color, { roughness: 0.45, metalness: 0.4 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0a0f1c,
    emissive: 0x22334f,
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.5,
  });

  const len = isTruck ? CAR_LENGTH * 1.7 : CAR_LENGTH;
  const wid = isTruck ? CAR_WIDTH * 1.15 : CAR_WIDTH;
  const hgt = isTruck ? 1.5 : 0.62;

  const chassis = new THREE.Mesh(g.box, bodyMat);
  chassis.scale.set(wid, hgt, len);
  chassis.position.y = isTruck ? 1.1 : 0.62;
  group.add(chassis);

  const cabin = new THREE.Mesh(g.box, isTruck ? bodyMat : glassMat);
  cabin.scale.set(wid * 0.82, isTruck ? 0.9 : 0.5, isTruck ? 1.4 : 2.0);
  cabin.position.set(0, (isTruck ? 1.1 : 0.62) + (isTruck ? 1.05 : 0.45), isTruck ? len / 2 - 1.0 : 0.15);
  group.add(cabin);

  // taillights face the player (rear = +z)
  const tlMat = neon(0xff1f3d, 2.2);
  for (const sx of [-wid / 2 + 0.35, wid / 2 - 0.35]) {
    const tl = new THREE.Mesh(g.box, tlMat);
    tl.scale.set(0.45, 0.16, 0.08);
    tl.position.set(sx, isTruck ? 0.8 : 0.72, len / 2 + 0.02);
    group.add(tl);
  }

  const wheels: THREE.Mesh[] = [];
  const wy = 0.42;
  const wx = wid / 2 - 0.12;
  const wzs = isTruck ? [len / 2 - 1.0, -len / 2 + 1.0] : [len / 2 - 0.85, -len / 2 + 0.85];
  for (const z of wzs) {
    wheels.push(addWheel(group, -wx, wy, z));
    wheels.push(addWheel(group, wx, wy, z));
  }

  return { group, wheels };
}
