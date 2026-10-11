import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

import {
  LANE_COUNT,
  LANE_WIDTH,
  ROAD_WIDTH,
  ROAD_HALF,
  CAR_WIDTH,
  CAR_LENGTH,
  CAMERA_OFFSET,
  LOOK_AHEAD,
  FOV_BASE,
  FOV_BOOST,
  SPAWN_Z,
  TRAFFIC_SPAWN_Z,
  DESPAWN_Z,
  SPEED_START,
  SPEED_MAX,
  SPEED_GROWTH,
  SPEED_TO_KMH,
  NITRO_MAX,
  NITRO_DRAIN,
  NITRO_PICKUP,
  NITRO_PASSIVE,
  BOOST_MULT,
  LATERAL_MAX,
  LATERAL_ACCEL,
  TOUCH_RESPONSIVENESS,
  X_LIMIT,
  HEALTH_MAX,
  HEALTH_HIT,
  HEALTH_SCRAPE,
  INVULN_TIME,
  SCORE_PER_UNIT,
  NEAR_MISS_BASE,
  PICKUP_SCORE,
  COMBO_WINDOW,
  COMBO_CAP,
  TRAFFIC_SPAWN_START,
  TRAFFIC_SPAWN_MIN,
  PICKUP_SPAWN,
  COLORS,
  TRAFFIC_COLORS,
} from "./constants";
import { clamp, lerp, damp, moveToward, rand, randInt, pick, chance, formatScore } from "./utils";
import {
  createRoadTexture,
  createGroundTexture,
  createBuildingTexture,
  createGlowTexture,
} from "./textures";
import { Particles } from "./Particles";
import { buildPlayerCar, buildTrafficCar, type PlayerCar, type TrafficCar } from "./CarFactory";
import { GameAudio } from "./audio";

export type Phase = "menu" | "running" | "paused" | "over";
export type GameResult = {
  score: number;
  distance: number;
  topSpeed: number;
  bestCombo: number;
};

export type HudRefs = {
  score?: HTMLElement | null;
  speed?: HTMLElement | null;
  speedFill?: HTMLElement | null;
  nitroFill?: HTMLElement | null;
  nitroWrap?: HTMLElement | null;
  healthFill?: HTMLElement | null;
  healthWrap?: HTMLElement | null;
  combo?: HTMLElement | null;
  multiplier?: HTMLElement | null;
  distance?: HTMLElement | null;
  popupLayer?: HTMLElement | null;
  boostOverlay?: HTMLElement | null;
  damageFlash?: HTMLElement | null;
};

export type EngineCallbacks = {
  onGameOver: (r: GameResult) => void;
  onPhaseChange: (p: Phase) => void;
};

type Traffic = {
  car: TrafficCar;
  active: boolean;
  x: number;
  z: number;
  prevZ: number;
  speedFrac: number;
  hw: number;
  hl: number;
  resolved: boolean;
  truck: boolean;
};

type Pickup = {
  obj: THREE.Object3D;
  active: boolean;
  x: number;
  z: number;
  spin: number;
};

type Scroller = { obj: THREE.Object3D };

const laneX = (i: number) => (i - (LANE_COUNT - 1) / 2) * LANE_WIDTH;

export class GameEngine {
  private container: HTMLElement;
  private cb: EngineCallbacks;
  hud: HudRefs = {};
  audio = new GameAudio();

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private qualityHigh: boolean;

  private clock = new THREE.Clock();
  private rafId = 0;
  private disposed = false;

  private roadTex!: THREE.Texture;
  private groundTex!: THREE.Texture;
  private glowTex!: THREE.Texture;
  private sky!: THREE.Mesh;
  private buildings: Scroller[] = [];
  private poles: Scroller[] = [];
  private arches: Scroller[] = [];
  private buildingMats: THREE.MeshStandardMaterial[] = [];

  private player!: PlayerCar;
  private traffic: Traffic[] = [];
  private pickups: Pickup[] = [];
  private particles!: Particles;

  private keys = { left: false, right: false, nitro: false };
  private touchActive = false;
  private touchStartX = 0;
  private touchStartPX = 0;
  private touchNitro = false;
  private useTarget = false;
  private targetX = 0;
  private dragScale = 0.05;

  phase: Phase = "menu";
  private S = this.freshState();
  private menuTime = 0;
  private overTimer = 0;

  private tmpV = new THREE.Vector3();
  private shakeMag = 0;
  private scrapeCd = 0;
  private spawnTimer = 0;
  private pickupTimer = 0;
  private moteAcc = 0;
  private camX = 0;
  private fovCur = FOV_BASE;
  private frameAcc = 0;
  private frameCount = 0;
  private downgraded = false;

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks) {
    this.container = canvas.parentElement!;
    this.cb = cb;

    const isCoarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    const small = Math.min(window.innerWidth, window.innerHeight) < 760;
    this.qualityHigh = !isCoarse && !small;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.qualityHigh,
      powerPreference: "high-performance",
    });
    const pr = Math.min(window.devicePixelRatio || 1, this.qualityHigh ? 2 : 1.6);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x1a0f36, 60, 235);

    this.camera = new THREE.PerspectiveCamera(FOV_BASE, this.container.clientWidth / this.container.clientHeight, 0.5, 2000);
    this.camera.position.set(0, CAMERA_OFFSET.y, CAMERA_OFFSET.z);

    this.dragScale = ROAD_WIDTH / (this.container.clientWidth * 0.6);

    this.buildSky();
    this.buildLights();
    this.buildWorld();
    this.buildPools();
    this.particles = new Particles(this.qualityHigh ? 620 : 360, this.glowTex);
    this.scene.add(this.particles.points);
    this.player = buildPlayerCar(0x0ea5b7);
    this.scene.add(this.player.group);

    this.setupComposer();
    this.bindInput();
    this.resize();

    this.clock.start();
    this.loop();
  }

  // ---------------------------------------------------------------- state
  private freshState() {
    return {
      elapsed: 0,
      distance: 0,
      score: 0,
      baseSpeed: SPEED_START,
      speed: SPEED_START,
      penalty: 0,
      playerX: 0,
      playerVX: 0,
      bank: 0,
      pitch: 0,
      health: HEALTH_MAX,
      invuln: 0,
      nitro: 40,
      boosting: false,
      boostVis: 0,
      combo: 0,
      bestCombo: 0,
      comboTimer: 0,
      topSpeed: 0,
    };
  }

  private resetRun() {
    this.S = this.freshState();
    this.shakeMag = 0;
    this.scrapeCd = 0;
    this.spawnTimer = 0.4;
    this.pickupTimer = 0.9;
    this.moteAcc = 0;
    this.camX = 0;
    this.fovCur = FOV_BASE;
    this.useTarget = false;
    for (const t of this.traffic) {
      t.active = false;
      t.car.group.visible = false;
    }
    for (const p of this.pickups) {
      p.active = false;
      p.obj.visible = false;
    }
    this.particles.reset();
    this.player.group.position.set(0, 0, 0);
    this.player.group.rotation.set(0, 0, 0);
    this.player.body.rotation.set(0, 0, 0);
    this.player.flames.visible = false;
    this.player.group.visible = true;
  }

  // ---------------------------------------------------------------- build
  private buildSky() {
    const geo = new THREE.SphereGeometry(900, 24, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x07041c) },
        midColor: { value: new THREE.Color(0x2a1152) },
        botColor: { value: new THREE.Color(0x1a0f36) },
        sunColor: { value: new THREE.Color(0xffb066) },
        sunDir: { value: new THREE.Vector3(0.15, 0.1, -1).normalize() },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 topColor, midColor, botColor, sunColor, sunDir;
        varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          float h = clamp(d.y*0.5+0.5, 0.0, 1.0);
          vec3 col = mix(botColor, midColor, smoothstep(0.5, 0.63, h));
          col = mix(col, topColor, smoothstep(0.63, 1.0, h));
          float s = max(dot(d, normalize(sunDir)), 0.0);
          col += sunColor * pow(s, 1200.0) * 2.2;
          col += sunColor * pow(s, 14.0) * 0.30;
          float band = exp(-abs(d.y)*7.0);
          col += vec3(1.0,0.42,0.35) * band * 0.14;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
  }

  private buildLights() {
    const hemi = new THREE.HemisphereLight(0x8b6cff, 0x1a1030, 0.85);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffd0a0, 1.15);
    dir.position.set(-40, 60, -120);
    this.scene.add(dir);
    const rim = new THREE.DirectionalLight(0x66e0ff, 0.5);
    rim.position.set(50, 20, 60);
    this.scene.add(rim);
  }

  private buildWorld() {
    this.roadTex = createRoadTexture();
    this.groundTex = createGroundTexture();
    this.glowTex = createGlowTexture();

    const roadLen = 460;
    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, roadLen);
    this.roadTex.repeat.set(1, roadLen / 16);
    const roadMat = new THREE.MeshStandardMaterial({ map: this.roadTex, roughness: 0.85, metalness: 0.1 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -200);
    this.scene.add(road);

    const groundGeo = new THREE.PlaneGeometry(600, 1200);
    this.groundTex.repeat.set(100, 200);
    const groundMat = new THREE.MeshStandardMaterial({ map: this.groundTex, roughness: 1, metalness: 0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.08, -500);
    this.scene.add(ground);

    const railGeo = new THREE.BoxGeometry(0.4, 0.55, roadLen);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x1a1830, roughness: 0.7, metalness: 0.4 });
    const railNeonGeo = new THREE.BoxGeometry(0.5, 0.09, roadLen);
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(side * (ROAD_HALF + 0.25), 0.55, -200);
      this.scene.add(rail);
      const neon = new THREE.Mesh(
        railNeonGeo,
        new THREE.MeshStandardMaterial({ color: 0x000000, emissive: side < 0 ? COLORS.cyan : COLORS.magenta, emissiveIntensity: 2.4, roughness: 1 })
      );
      neon.position.set(side * (ROAD_HALF + 0.25), 0.86, -200);
      this.scene.add(neon);
    }

    const bTex = createBuildingTexture();
    const tints = [0xffffff, 0xbfd4ff, 0xffc4e6];
    for (const t of tints) {
      this.buildingMats.push(
        new THREE.MeshStandardMaterial({
          map: bTex,
          emissive: 0xffffff,
          emissiveMap: bTex,
          emissiveIntensity: 1.15,
          color: t,
          roughness: 0.9,
          metalness: 0.0,
        })
      );
    }
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);

    const bCount = this.qualityHigh ? 30 : 18;
    for (let i = 0; i < bCount; i++) {
      const m = new THREE.Mesh(boxGeo, pick(this.buildingMats));
      this.scene.add(m);
      this.buildings.push({ obj: m });
      this.randomizeBuilding(m, DESPAWN_Z - 6 - i * 11);
    }

    const poleGeo = new THREE.BoxGeometry(0.18, 7, 0.18);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x14122a, roughness: 0.8, metalness: 0.3 });
    const headGeo = new THREE.BoxGeometry(0.5, 0.2, 1.4);
    const headMatL = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: COLORS.cyan, emissiveIntensity: 2.6, roughness: 1 });
    const headMatR = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: COLORS.magenta, emissiveIntensity: 2.6, roughness: 1 });
    const pCount = this.qualityHigh ? 22 : 14;
    for (let i = 0; i < pCount; i++) {
      const g = new THREE.Group();
      const side = i % 2 === 0 ? -1 : 1;
      const post = new THREE.Mesh(poleGeo, poleMat);
      post.position.y = 3.5;
      g.add(post);
      const head = new THREE.Mesh(headGeo, side < 0 ? headMatL : headMatR);
      head.position.set(side * -0.6, 6.9, 0);
      g.add(head);
      g.position.x = side * (ROAD_HALF + 1.1);
      this.scene.add(g);
      this.poles.push({ obj: g });
      g.position.z = DESPAWN_Z - 6 - i * 14;
    }

    const aCount = 3;
    const archColors = [COLORS.cyan, COLORS.magenta, COLORS.purple];
    for (let i = 0; i < aCount; i++) {
      const g = new THREE.Group();
      const col = archColors[i % archColors.length];
      const pillarGeo = new THREE.BoxGeometry(0.5, 9, 0.5);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x16132c, roughness: 0.7, metalness: 0.4 });
      for (const side of [-1, 1]) {
        const p = new THREE.Mesh(pillarGeo, pillarMat);
        p.position.set(side * (ROAD_HALF + 0.6), 4.5, 0);
        g.add(p);
      }
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(ROAD_WIDTH + 2.4, 0.6, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x000000, emissive: col, emissiveIntensity: 2.2, roughness: 1 })
      );
      beam.position.y = 9;
      g.add(beam);
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(ROAD_WIDTH + 2.0, 0.12, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 2.6, roughness: 1 })
      );
      strip.position.y = 8.5;
      g.add(strip);
      this.scene.add(g);
      this.arches.push({ obj: g });
      g.position.z = DESPAWN_Z - 6 - i * 130;
    }
  }

  private randomizeBuilding(m: THREE.Mesh, z: number) {
    const side = chance(0.5) ? -1 : 1;
    const w = rand(4, 9);
    const h = rand(9, 44);
    const d = rand(4, 9);
    m.scale.set(w, h, d);
    m.position.set(side * (ROAD_HALF + rand(5, 34)), h / 2, z);
    m.material = pick(this.buildingMats);
  }

  private buildPools() {
    const tCount = this.qualityHigh ? 22 : 15;
    for (let i = 0; i < tCount; i++) {
      const truck = chance(0.2);
      const car = buildTrafficCar(pick(TRAFFIC_COLORS), truck);
      car.group.visible = false;
      this.scene.add(car.group);
      const hl = truck ? CAR_LENGTH * 0.85 : CAR_LENGTH / 2;
      const hw = truck ? CAR_WIDTH * 0.575 : CAR_WIDTH / 2;
      this.traffic.push({ car, active: false, x: 0, z: 0, prevZ: 0, speedFrac: 0.6, hw, hl, resolved: false, truck });
    }

    const pCount = 8;
    for (let i = 0; i < pCount; i++) {
      const g = new THREE.Group();
      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.7, 0),
        new THREE.MeshStandardMaterial({ color: 0x001018, emissive: COLORS.lime, emissiveIntensity: 2.4, roughness: 1 })
      );
      g.add(core);
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: this.glowTex, color: COLORS.lime, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      halo.scale.set(3.2, 3.2, 1);
      g.add(halo);
      g.visible = false;
      this.scene.add(g);
      this.pickups.push({ obj: g, active: false, x: 0, z: 0, spin: rand(0, 6) });
    }
  }

  private setupComposer() {
    if (!this.qualityHigh) return;
    try {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      const composer = new EffectComposer(this.renderer);
      composer.addPass(new RenderPass(this.scene, this.camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.62, 0.6, 0.55);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
      composer.setSize(w, h);
      this.composer = composer;
      this.bloom = bloom;
    } catch {
      this.composer = null;
      this.bloom = null;
    }
  }

  // ---------------------------------------------------------------- input
  private bindInput() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("resize", this.resize);
    window.addEventListener("blur", this.onBlur);
  }

  private onBlur = () => {
    this.keys.left = this.keys.right = this.keys.nitro = false;
    this.touchNitro = false;
    if (this.phase === "running") this.setPaused(true);
  };

  private onKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case "ArrowLeft":
      case "KeyA":
        this.keys.left = true;
        this.useTarget = false;
        break;
      case "ArrowRight":
      case "KeyD":
        this.keys.right = true;
        this.useTarget = false;
        break;
      case "ArrowUp":
      case "KeyW":
      case "Space":
      case "ShiftLeft":
      case "ShiftRight":
        this.keys.nitro = true;
        break;
    }
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case "ArrowLeft":
      case "KeyA":
        this.keys.left = false;
        break;
      case "ArrowRight":
      case "KeyD":
        this.keys.right = false;
        break;
      case "ArrowUp":
      case "KeyW":
      case "Space":
      case "ShiftLeft":
      case "ShiftRight":
        this.keys.nitro = false;
        break;
    }
  };

  steerStart(clientX: number) {
    this.touchActive = true;
    this.touchStartX = clientX;
    this.touchStartPX = this.S.playerX;
    this.useTarget = true;
    this.targetX = this.S.playerX;
  }
  steerMove(clientX: number) {
    if (!this.touchActive) return;
    this.targetX = clamp(this.touchStartPX + (clientX - this.touchStartX) * this.dragScale, -X_LIMIT, X_LIMIT);
  }
  steerEnd() {
    this.touchActive = false;
    this.useTarget = false;
  }
  setTouchNitro(v: boolean) {
    this.touchNitro = v;
  }

  // ---------------------------------------------------------------- control
  start() {
    this.resetRun();
    this.phase = "running";
    this.cb.onPhaseChange("running");
  }
  restart() {
    this.start();
  }
  toMenu() {
    this.resetRun();
    this.phase = "menu";
    this.cb.onPhaseChange("menu");
  }
  setPaused(p: boolean) {
    if (this.phase === "running" && p) {
      this.phase = "paused";
      this.keys.nitro = false;
      this.touchNitro = false;
      this.audio.stopAll();
      this.cb.onPhaseChange("paused");
    } else if (this.phase === "paused" && !p) {
      this.phase = "running";
      this.cb.onPhaseChange("running");
    }
  }
  togglePause() {
    if (this.phase === "running") this.setPaused(true);
    else if (this.phase === "paused") this.setPaused(false);
  }
  getPhase() {
    return this.phase;
  }
  setMuted(m: boolean) {
    this.audio.setMuted(m);
  }

  // ---------------------------------------------------------------- loop
  private loop = () => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 1 / 30);
    this.trackPerf(dt);
    this.update(dt);
    this.render();
  };

  private trackPerf(dt: number) {
    this.frameAcc += dt;
    this.frameCount++;
    if (this.frameCount >= 110) {
      const avg = this.frameAcc / this.frameCount;
      if (!this.downgraded && avg > 1 / 42) this.downgrade();
      this.frameAcc = 0;
      this.frameCount = 0;
    }
  }

  private downgrade() {
    this.downgraded = true;
    this.qualityHigh = false;
    this.renderer.setPixelRatio(1);
    this.composer = null;
    this.bloom = null;
    this.resize();
  }

  private update(dt: number) {
    switch (this.phase) {
      case "menu":
        this.updateMenu(dt);
        break;
      case "running":
        this.updateRunning(dt);
        break;
      case "paused":
        break;
      case "over":
        this.updateOver(dt);
        break;
    }
    this.particles.update(dt);
    this.updateCamera(dt);
    this.sky.position.set(this.camera.position.x, 0, 0);
  }

  private updateMenu(dt: number) {
    this.menuTime += dt;
    const speed = 24;
    this.S.speed = speed;
    this.S.distance += speed * dt;
    this.moveScenery(dt, speed);
    this.emitMotes(dt, 0.16);
    this.player.group.position.set(Math.sin(this.menuTime * 0.4) * 2.2, 0, 0);
    this.player.body.position.y = Math.sin(this.menuTime * 2) * 0.02;
    this.player.body.rotation.z = Math.sin(this.menuTime * 0.4) * 0.03;
    this.camera.position.set(Math.sin(this.menuTime * 0.25) * 3.2, CAMERA_OFFSET.y + Math.sin(this.menuTime * 0.5) * 0.4, CAMERA_OFFSET.z);
    this.camera.lookAt(0, 1.6, LOOK_AHEAD);
  }

  private updateOver(dt: number) {
    this.overTimer += dt;
    this.S.speed = damp(this.S.speed, 0, 3.2, dt);
    this.S.distance += this.S.speed * dt;
    this.moveScenery(dt, this.S.speed);
    this.S.playerVX = damp(this.S.playerVX, 0, 6, dt);
    this.S.playerX = clamp(this.S.playerX + this.S.playerVX * dt, -X_LIMIT, X_LIMIT);
    this.player.group.position.x = this.S.playerX;
    this.player.body.rotation.z = damp(this.player.body.rotation.z, 0.25, 4, dt);
    if (chance(0.6)) this.emitSmoke(this.S.playerX, 0.7, 2.2);
    const ov = this.hud.boostOverlay;
    if (ov) ov.style.opacity = "0";
  }

  // ---------------------------------------------------------------- running
  private updateRunning(dt: number) {
    const S = this.S;
    S.elapsed += dt;
    const diff = clamp(S.elapsed / 70, 0, 1);

    S.baseSpeed = Math.min(SPEED_MAX, SPEED_START + S.elapsed * SPEED_GROWTH + S.distance * 0.004);
    S.penalty = Math.max(0, S.penalty - 40 * dt);

    const wantBoost = (this.keys.nitro || this.touchNitro) && S.nitro > 0 && S.invuln <= 0;
    if (wantBoost) {
      S.boosting = true;
      S.nitro = Math.max(0, S.nitro - NITRO_DRAIN * dt);
      if (S.nitro <= 0) S.boosting = false;
    } else {
      S.boosting = false;
      S.nitro = Math.min(NITRO_MAX, S.nitro + NITRO_PASSIVE * dt);
    }
    S.boostVis = damp(S.boostVis, S.boosting ? 1 : 0, 8, dt);

    const eff = Math.max(12, S.baseSpeed - S.penalty) * (S.boosting ? BOOST_MULT : 1);
    S.speed = eff;
    S.topSpeed = Math.max(S.topSpeed, eff);
    S.distance += eff * dt;

    const mult = this.multiplier();
    S.score += eff * SCORE_PER_UNIT * mult * dt * (S.boosting ? 1.3 : 1);

    if (S.combo > 0) {
      S.comboTimer -= dt;
      if (S.comboTimer <= 0) S.combo = 0;
    }
    S.invuln = Math.max(0, S.invuln - dt);
    this.scrapeCd = Math.max(0, this.scrapeCd - dt);

    this.audio.setEngine(clamp((eff - 20) / (SPEED_MAX * BOOST_MULT - 20), 0, 1), S.boosting ? 1 : 0);

    this.updatePlayer(dt);
    this.moveScenery(dt, eff);
    this.updateTraffic(dt, diff);
    this.updatePickups(dt);
    this.emitMotes(dt, clamp((eff - 40) / 130, 0, 1));
    if (S.boosting) this.emitBoostTrail(dt);
    if (Math.abs(S.playerVX) > 12) this.emitTireSmoke(dt);

    this.updateHud();
  }

  private multiplier() {
    return 1 + Math.min(this.S.combo, COMBO_CAP) * 0.1;
  }

  private updatePlayer(dt: number) {
    const S = this.S;
    const steer = (this.keys.left ? -1 : 0) + (this.keys.right ? 1 : 0);
    let desired = steer * LATERAL_MAX;
    if (this.useTarget) {
      desired = clamp((this.targetX - S.playerX) * TOUCH_RESPONSIVENESS, -LATERAL_MAX, LATERAL_MAX);
    }
    S.playerVX = moveToward(S.playerVX, desired, LATERAL_ACCEL * dt);
    S.playerX += S.playerVX * dt;

    if (S.playerX < -X_LIMIT || S.playerX > X_LIMIT) {
      S.playerX = clamp(S.playerX, -X_LIMIT, X_LIMIT);
      const pushing = (S.playerX <= -X_LIMIT && steer < 0) || (S.playerX >= X_LIMIT && steer > 0) || this.useTarget;
      if (pushing && this.scrapeCd <= 0 && S.invuln <= 0) this.applyScrape();
      S.playerVX *= 0.3;
    }

    const targetBank = clamp(-S.playerVX / LATERAL_MAX, -1, 1) * 0.28;
    S.bank = damp(S.bank, targetBank, 10, dt);
    const targetPitch = S.boosting ? -0.05 : clamp((S.baseSpeed - SPEED_START) / 200, 0, 0.03);
    S.pitch = damp(S.pitch, targetPitch, 6, dt);

    this.player.group.position.x = S.playerX;
    this.player.body.rotation.z = S.bank;
    this.player.body.rotation.x = S.pitch;
    this.player.body.position.y = Math.sin(S.elapsed * 30) * 0.012;
    this.player.group.rotation.y = damp(this.player.group.rotation.y, clamp(S.playerVX / LATERAL_MAX, -1, 1) * 0.12, 10, dt);

    const spin = S.speed * dt * 2.2;
    for (const w of this.player.wheels) w.rotation.x -= spin;
    this.player.flames.visible = S.boosting;
    if (S.boosting) {
      const s = 0.9 + Math.random() * 0.5;
      this.player.flames.scale.set(s, s, s * 1.4);
    }

    this.player.group.visible = S.invuln <= 0 || Math.floor(S.elapsed * 20) % 2 === 0;
  }

  // ---------------------------------------------------------------- scenery
  private moveScenery(dt: number, speed: number) {
    const dz = speed * dt;
    const d = this.S.distance;
    this.roadTex.offset.y = d / 16;
    this.groundTex.offset.y = d / 6;

    const wrap = (s: Scroller, range: number, onWrap: () => void) => {
      s.obj.position.z += dz;
      if (s.obj.position.z > DESPAWN_Z) {
        s.obj.position.z -= range;
        onWrap();
      }
    };

    for (const b of this.buildings) wrap(b, 11 * this.buildings.length, () => this.randomizeBuilding(b.obj as THREE.Mesh, b.obj.position.z));
    for (const p of this.poles) wrap(p, 14 * this.poles.length, () => {});
    for (const a of this.arches) wrap(a, 130 * this.arches.length, () => {});
  }

  // ---------------------------------------------------------------- traffic
  private updateTraffic(dt: number, diff: number) {
    const S = this.S;
    this.spawnTimer -= dt;
    const interval = lerp(TRAFFIC_SPAWN_START, TRAFFIC_SPAWN_MIN, diff);
    if (this.spawnTimer <= 0) {
      this.spawnTimer = interval * rand(0.8, 1.2);
      this.spawnWave(diff);
    }

    for (const t of this.traffic) {
      if (!t.active) continue;
      t.prevZ = t.z;
      const closing = Math.max(8, S.speed - S.speed * t.speedFrac);
      t.z += closing * dt;
      t.car.group.position.set(t.x, 0, t.z);

      const zOverlap = Math.abs(t.z) < (CAR_LENGTH / 2 + t.hl) * 0.8;
      const xOverlap = Math.abs(t.x - S.playerX) < (CAR_WIDTH / 2 + t.hw) * 0.8;
      if (zOverlap && xOverlap && !t.resolved && S.invuln <= 0) {
        t.resolved = true;
        this.applyHit(t);
      }

      if (!t.resolved && t.prevZ < 0 && t.z >= 0) {
        t.resolved = true;
        const dx = Math.abs(t.x - S.playerX);
        const near = CAR_WIDTH / 2 + t.hw + 0.95;
        if (dx < near) this.applyNearMiss(t, dx);
      }

      if (t.z > DESPAWN_Z) {
        t.active = false;
        t.car.group.visible = false;
      }
    }
  }

  private spawnWave(diff: number) {
    const maxCars = 1 + Math.floor(diff * 2);
    const count = randInt(1, maxCars);
    const lanes: number[] = [];
    while (lanes.length < count) {
      const l = randInt(0, LANE_COUNT - 1);
      if (!lanes.includes(l)) lanes.push(l);
    }
    for (const l of lanes) {
      const t = this.traffic.find((x) => !x.active);
      if (!t) return;
      t.active = true;
      t.resolved = false;
      t.x = laneX(l) + rand(-0.25, 0.25);
      t.z = TRAFFIC_SPAWN_Z - rand(0, 20);
      t.speedFrac = clamp((t.truck ? 0.3 : lerp(0.36, 0.74, diff)) + rand(-0.05, 0.05), 0.24, 0.85);
      t.car.group.visible = true;
      t.car.group.position.set(t.x, 0, t.z);
    }
  }

  private applyHit(t: Traffic) {
    const S = this.S;
    if (S.invuln > 0) return;
    S.health -= HEALTH_HIT;
    S.invuln = INVULN_TIME;
    S.penalty += 40;
    S.boosting = false;
    S.combo = 0;
    S.comboTimer = 0;
    this.shakeMag = Math.min(1.6, this.shakeMag + 1.3);
    this.audio.playCollision();
    this.emitSparks(t.x, 0.8, t.z, 26);
    this.flashDamage();
    if (S.health <= 0) {
      S.health = 0;
      this.gameOver();
    }
  }

  private applyScrape() {
    const S = this.S;
    S.health -= HEALTH_SCRAPE;
    S.penalty += 10;
    this.scrapeCd = 0.35;
    this.shakeMag = Math.min(1, this.shakeMag + 0.4);
    this.audio.playScrape();
    const side = Math.sign(S.playerX);
    this.emitSparks(side * (ROAD_HALF - 0.4), 0.6, 0, 8);
    if (S.health <= 0) {
      S.health = 0;
      this.gameOver();
    }
  }

  private applyNearMiss(t: Traffic, dx: number) {
    const S = this.S;
    S.combo += 1;
    S.bestCombo = Math.max(S.bestCombo, S.combo);
    S.comboTimer = COMBO_WINDOW;
    const pts = Math.floor(NEAR_MISS_BASE * this.multiplier() * (dx < 1.2 ? 1.5 : 1));
    S.score += pts;
    this.audio.playNearMiss();
    this.shakeMag = Math.min(0.9, this.shakeMag + 0.18);
    this.emitStreaks(t.x, 0.9, 10);
    this.spawnPopup(t.x, 1.4, t.z + 1, `+${pts}`, "pop-cyan");
    this.pulseCombo();
  }

  // ---------------------------------------------------------------- pickups
  private updatePickups(dt: number) {
    const S = this.S;
    this.pickupTimer -= dt;
    if (this.pickupTimer <= 0) {
      this.pickupTimer = PICKUP_SPAWN * rand(0.7, 1.3);
      this.spawnPickup();
    }
    for (const p of this.pickups) {
      if (!p.active) continue;
      p.z += S.speed * dt;
      p.spin += dt * 3;
      p.obj.position.set(p.x, 1.1 + Math.sin(p.spin) * 0.15, p.z);
      p.obj.rotation.y = p.spin;
      p.obj.rotation.x = p.spin * 0.6;

      if (Math.abs(p.z) < 2.2 && Math.abs(p.x - S.playerX) < CAR_WIDTH / 2 + 0.9) {
        p.active = false;
        p.obj.visible = false;
        S.nitro = Math.min(NITRO_MAX, S.nitro + NITRO_PICKUP);
        const pts = Math.floor(PICKUP_SCORE * this.multiplier());
        S.score += pts;
        this.audio.playPickup();
        this.emitPickupBurst(p.x, p.z);
        this.spawnPopup(p.x, 1.6, p.z, `+${pts}`, "pop-lime");
      }
      if (p.z > DESPAWN_Z) {
        p.active = false;
        p.obj.visible = false;
      }
    }
  }

  private spawnPickup() {
    const p = this.pickups.find((x) => !x.active);
    if (!p) return;
    p.active = true;
    p.x = laneX(randInt(0, LANE_COUNT - 1));
    p.z = SPAWN_Z - rand(0, 30);
    p.obj.visible = true;
    p.obj.position.set(p.x, 1.1, p.z);
  }

  // ---------------------------------------------------------------- particles
  private emitMotes(dt: number, intensity: number) {
    this.moteAcc += dt * (5 + intensity * 26);
    while (this.moteAcc >= 1) {
      this.moteAcc -= 1;
      const x = rand(-ROAD_HALF - 8, ROAD_HALF + 8);
      const y = rand(0.4, 9);
      const c = Math.random() < 0.5 ? 0x9be8ff : 0xffd6f0;
      this.particles.spawn({
        x, y, z: rand(SPAWN_Z, -60),
        vx: rand(-2, 2), vy: rand(-1, 1), vz: this.S.speed * rand(0.9, 1.3),
        size: rand(0.12, 0.3),
        color: new THREE.Color(c),
        life: rand(0.6, 1.4),
        drag: 0.2,
        shrink: 0,
      });
    }
  }

  private emitBoostTrail(dt: number) {
    const n = Math.random() < dt * 90 ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const sx = this.S.playerX + (Math.random() < 0.5 ? -0.5 : 0.5);
      this.particles.spawn({
        x: sx, y: 0.6, z: CAR_LENGTH / 2,
        vx: rand(-1.5, 1.5), vy: rand(0.5, 2), vz: this.S.speed * 0.4 + rand(4, 12),
        size: rand(0.4, 0.8),
        color: new THREE.Color(Math.random() < 0.5 ? 0x66e6ff : 0xffffff),
        life: rand(0.18, 0.34),
        shrink: 0,
      });
    }
  }

  private emitTireSmoke(dt: number) {
    if (Math.random() > dt * 40) return;
    const side = -Math.sign(this.S.playerVX);
    this.particles.spawn({
      x: this.S.playerX + side * 0.9, y: 0.25, z: rand(-1.5, 1.5),
      vx: side * rand(1, 4), vy: rand(0.5, 1.5), vz: this.S.speed * 0.3,
      size: rand(0.4, 0.9),
      color: new THREE.Color(0xbfd8ff),
      life: rand(0.3, 0.6),
      drag: 2,
      shrink: 1.4,
    });
  }

  private emitSparks(x: number, y: number, z: number, count: number) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(4, 16);
      this.particles.spawn({
        x, y, z,
        vx: Math.cos(a) * sp, vy: rand(2, 10), vz: Math.sin(a) * sp + this.S.speed * 0.2,
        size: rand(0.25, 0.6),
        color: new THREE.Color(Math.random() < 0.6 ? 0xffcf6b : 0xff7a3c),
        life: rand(0.3, 0.8),
        gravity: 22,
        drag: 1.2,
        shrink: 0,
      });
    }
  }

  private emitStreaks(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.spawn({
        x: x + rand(-1, 1), y: y + rand(-0.3, 0.6), z: rand(-2, 2),
        vx: rand(-3, 3), vy: rand(-1, 2), vz: this.S.speed * rand(0.6, 1.1),
        size: rand(0.2, 0.45),
        color: new THREE.Color(0x9be8ff),
        life: rand(0.2, 0.45),
        shrink: 0,
      });
    }
  }

  private emitPickupBurst(x: number, z: number) {
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      this.particles.spawn({
        x, y: 1.1, z,
        vx: Math.cos(a) * rand(2, 8), vy: rand(3, 11), vz: Math.sin(a) * rand(2, 8),
        size: rand(0.3, 0.7),
        color: new THREE.Color(Math.random() < 0.5 ? 0xa3e635 : 0xecfccb),
        life: rand(0.4, 0.9),
        gravity: 14,
        drag: 1,
        shrink: 0,
      });
    }
  }

  private emitSmoke(x: number, y: number, z: number) {
    this.particles.spawn({
      x: x + rand(-0.6, 0.6), y, z: z + rand(-0.5, 0.5),
      vx: rand(-2, 2), vy: rand(1, 3), vz: rand(2, 8),
      size: rand(0.7, 1.4),
      color: new THREE.Color(0x5a5a72),
      life: rand(0.6, 1.2),
      drag: 1.5,
      shrink: 1.6,
    });
  }

  // ---------------------------------------------------------------- camera
  private updateCamera(dt: number) {
    const S = this.S;
    const speedRatio = clamp((S.speed - 20) / (SPEED_MAX * BOOST_MULT - 20), 0, 1);
    const targetFov = FOV_BASE + (FOV_BOOST - FOV_BASE) * S.boostVis + speedRatio * 3;
    this.fovCur = damp(this.fovCur, targetFov, 7, dt);
    if (Math.abs(this.camera.fov - this.fovCur) > 0.01) {
      this.camera.fov = this.fovCur;
      this.camera.updateProjectionMatrix();
    }

    this.camX = damp(this.camX, S.playerX * 0.6, 9, dt);
    this.shakeMag = Math.max(0, this.shakeMag - dt * 2.2);
    const sh = this.shakeMag * this.shakeMag;

    const px = this.camX + rand(-1, 1) * sh * 1.4;
    const py = CAMERA_OFFSET.y + rand(-1, 1) * sh * 1.1 + S.boostVis * -0.4;
    const pz = CAMERA_OFFSET.z - S.boostVis * 0.8;
    this.camera.position.set(px, py, pz);

    this.tmpV.set(S.playerX * 0.55 + rand(-1, 1) * sh * 0.6, 1.5 + rand(-1, 1) * sh * 0.4, LOOK_AHEAD);
    this.camera.lookAt(this.tmpV);
    this.camera.rotation.z += clamp(-S.playerVX / LATERAL_MAX, -1, 1) * 0.03 + rand(-1, 1) * sh * 0.02;

    const ov = this.hud.boostOverlay;
    if (ov) {
      const o = clamp(speedRatio * 0.5 + S.boostVis * 0.6, 0, 0.85);
      ov.style.opacity = o.toFixed(3);
    }
  }

  // ---------------------------------------------------------------- hud
  private updateHud() {
    const S = this.S;
    const h = this.hud;
    if (h.score) h.score.textContent = formatScore(S.score);
    if (h.speed) h.speed.textContent = String(Math.round(S.speed * SPEED_TO_KMH));
    if (h.speedFill) h.speedFill.style.width = `${clamp((S.speed * SPEED_TO_KMH) / (SPEED_MAX * BOOST_MULT * SPEED_TO_KMH) * 100, 0, 100)}%`;
    if (h.nitroFill) h.nitroFill.style.width = `${(S.nitro / NITRO_MAX) * 100}%`;
    if (h.nitroWrap) h.nitroWrap.classList.toggle("boosting", S.boosting);
    if (h.healthFill) {
      const pct = (S.health / HEALTH_MAX) * 100;
      h.healthFill.style.width = `${pct}%`;
      h.healthFill.classList.toggle("low", pct <= 34);
    }
    if (h.distance) h.distance.textContent = `${Math.floor(S.distance)} m`;
    if (h.combo) {
      if (S.combo > 0) {
        h.combo.style.opacity = "1";
        const ct = `${S.combo}x`;
        if (h.combo.textContent !== ct) h.combo.textContent = ct;
      } else {
        h.combo.style.opacity = "0";
      }
    }
    const mult = this.multiplier();
    if (h.multiplier) {
      const txt = `x${mult.toFixed(1)}`;
      if (h.multiplier.textContent !== txt) h.multiplier.textContent = txt;
      h.multiplier.classList.toggle("hot", S.combo >= 5);
    }
  }

  private pulseCombo() {
    const el = this.hud.combo;
    if (!el) return;
    el.textContent = `${this.S.combo}x`;
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }

  private flashDamage() {
    const el = this.hud.damageFlash;
    if (!el) return;
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
  }

  private spawnPopup(x: number, y: number, z: number, text: string, cls: string) {
    const layer = this.hud.popupLayer;
    if (!layer) return;
    if (layer.childElementCount > 14) layer.removeChild(layer.firstChild!);
    this.tmpV.set(x, y, z).project(this.camera);
    const w = layer.clientWidth;
    const hgt = layer.clientHeight;
    const left = (this.tmpV.x * 0.5 + 0.5) * w;
    const top = (-this.tmpV.y * 0.5 + 0.5) * hgt;
    const el = document.createElement("div");
    el.className = `popup ${cls}`;
    el.textContent = text;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    layer.appendChild(el);
    window.setTimeout(() => el.remove(), 950);
  }

  // ---------------------------------------------------------------- over
  private gameOver() {
    if (this.phase === "over") return;
    this.phase = "over";
    this.overTimer = 0;
    this.S.boosting = false;
    this.shakeMag = 1.6;
    this.audio.stopAll();
    this.audio.playGameOver();
    this.emitSparks(this.S.playerX, 0.9, 0, 40);
    const result: GameResult = {
      score: Math.floor(this.S.score),
      distance: Math.floor(this.S.distance),
      topSpeed: Math.round(this.S.topSpeed * SPEED_TO_KMH),
      bestCombo: this.S.bestCombo,
    };
    this.cb.onGameOver(result);
    this.cb.onPhaseChange("over");
  }

  // ---------------------------------------------------------------- render
  private render() {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  private resize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
    this.bloom?.setSize(w, h);
    this.dragScale = ROAD_WIDTH / (w * 0.6);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("blur", this.onBlur);
    this.renderer.dispose();
  }
}
