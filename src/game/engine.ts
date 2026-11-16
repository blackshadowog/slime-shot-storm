import * as THREE from 'three';
import { audio } from './audio';
import { GUNS, LEVELS, SLIMES, THEMES, UPGRADE_DEFS, type AbilityId, type GunDef, type GunTex, type SlimeDef, type SlimeKind, type UpgradeId } from './data';
import { ARENA_R, buildWorld, type World } from './world';
import { renderWeaponPreviews } from './weaponPreviews';
import { BalloonBursts } from './balloonBursts';

export type Phase = 'menu' | 'playing' | 'shop' | 'dead' | 'victory' | 'paused';
export type Mode = 'levels' | 'infinite';

export interface Stats {
  damage: number;
  fireRate: number;
  multishot: number;
  magnet: number;
  maxHp: number;
  speed: number;
  crit: number;
  pierce: number;
  knock: number;
}

export interface HudState {
  mode: Mode;
  levelName: string;
  levelNo: number;
  levelCount: number;
  waveNo: number;
  waveTotal: number;
  hp: number;
  maxHp: number;
  wave: number;
  score: number;
  gems: number;
  kills: number;
  alive: number;
  combo: number;
  comboT: number;
  dashT: number;
  dashMax: number;
  stats: Stats;
  time: number;
  gunId: string;
  owned: string[];
  god: boolean;
  boss: { hp: number; max: number; name: string } | null;
}

export interface Offer {
  id: UpgradeId;
  name: string;
  tag: string;
  level: number;
  max: number;
  cost: number;
  gradient: string;
}

export interface GunItem {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  abilities: AbilityId[];
  cost: number;
  owned: boolean;
  equipped: boolean;
  dmg: number;
  rate: number;
  pellets: number;
  knock: number;
  color: string;
  accent: string;
}

export interface ShopPayload {
  kind: 'menu' | 'wave' | 'level';
  title: string;
  nextLabel: string;
  offers: Offer[];
  guns: GunItem[];
  gems: number;
  rerollCost: number;
  healCost: number;
  canHeal: boolean;
}

export interface RunStats {
  wave: number;
  score: number;
  kills: number;
  time: number;
  gemsEarned: number;
  mode: Mode;
  levelNo: number;
  levelName: string;
}

interface Callbacks {
  onWeaponPreviews: (previews: Record<string, string>) => void;
  onHud: (h: HudState) => void;
  onPhase: (p: Phase) => void;
  onBanner: (title: string, sub: string, color?: string) => void;
  onHurt: () => void;
  onHitmarker: (kill: boolean) => void;
  onGameOver: (s: RunStats) => void;
  onShop: (p: ShopPayload) => void;
}

const PROGRESS_KEY = 'slimeStormProgress';
const BEST_KEY = 'slimeStormBest';
const SAVE_KEY = 'slimeStormSaveV2';

export function loadProgress(): { unlocked: number; cleared: number } {
  try {
    const v = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    const unlocked = Math.max(1, Math.min(LEVELS.length, v.unlocked || 1));
    const cleared = Math.max(0, Math.min(LEVELS.length, typeof v.cleared === 'number' ? v.cleared : unlocked - 1));
    return { unlocked, cleared };
  } catch {
    return { unlocked: 1, cleared: 0 };
  }
}
function saveProgress(unlocked: number) {
  try {
    const cur = loadProgress();
    const u = Math.min(LEVELS.length, unlocked);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      unlocked: Math.max(cur.unlocked, u),
      cleared: Math.max(cur.cleared, Math.min(LEVELS.length, unlocked - 1)),
    }));
  } catch { /* noop */ }
}
export function loadBest(): { wave: number; score: number; kills: number } {
  try {
    return { wave: 0, score: 0, kills: 0, ...JSON.parse(localStorage.getItem(BEST_KEY) || '{}') };
  } catch {
    return { wave: 0, score: 0, kills: 0 };
  }
}

interface SaveData {
  gems: number;
  owned: string[];
  gunId: string;
  levels: Partial<Record<UpgradeId, number>>;
  god: boolean;
}
export function loadSave(): SaveData {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    const owned = Array.isArray(raw.owned) && raw.owned.length ? raw.owned : ['bubble'];
    if (!owned.includes('bubble')) owned.unshift('bubble');
    return {
      gems: typeof raw.gems === 'number' && raw.gems >= 0 ? Math.floor(raw.gems) : 0,
      owned,
      gunId: typeof raw.gunId === 'string' && owned.includes(raw.gunId) ? raw.gunId : 'bubble',
      levels: raw.levels && typeof raw.levels === 'object' ? raw.levels : {},
      god: raw.god === true,
    };
  } catch {
    return { gems: 0, owned: ['bubble'], gunId: 'bubble', levels: {}, god: false };
  }
}

/** Painterly toy-plastic textures so every blaster has its own candy finish */
function makeGunTexture(tex: GunTex, color: number, accent: number): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d')!;
  const base = '#' + color.toString(16).padStart(6, '0');
  const acc = '#' + accent.toString(16).padStart(6, '0');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);

  const gloss = () => {
    const lg = g.createLinearGradient(0, 0, 0, 256);
    lg.addColorStop(0, 'rgba(255,255,255,0.42)');
    lg.addColorStop(0.34, 'rgba(255,255,255,0.10)');
    lg.addColorStop(0.62, 'rgba(0,0,0,0.02)');
    lg.addColorStop(1, 'rgba(0,0,0,0.26)');
    g.fillStyle = lg;
    g.fillRect(0, 0, 256, 256);
  };

  switch (tex) {
    case 'gumball': {
      const cols = ['#ff5d8f', '#5ec8ff', '#ffe04a', '#67eb7a', '#c794ff', '#ff9a4d'];
      for (let i = 0; i < 34; i++) {
        const x = rnd() * 256, y = rnd() * 256, r = 12 + rnd() * 18;
        g.fillStyle = cols[i % cols.length];
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.45)';
        g.beginPath(); g.arc(x - r * 0.3, y - r * 0.35, r * 0.28, 0, 7); g.fill();
      }
      break;
    }
    case 'sprinkles': {
      g.fillStyle = '#fff6e2';
      g.fillRect(0, 0, 256, 256);
      const cols = ['#ff5d8f', '#ffd93d', '#5ec8ff', '#67eb7a', '#c794ff', '#ff8a4d'];
      g.lineCap = 'round';
      for (let i = 0; i < 130; i++) {
        const x = rnd() * 256, y = rnd() * 256;
        const a = rnd() * Math.PI;
        g.strokeStyle = cols[i % cols.length];
        g.lineWidth = 7;
        g.beginPath();
        g.moveTo(x - Math.cos(a) * 11, y - Math.sin(a) * 11);
        g.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11);
        g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.5)';
        g.lineWidth = 2.2;
        g.beginPath();
        g.moveTo(x - Math.cos(a) * 8, y - Math.sin(a) * 8 - 2);
        g.lineTo(x + Math.cos(a) * 4, y + Math.sin(a) * 4 - 2);
        g.stroke();
      }
      break;
    }
    case 'goo': {
      for (let i = 0; i < 26; i++) {
        const x = rnd() * 256, y = rnd() * 256, r = 16 + rnd() * 30;
        const rg = g.createRadialGradient(x, y, 2, x, y, r);
        rg.addColorStop(0, 'rgba(255,255,255,0.34)');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rg;
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      g.strokeStyle = 'rgba(255,255,255,0.30)';
      g.lineWidth = 9;
      for (let i = 0; i < 7; i++) {
        const x = 16 + i * 36;
        g.beginPath();
        g.moveTo(x, -10);
        g.bezierCurveTo(x + 16, 70, x - 16, 150, x + 8, 270);
        g.stroke();
      }
      break;
    }
    case 'hex': {
      g.strokeStyle = 'rgba(255,255,255,0.34)';
      g.lineWidth = 5;
      const R = 26;
      for (let row = -1; row < 8; row++) {
        for (let c = -1; c < 8; c++) {
          const x = c * R * 1.75 + (row % 2 ? R * 0.875 : 0);
          const y = row * R * 1.52;
          g.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
            const px = x + Math.cos(a) * R, py = y + Math.sin(a) * R;
            if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
          }
          g.closePath();
          g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.07)';
          g.fill();
        }
      }
      break;
    }
    case 'candy': {
      g.save();
      g.translate(128, 128);
      g.rotate(-0.6);
      g.translate(-260, -260);
      for (let i = 0; i < 16; i++) {
        g.fillStyle = i % 2 ? acc : base;
        g.fillRect(i * 34, 0, 34, 520);
      }
      g.restore();
      for (let i = 0; i < 16; i++) {
        g.fillStyle = 'rgba(255,255,255,0.16)';
        g.beginPath(); g.arc(rnd() * 256, rnd() * 256, 6 + rnd() * 12, 0, 7); g.fill();
      }
      break;
    }
    default: {
      for (let i = 0; i < 42; i++) {
        const x = rnd() * 256, y = rnd() * 256, r = 8 + rnd() * 16;
        g.fillStyle = 'rgba(255,255,255,0.16)';
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.06)';
        g.beginPath(); g.arc(x + r * 0.35, y + r * 0.4, r * 0.7, 0, 7); g.fill();
      }
      g.strokeStyle = 'rgba(255,255,255,0.22)';
      g.lineWidth = 10;
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.moveTo(-20, 40 + i * 60);
        g.lineTo(280, 20 + i * 60);
        g.stroke();
      }
      break;
    }
  }
  gloss();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 1);
  return t;
}

/** Plump smooth jelly pudding/teardrop slime dome */
function makeSlimeDomeGeo(): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const segs = 22;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs; // 0 = bottom center, 1 = top center
    const a = t * Math.PI;
    // Wider chubby lower belly, gently tapered plush rounded crown
    const sinA = Math.sin(a);
    const cosA = -Math.cos(a);
    const chub = 1 + 0.14 * Math.sin(t * Math.PI) * (1 - t);
    const r = Math.max(0.001, sinA * 0.78 * chub);
    const y = cosA * 0.64 + (t < 0.25 ? (0.25 - t) * 0.12 : 0);
    pts.push(new THREE.Vector2(r, y));
  }
  const geo = new THREE.LatheGeometry(pts, 32);
  geo.computeVertexNormals();
  return geo;
}

const rnd = Math.random;
/** each slime kind squeaks in its own little voice */
const VOICE: Record<SlimeKind, number> = {
  green: 1.0, blue: 1.35, pink: 0.72, orange: 1.15, gold: 1.55,
  mint: 1.05, mintling: 1.7, spiky: 0.85, ghost: 1.25, boss: 0.42,
};
const basicCache = new Map<number, THREE.MeshBasicMaterial>();
function basic(color: number): THREE.MeshBasicMaterial {
  let m = basicCache.get(color);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color });
    basicCache.set(color, m);
  }
  return m;
}

interface Slime {
  kind: SlimeKind;
  def: SlimeDef;
  group: THREE.Group;
  body: THREE.Mesh;
  bodyMat: THREE.MeshStandardMaterial;
  eyes: THREE.Group[];
  scale: number;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  radius: number;
  hopT: number;
  hopSpeed: number;
  flash: number;
  sq: number;
  sqV: number;
  atkCd: number;
  wobble: number;
  kb: THREE.Vector3;
  stun: number;
  slowT: number;
  slamT: number;
  spawnT: number;
  dead: boolean;
  deathT: number;
  deathScore: number;
  deathCombo: number;
  blinkT: number;
  blink: number;
  bonkCd: number; chatT: number; hopCycle: number; voice: number; ambient?: boolean; }

interface GunModel {
  group: THREE.Group;
  tip: THREE.Object3D;
  flash: THREE.Mesh;
  light: THREE.PointLight;
}

interface Bullet {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  dmg: number;
  crit: boolean;
  pierce: number;
  blast: number;
  knock: number;
  slow: number;
  gun: GunDef;
  hit: Set<Slime>;
  color: number;
  trailT: number;
  boom: boolean;
}

interface Particle {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: number;
  baseScale: number;
  active: boolean;
}

interface Gem {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  t: number;
}

interface Floater {
  sprite: THREE.Sprite;
  tex: THREE.CanvasTexture;
  vel: number;
  life: number;
  maxLife: number;
}

interface Portal {
  mesh: THREE.Group;
  t: number;
  kind: SlimeKind;
  x: number;
  z: number;
  done: boolean;
}

interface Ring {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  t: number;
  dur: number;
  maxR: number;
}

export class GameEngine {
  canvas: HTMLCanvasElement;
  cb: Callbacks;
  renderer!: THREE.WebGLRenderer;
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  hemi!: THREE.HemisphereLight;
  sun!: THREE.DirectionalLight;
  pickupLight!: THREE.PointLight;
  clock = new THREE.Clock();
  raf = 0;
  disposed = false;
  lastRenderedPhase: Phase | null = null;

  world: World | null = null;
  themeIdx = -1;

  phase: Phase = 'menu';
  mode: Mode = 'infinite';
  levelIdx = 0;
  waveIdx = 0;
  wave = 0;
  diffWave = 1;
  clearing = false;
  shopMeta: { kind: 'menu' | 'wave' | 'level'; title: string; nextLabel: string } | null = null;
  shopOffersCache: Offer[] = [];

  keys = new Set<string>();
  yaw = 0;
  pitch = 0;
  sensitivity = 0.0023;
  playerPos = new THREE.Vector3(0, 1.7, 8);
  playerVel = new THREE.Vector3();
  py = 0;
  vy = 0;
  firing = false;
  wasWant = false;
  touchMove = new THREE.Vector2();
  touchFiring = false;
  fireT = 0;

  levels: Record<UpgradeId, number> = {} as Record<UpgradeId, number>;
  stats: Stats = { damage: 12, fireRate: 5.5, multishot: 0, magnet: 4.2, maxHp: 100, speed: 7.2, crit: 0.05, pierce: 0, knock: 4.5 };
  hp = 100;
  gems = 0;
  score = 0;
  kills = 0;
  gemsEarned = 0;
  runTime = 0;
  combo = 0;
  comboT = 0;
  lastHurt = -99;
  dashT = 0;
  dashCd = 3;
  dashing = 0;
  dashDir = new THREE.Vector3();
  rerollCost = 10;

  owned = new Set<string>(['bubble']);
  gunId = 'bubble';
  gunModels: Record<string, GunModel> = {};
  gunTextures: THREE.CanvasTexture[] = [];
  god = false;
  swapT = 0;
  gunRecoil = 0;
  bobT = 0;
  menuAngle = 0.3;

  slimes: Slime[] = [];
  bullets: Bullet[] = [];
  particles: Particle[] = [];
  gemsArr: Gem[] = [];
  floaters: Floater[] = [];
  portals: Portal[] = [];
  rings: Ring[] = [];
  balloonBursts = new BalloonBursts();
  spawnQueue: SlimeKind[] = [];
  spawnT = 0;
  waveTotal = 0;
  shake = 0;
  fovKick = 0;
  hudT = 0;

  geo = {
    slimeBody: makeSlimeDomeGeo(),
    eye: new THREE.SphereGeometry(0.15, 14, 12),
    shine: new THREE.SphereGeometry(0.052, 10, 8),
    bodyShine: new THREE.SphereGeometry(0.13, 10, 8),
    blush: new THREE.SphereGeometry(0.1, 10, 8),
    mouth: new THREE.TorusGeometry(0.095, 0.024, 8, 16, Math.PI),
    bump: new THREE.SphereGeometry(0.14, 10, 8),
    bullet: new THREE.SphereGeometry(0.16, 14, 12),
    gem: new THREE.OctahedronGeometry(0.27, 0),
    particle: new THREE.SphereGeometry(0.5, 10, 8), // smooth round jelly droplets!
    ring: new THREE.TorusGeometry(1, 0.075, 10, 44),
    halo: new THREE.TorusGeometry(0.68, 0.06, 10, 28),
    crown: new THREE.CylinderGeometry(0.42, 0.45, 0.24, 18),
  };
  mat = {
    eye: new THREE.MeshBasicMaterial({ color: 0x261a40 }),
    white: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    blush: new THREE.MeshBasicMaterial({ color: 0xff8ab8, transparent: true, opacity: 0.78 }),
    dark: new THREE.MeshBasicMaterial({ color: 0x241a3d }),
    gem: new THREE.MeshStandardMaterial({ color: 0x45ebff, emissive: 0x16b8f2, emissiveIntensity: 0.85, roughness: 0.12, metalness: 0.1 }),
    gemGold: new THREE.MeshStandardMaterial({ color: 0xffe04a, emissive: 0xffb71c, emissiveIntensity: 0.85, roughness: 0.12, metalness: 0.1 }),
    crownMat: new THREE.MeshStandardMaterial({ color: 0xffe04a, emissive: 0xffb71c, emissiveIntensity: 0.45, roughness: 0.25 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x52e6b0, roughness: 0.55 }),
  };

  boundKeyDown!: (e: KeyboardEvent) => void;
  boundKeyUp!: (e: KeyboardEvent) => void;
  boundMouseDown!: (e: MouseEvent) => void;
  boundMouseUp!: (e: MouseEvent) => void;
  boundMouseMove!: (e: MouseEvent) => void;
  boundWheel!: (e: WheelEvent) => void;
  boundLockChange!: () => void;
  boundResize!: () => void;
  boundContext!: (e: Event) => void;

  constructor(canvas: HTMLCanvasElement, cb: Callbacks) {
    this.canvas = canvas;
    this.cb = cb;
    const saved = loadSave();
    this.gems = saved.gems;
    this.owned = new Set(saved.owned);
    this.gunId = saved.gunId;
    (Object.keys(UPGRADE_DEFS) as UpgradeId[]).forEach((k) => {
      this.levels[k] = Math.min(UPGRADE_DEFS[k].max, Math.max(0, saved.levels[k] || 0));
    });
    this.god = saved.god;
    if (this.god) this.applyGodUnlocks(false);
    this.recompute();
    this.hp = this.stats.maxHp;
  }

  persist() {
    try {
      const data: SaveData = {
        gems: this.gems,
        owned: Array.from(this.owned),
        gunId: this.gunId,
        levels: { ...this.levels },
        god: this.god,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch { /* noop */ }
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x99d9ff);
    this.scene.fog = new THREE.Fog(0xbfe8ff, 44, 155);
    this.scene.add(this.balloonBursts.group);

    this.camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.1, 450);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    this.hemi = new THREE.HemisphereLight(0xdaf0ff, 0x7bc966, 1.05);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff6d8, 1.85);
    this.sun.position.set(28, 44, 20);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -45;
    this.sun.shadow.camera.right = 45;
    this.sun.shadow.camera.top = 45;
    this.sun.shadow.camera.bottom = -45;
    this.sun.shadow.camera.far = 130;
    this.sun.shadow.bias = -0.0004;
    this.scene.add(this.sun);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.28));

    for (const g of GUNS) {
      this.gunModels[g.id] = this.buildGunModel(g);
    }
    this.cb.onWeaponPreviews(renderWeaponPreviews(this.renderer, this.gunModels));
    this.showGun(null); // hide gun while orbiting menu

    this.pickupLight = new THREE.PointLight(0x7df9ff, 0, 12);
    this.scene.add(this.pickupLight);

    for (let i = 0; i < 280; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
      const mesh = new THREE.Mesh(this.geo.particle, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({ mesh, mat, vel: new THREE.Vector3(), life: 0, maxLife: 1, gravity: 11, baseScale: 0.16, active: false });
    }

    this.applyTheme(0);
    this.spawnMenuSlimes();
    this.bindEvents();
    this.clock.start();
    this.loop();
    this.emitHud(true);
  }

  spawnMenuSlimes() {
    this.clearField();
    const kinds: SlimeKind[] = ['green', 'blue', 'pink', 'orange', 'mint', 'gold', 'green', 'blue'];
    kinds.forEach((k, i) => {
      const a = (i / kinds.length) * Math.PI * 2 + 0.3;
      const r = 4.5 + (i % 3) * 3.8;
      const s = this.spawnSlimeAt(k, Math.cos(a) * r, Math.sin(a) * r, undefined, true);
      s.spawnT = 0;
      s.ambient = true;
    });
  }

  bindEvents() {
    this.boundKeyDown = (e) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable="true"]')) return;
      if (this.phase !== 'playing') return;
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
      if (e.code === 'Space' && document.activeElement instanceof HTMLElement) document.activeElement.blur();
      this.keys.add(e.code);
      if (e.code === 'Space') this.tryDash();
      const dm = /^Digit([1-9])$/.exec(e.code);
      if (dm && this.phase === 'playing') {
        const list = this.ownedList();
        const g = list[parseInt(dm[1], 10) - 1];
        if (g) this.equipGun(g);
      }
    };
    this.boundKeyUp = (e) => this.keys.delete(e.code);
    this.boundMouseDown = (e) => {
      if (e.button === 0 && this.phase === 'playing' && document.pointerLockElement === this.canvas) this.firing = true;
    };
    this.boundMouseUp = (e) => {
      if (e.button === 0) this.firing = false;
    };
    this.boundMouseMove = (e) => {
      if (document.pointerLockElement !== this.canvas) return;
      if (this.phase !== 'playing' && this.phase !== 'paused') return;
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    };
    this.boundWheel = (e) => {
      if (this.phase !== 'playing') return;
      this.cycleGun(e.deltaY > 0 ? 1 : -1);
    };
    this.boundLockChange = () => {
      const locked = document.pointerLockElement === this.canvas;
      if (!locked && this.phase === 'playing') {
        this.phase = 'paused';
        this.firing = false;
        this.cb.onPhase('paused');
      } else if (locked && this.phase === 'paused') {
        this.phase = 'playing';
        this.cb.onPhase('playing');
      }
    };
    this.boundResize = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.lastRenderedPhase = null;
    };
    this.boundContext = (e) => e.preventDefault();

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mouseup', this.boundMouseUp);
    window.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('wheel', this.boundWheel, { passive: true });
    document.addEventListener('pointerlockchange', this.boundLockChange);
    window.addEventListener('resize', this.boundResize);
    this.canvas.addEventListener('contextmenu', this.boundContext);
  }

  /* ================= WORLD / THEME ================= */
  applyTheme(idx: number) {
    if (idx === this.themeIdx && this.world) return;
    const th = THEMES[idx];
    if (this.world) {
      this.scene.remove(this.world.group);
      this.world.dispose();
    }
    this.world = buildWorld(th);
    this.scene.add(this.world.group);
    this.themeIdx = idx;
    this.scene.background = new THREE.Color(th.sky);
    (this.scene.fog as THREE.Fog).color.set(th.fog);
    this.hemi.color.set(th.hemiSky);
    this.hemi.groundColor.set(th.hemiGround);
    this.sun.color.set(th.sun);
  }

  /* ================= SMOOTH ROUNDED CUTE GUNS (NO BOXES!) ================= */
  buildGunModel(g: GunDef): GunModel {
    const group = new THREE.Group();
    const tex = makeGunTexture(g.tex, g.color, g.accent);
    this.gunTextures.push(tex);
    const main = new THREE.MeshStandardMaterial({
      map: tex, color: 0xffffff, roughness: 0.26, metalness: 0.06,
      emissive: new THREE.Color(g.color), emissiveIntensity: 0.08,
    });
    const acc = new THREE.MeshStandardMaterial({ color: g.accent, roughness: 0.34, metalness: 0.12 });
    const cream = new THREE.MeshStandardMaterial({ color: 0xfff5e4, roughness: 0.3 });
    const shiny = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: g.color, emissiveIntensity: 0.95, roughness: 0.12 });
    const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
      const mm = new THREE.Mesh(geo, m);
      mm.position.set(x, y, z);
      mm.rotation.set(rx, ry, rz);
      group.add(mm);
      return mm;
    };
    const CAP = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 10, 16);
    const CYL = (r1: number, r2: number, l: number) => new THREE.CylinderGeometry(r1, r2, l, 18);
    const SPH = (r: number) => new THREE.SphereGeometry(r, 16, 12);
    const HALF = Math.PI / 2;
    let tipZ = -0.9;

    // Cute rounded grip shared by all blasters
    add(CAP(0.068, 0.2), acc, 0, -0.22, 0.12, 0.28);

    switch (g.id) {
      case 'gumdrop':
        add(CAP(0.145, 0.34), main, 0, 0, -0.04, HALF);
        add(CYL(0.078, 0.088, 0.56), acc, -0.085, 0.03, -0.46, HALF);
        add(CYL(0.078, 0.088, 0.56), acc, 0.085, 0.03, -0.46, HALF);
        add(new THREE.TorusGeometry(0.085, 0.025, 10, 20), cream, -0.085, 0.03, -0.73);
        add(new THREE.TorusGeometry(0.085, 0.025, 10, 20), cream, 0.085, 0.03, -0.73);
        // Plump gumball globe hopper on top
        add(SPH(0.145), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, roughness: 0.1 }), 0, 0.21, -0.14);
        add(SPH(0.055), shiny, -0.04, 0.19, -0.13);
        add(SPH(0.05), new THREE.MeshStandardMaterial({ color: 0xffe04a, roughness: 0.25 }), 0.05, 0.21, -0.15);
        add(SPH(0.05), new THREE.MeshStandardMaterial({ color: 0x63ccff, roughness: 0.25 }), 0, 0.25, -0.11);
        tipZ = -0.84;
        break;
      case 'sprinkle':
        add(CAP(0.13, 0.32), main, 0, 0, -0.02, HALF);
        add(CYL(0.035, 0.035, 0.68), shiny, 0, 0.065, -0.52, HALF);
        add(CYL(0.035, 0.035, 0.68), acc, -0.065, -0.035, -0.52, HALF);
        add(CYL(0.035, 0.035, 0.68), acc, 0.065, -0.035, -0.52, HALF);
        add(new THREE.TorusGeometry(0.105, 0.028, 10, 22), cream, 0, 0.01, -0.4);
        add(new THREE.TorusGeometry(0.105, 0.028, 10, 22), shiny, 0, 0.01, -0.76);
        add(CYL(0.13, 0.13, 0.22), acc, 0, -0.14, -0.22, 0, 0, HALF);
        tipZ = -0.92;
        break;
      case 'rocket':
        add(CYL(0.14, 0.15, 0.82), main, 0, 0.02, -0.38, HALF);
        add(new THREE.TorusGeometry(0.155, 0.032, 10, 24), cream, 0, 0.02, -0.18);
        add(new THREE.TorusGeometry(0.16, 0.032, 10, 24), cream, 0, 0.02, -0.78);
        // Glossy candy lollipop orb warhead!
        add(SPH(0.2), shiny, 0, 0.02, -0.95);
        add(new THREE.TorusGeometry(0.16, 0.038, 10, 24), cream, 0, 0.02, -0.95);
        tipZ = -1.16;
        break;
      case 'sniper':
        add(CAP(0.105, 0.42), main, 0, 0, -0.02, HALF);
        add(CYL(0.045, 0.058, 1.12), acc, 0, 0.02, -0.68, HALF);
        add(new THREE.TorusGeometry(0.065, 0.022, 10, 20), shiny, 0, 0.02, -1.22);
        // Cute rounded honey-pot scope on top
        add(CAP(0.068, 0.24), shiny, 0, 0.16, -0.2, HALF);
        add(new THREE.TorusGeometry(0.072, 0.02, 8, 20), cream, 0, 0.16, -0.34);
        tipZ = -1.32;
        break;
      case 'glue':
        add(CAP(0.135, 0.32), main, 0, 0, -0.18, HALF);
        add(SPH(0.16), shiny, 0, 0.02, -0.5);
        add(CYL(0.04, 0.08, 0.24), cream, 0, 0.02, -0.72, HALF);
        add(SPH(0.048), acc, 0, 0.02, -0.84);
        tipZ = -0.9;
        break;
      default:
        // Bubble Blaster — plump rounded toy vac-blaster!
        add(CAP(0.13, 0.34), main, 0, 0, -0.05, HALF);
        add(CYL(0.095, 0.12, 0.46), acc, 0, 0.03, -0.44, HALF);
        [-0.3, -0.52].forEach((z) => add(new THREE.TorusGeometry(0.125, 0.03, 10, 24), cream, 0, 0.03, z));
        add(CYL(0.15, 0.115, 0.16), shiny, 0, 0.03, -0.72, HALF);
        add(SPH(0.11), shiny, 0, 0.17, -0.18);
        add(SPH(0.085), shiny, -0.15, -0.02, -0.12);
        add(SPH(0.085), shiny, 0.15, -0.02, -0.12);
        tipZ = -0.86;
        break;
    }

    const tip = new THREE.Object3D();
    tip.position.set(0, 0.03, tipZ);
    group.add(tip);
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0, depthWrite: false }),
    );
    flash.position.copy(tip.position);
    group.add(flash);
    const light = new THREE.PointLight(g.color, 0, 9);
    light.position.copy(tip.position);
    group.add(light);
    group.position.set(0.34, -0.32, -0.62);
    group.rotation.set(0.02, -0.06, 0);
    group.visible = false;
    this.camera.add(group);
    return { group, tip, flash, light };
  }

  showGun(id: string | null) {
    for (const k of Object.keys(this.gunModels)) this.gunModels[k].group.visible = k === id;
  }

  gun(): GunDef {
    return GUNS.find((g) => g.id === this.gunId) || GUNS[0];
  }

  ownedList(): string[] {
    return GUNS.filter((g) => this.owned.has(g.id)).map((g) => g.id);
  }

  equipGun(id: string) {
    if (!this.owned.has(id)) return;
    if (id !== this.gunId) {
      this.gunId = id;
      if (this.phase === 'playing' || this.phase === 'paused') this.showGun(id);
      this.recompute();
      this.fireT = 0.12;
      this.swapT = 0.28;
      this.persist();
      audio.swap();
    }
    this.emitHud(true);
    if (this.phase === 'shop') this.emitShop();
  }

  cycleGun(d: number) {
    const list = this.ownedList();
    if (list.length < 2) return;
    const i = list.indexOf(this.gunId);
    this.equipGun(list[(i + d + list.length) % list.length]);
  }

  /* ================= STATS ================= */
  recompute() {
    const L = this.levels;
    const g = this.gun();
    const gm = this.god ? 40 : 1;
    this.stats = {
      damage: g.damage * (1 + 0.25 * L.damage) * gm,
      fireRate: g.rate * (1 + 0.18 * L.firerate) * (this.god ? 1.6 : 1),
      multishot: L.multishot + (this.god ? 4 : 0),
      magnet: 4.2 * (1 + 0.65 * L.magnet) * (this.god ? 3 : 1),
      maxHp: (100 + 25 * L.maxhp) * (this.god ? 10 : 1),
      speed: 7.2 * (1 + 0.12 * L.speed),
      crit: Math.min(0.95, g.crit + 0.12 * L.crit + (this.god ? 0.5 : 0)),
      pierce: L.pierce + (this.god ? 6 : 0),
      knock: g.knock * (1 + 0.3 * L.knock) * (this.god ? 3 : 1),
    };
  }

  /* ================= GOD / ADMIN ================= */
  unlockAllLevels() {
    try {
      const cur = loadProgress();
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ unlocked: LEVELS.length, cleared: cur.cleared }));
    } catch { /* noop */ }
  }

  applyGodUnlocks(announce = true) {
    this.god = true;
    GUNS.forEach((g) => this.owned.add(g.id));
    (Object.keys(UPGRADE_DEFS) as UpgradeId[]).forEach((k) => { this.levels[k] = UPGRADE_DEFS[k].max; });
    this.gems = Math.max(this.gems, 99999);
    this.recompute();
    this.hp = this.stats.maxHp;
    this.unlockAllLevels();
    this.persist();
    if (announce) audio.granted();
    this.emitHud(true);
    if (this.phase === 'shop') this.emitShop(true);
  }

  setGod(on: boolean) {
    this.god = on;
    if (on) {
      this.applyGodUnlocks();
    } else {
      this.recompute();
      this.hp = Math.min(this.hp, this.stats.maxHp);
      audio.denied();
      this.persist();
      this.emitHud(true);
      if (this.phase === 'shop') this.emitShop(true);
    }
  }

  admin(kind: 'gems' | 'heal' | 'killall' | 'skip' | 'maxup' | 'unlock') {
    audio.admin();
    switch (kind) {
      case 'gems':
        this.gems += 5000;
        this.persist();
        break;
      case 'heal':
        this.hp = this.stats.maxHp;
        break;
      case 'killall':
        for (const s of this.slimes) if (!s.dead && !s.ambient) this.killSlime(s, new THREE.Vector3(0, 0, 1));
        break;
      case 'skip':
        this.clearField();
        this.spawnQueue = [];
        this.portals = [];
        if ((this.phase === 'playing' || this.phase === 'paused') && !this.clearing) this.finishWave();
        break;
      case 'maxup':
        (Object.keys(UPGRADE_DEFS) as UpgradeId[]).forEach((k) => { this.levels[k] = UPGRADE_DEFS[k].max; });
        this.recompute();
        this.hp = this.stats.maxHp;
        this.persist();
        break;
      case 'unlock':
        this.unlockAllLevels();
        audio.unlock();
        break;
    }
    this.emitShop(false);
    this.emitHud(true);
  }

  costOf(id: UpgradeId) {
    const d = UPGRADE_DEFS[id];
    return d.base + d.mult * this.levels[id];
  }

  /* ================= RUN & SHOP CONTROL ================= */
  clearField() {
    this.balloonBursts.clear();
    for (const s of this.slimes) this.scene.remove(s.group);
    for (const b of this.bullets) this.scene.remove(b.mesh);
    for (const g of this.gemsArr) this.scene.remove(g.mesh);
    for (const p of this.portals) this.scene.remove(p.mesh);
    for (const r of this.rings) {
      this.scene.remove(r.mesh);
      r.mat.dispose();
    }
    for (const f of this.floaters) {
      this.scene.remove(f.sprite);
      f.tex.dispose();
    }
    this.slimes = [];
    this.bullets = [];
    this.gemsArr = [];
    this.portals = [];
    this.rings = [];
    this.floaters = [];
    for (const p of this.particles) {
      p.active = false;
      p.mesh.visible = false;
    }
  }

  startRun(mode: Mode, lvl = 0) {
    this.clearField();
    this.mode = mode;
    this.levelIdx = mode === 'levels' ? lvl : 0;
    this.waveIdx = 0;
    this.wave = 0;
    this.clearing = false;
    this.shopMeta = null;
    this.recompute();
    this.showGun(this.gunId);
    this.hp = this.stats.maxHp;
    this.score = 0;
    this.kills = 0;
    this.gemsEarned = 0;
    this.runTime = 0;
    this.combo = 0;
    this.comboT = 0;
    this.dashT = 0;
    this.dashing = 0;
    this.rerollCost = 10;
    this.playerPos.set(0, 1.7, 8);
    this.playerVel.set(0, 0, 0);
    this.py = 0;
    this.vy = 0;
    this.yaw = 0;
    this.pitch = -0.02;
    this.lastHurt = -99;
    this.themeIdx = -1;
    this.beginWave();
  }

  openMenuShop() {
    audio.ensure();
    audio.click();
    if (this.phase !== 'menu') {
      this.exitLock();
      this.firing = false;
      this.showGun(null);
      this.applyTheme(0);
      this.spawnMenuSlimes();
    }
    this.phase = 'shop';
    this.shopMeta = { kind: 'menu', title: 'SHOP', nextLabel: 'DONE' };
    this.cb.onPhase('shop');
    audio.setTrack('shop');
    this.emitShop(true);
    this.emitHud(true);
  }

  closeMenuShop() {
    audio.click();
    this.shopMeta = null;
    this.phase = 'menu';
    audio.setTrack('menu');
    this.cb.onPhase('menu');
  }

  beginWave() {
    this.wave++;
    let isBoss: boolean;
    if (this.mode === 'levels') {
      const L = LEVELS[this.levelIdx];
      this.applyTheme(L.theme);
      isBoss = this.waveIdx === L.waves - 1 && L.boss;
      this.diffWave = 1 + Math.floor(this.levelIdx * 0.45) + this.waveIdx;
    } else {
      this.applyTheme(Math.floor((this.wave - 1) / 5) % THEMES.length);
      isBoss = this.wave % 5 === 0;
      this.diffWave = this.wave;
    }
    this.spawnQueue = this.waveQueue(isBoss);
    this.waveTotal = this.spawnQueue.length;
    this.spawnT = 0.8;
    this.phase = 'playing';
    this.showGun(this.gunId);
    this.cb.onPhase('playing');

    if (this.mode === 'levels') {
      const L = LEVELS[this.levelIdx];
      if (this.waveIdx === 0) this.cb.onBanner(`LEVEL ${this.levelIdx + 1}`, L.name, '#ffe04a');
      else this.cb.onBanner(`WAVE ${this.waveIdx + 1}/${L.waves}`, isBoss ? 'SLIME KING' : '', isBoss ? '#c794ff' : '#67eb7a');
    } else {
      this.cb.onBanner(isBoss ? 'SLIME KING' : `WAVE ${this.wave}`, '', isBoss ? '#c794ff' : '#67eb7a');
    }
    audio.waveHorn();
    audio.setTranspose(THEMES[this.themeIdx >= 0 ? this.themeIdx : 0].musicRoot);
    audio.setTrack(isBoss ? 'boss' : 'battle');
    this.emitHud(true);
  }

  infinitePool(w: number): Partial<Record<SlimeKind, number>> {
    const p: Partial<Record<SlimeKind, number>> = { green: 10 };
    if (w >= 2) p.blue = 4;
    if (w >= 3) p.orange = 3;
    if (w >= 4) p.pink = 3;
    if (w >= 5) p.mint = 2;
    if (w >= 6) { p.spiky = 2; p.gold = 1; }
    if (w >= 7) p.ghost = 2;
    return p;
  }

  pickFromPool(pool: Partial<Record<SlimeKind, number>>): SlimeKind {
    const entries = Object.entries(pool) as [SlimeKind, number][];
    const total = entries.reduce((a, [, w]) => a + w, 0);
    let r = Math.random() * total;
    for (const [k, w] of entries) {
      r -= w;
      if (r <= 0) return k;
    }
    return entries[0][0];
  }

  waveQueue(isBoss: boolean): SlimeKind[] {
    let pool: Partial<Record<SlimeKind, number>>;
    let count: number;
    let extras: number;
    if (this.mode === 'levels') {
      const L = LEVELS[this.levelIdx];
      pool = L.pool;
      count = 6 + this.waveIdx * 3 + this.levelIdx;
      extras = 3 + this.waveIdx;
    } else {
      pool = this.infinitePool(this.wave);
      count = Math.min(8 + this.wave * 3, 45);
      extras = 4 + Math.floor(this.wave / 5);
    }
    const q: SlimeKind[] = [];
    for (let i = 0; i < count; i++) q.push(this.pickFromPool(pool));
    if (isBoss) for (let i = 0; i < extras; i++) q.push(this.pickFromPool(pool));
    for (let i = q.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [q[i], q[j]] = [q[j], q[i]];
    }
    if (isBoss) q.unshift('boss');
    return q;
  }

  finishWave() {
    this.clearing = true;
    const bonus = 8 + this.wave * 3;
    this.gems += bonus;
    this.gemsEarned += bonus;
    this.persist();
    audio.victory();

    let meta: { kind: 'wave' | 'level'; title: string; nextLabel: string };
    if (this.mode === 'levels') {
      const L = LEVELS[this.levelIdx];
      if (this.waveIdx < L.waves - 1) {
        this.waveIdx++;
        meta = { kind: 'wave', title: 'WAVE CLEAR', nextLabel: `WAVE ${this.waveIdx + 1}/${L.waves}` };
      } else {
        saveProgress(this.levelIdx + 2);
        if (this.levelIdx >= LEVELS.length - 1) {
          this.finishRun(true);
          return;
        }
        this.levelIdx++;
        this.waveIdx = 0;
        meta = { kind: 'level', title: 'LEVEL CLEAR!', nextLabel: `LV ${this.levelIdx + 1} · ${LEVELS[this.levelIdx].name}` };
      }
    } else {
      meta = { kind: 'wave', title: 'WAVE CLEAR', nextLabel: `WAVE ${this.wave + 1}` };
    }

    this.cb.onBanner(meta.title, `+${bonus} 💎`, '#ffe04a');
    this.burst(this.playerPos.clone().add(new THREE.Vector3(0, 1, -2)), 0xffe04a, 42, 8, 0.22, 6, 1);
    setTimeout(() => {
      if (this.disposed || (this.phase !== 'playing' && this.phase !== 'paused')) return;
      this.phase = 'shop';
      this.firing = false;
      this.exitLock();
      this.shopMeta = meta;
      this.cb.onPhase('shop');
      audio.setTrack('shop');
      this.emitShop(true);
      this.emitHud(true);
    }, 1350);
    this.emitHud(true);
  }

  continueFromShop() {
    if (this.shopMeta?.kind === 'menu') {
      this.closeMenuShop();
      return;
    }
    this.clearing = false;
    this.shopMeta = null;
    this.beginWave();
  }

  finishRun(victory: boolean) {
    this.clearing = true;
    this.phase = victory ? 'victory' : 'dead';
    this.firing = false;
    this.exitLock();
    this.persist();
    if (victory) audio.victory();
    else audio.gameOver();
    audio.setTrack(victory ? 'menu' : 'off');
    const stats: RunStats = {
      wave: this.wave, score: this.score, kills: this.kills, time: this.runTime, gemsEarned: this.gemsEarned,
      mode: this.mode, levelNo: this.mode === 'levels' ? this.levelIdx + 1 : 0,
      levelName: this.mode === 'levels' ? LEVELS[this.levelIdx].name : 'Endless',
    };
    try {
      const best = loadBest();
      localStorage.setItem(BEST_KEY, JSON.stringify({
        wave: Math.max(best.wave, stats.wave), score: Math.max(best.score, stats.score), kills: Math.max(best.kills, stats.kills),
      }));
    } catch { /* noop */ }
    this.cb.onPhase(this.phase);
    setTimeout(() => this.cb.onGameOver(stats), victory ? 1300 : 850);
  }

  buildOfferList(all: boolean): Offer[] {
    const keys = (Object.keys(UPGRADE_DEFS) as UpgradeId[]).filter((id) => all || this.levels[id] < UPGRADE_DEFS[id].max);
    const chosen = all ? keys : [...keys].sort(() => Math.random() - 0.5).slice(0, 6);
    return chosen.map((id) => {
      const d = UPGRADE_DEFS[id];
      return { id, name: d.name, tag: d.tag, level: this.levels[id], max: d.max, cost: this.costOf(id), gradient: d.gradient };
    });
  }

  emitShop(reshuffle = false) {
    if (!this.shopMeta) return;
    const isMenu = this.shopMeta.kind === 'menu';
    if (isMenu || reshuffle || this.shopOffersCache.length === 0) {
      this.shopOffersCache = this.buildOfferList(isMenu);
    } else {
      // Refresh prices/levels in place without scrambling cards on purchase
      this.shopOffersCache = this.shopOffersCache
        .map((o) => ({ ...o, level: this.levels[o.id], cost: this.costOf(o.id) }));
    }
    const guns: GunItem[] = GUNS.map((g) => ({
      id: g.id, name: g.name, icon: g.icon, blurb: g.blurb, abilities: g.abilities, cost: g.cost,
      owned: this.owned.has(g.id), equipped: this.gunId === g.id,
      dmg: g.damage, rate: g.rate, pellets: g.pellets, knock: g.knock,
      color: '#' + g.color.toString(16).padStart(6, '0'),
      accent: '#' + g.accent.toString(16).padStart(6, '0'),
    }));
    this.cb.onShop({
      kind: this.shopMeta.kind, title: this.shopMeta.title, nextLabel: this.shopMeta.nextLabel,
      offers: this.shopOffersCache, guns, gems: this.gems,
      rerollCost: this.rerollCost, healCost: 25, canHeal: !isMenu && this.hp < this.stats.maxHp,
    });
  }

  buyUpgrade(id: UpgradeId) {
    const def = UPGRADE_DEFS[id];
    if (this.levels[id] >= def.max) return audio.denied();
    const cost = this.costOf(id);
    if (this.gems < cost) return audio.denied();
    this.gems -= cost;
    this.levels[id]++;
    this.recompute();
    if (id === 'maxhp') this.hp = Math.min(this.stats.maxHp, this.hp + 40);
    this.persist();
    audio.upgrade();
    if (this.phase !== 'menu') {
      this.burst(this.playerPos.clone().add(new THREE.Vector3(0, -0.4, 0)), 0xffe04a, 24, 7, 0.22, 6, 0.7);
    }
    this.emitShop(false);
    this.emitHud(true);
  }

  buyGun(id: string) {
    const g = GUNS.find((x) => x.id === id);
    if (!g) return;
    if (this.owned.has(id)) return this.equipGun(id);
    if (this.gems < g.cost) return audio.denied();
    this.gems -= g.cost;
    this.owned.add(id);
    this.persist();
    audio.buy();
    this.equipGun(id);
    this.emitShop(false);
  }

  healShop() {
    if (this.gems < 25 || this.hp >= this.stats.maxHp) return audio.denied();
    this.gems -= 25;
    this.hp = this.stats.maxHp;
    this.persist();
    audio.gemBig();
    this.emitShop(false);
    this.emitHud(true);
  }

  reroll() {
    if (this.gems < this.rerollCost) return audio.denied();
    this.gems -= this.rerollCost;
    this.rerollCost += 6;
    this.persist();
    audio.buy();
    this.emitShop(true);
    this.emitHud(true);
  }

  requestLock() {
    if (this.phase === 'playing' || this.phase === 'paused') {
      try {
        const p = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch { /* noop */ }
    }
  }

  exitLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  resume() {
    if (this.phase === 'paused') this.requestLock();
  }

  quitToMenu() {
    this.exitLock();
    this.firing = false;
    this.persist();
    this.showGun(null);
    this.applyTheme(0);
    this.spawnMenuSlimes();
    this.phase = 'menu';
    this.shopMeta = null;
    audio.setTrack('menu');
    this.cb.onPhase('menu');
    this.emitHud(true);
  }

  setSensitivity(v: number) { this.sensitivity = v; }
  setTouchMove(x: number, y: number) { this.touchMove.set(x, y); }
  setTouchFiring(b: boolean) { this.touchFiring = b; }
  addLook(dx: number, dy: number) {
    this.yaw -= dx * this.sensitivity * 1.4;
    this.pitch -= dy * this.sensitivity * 1.4;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
  }

  /* ================= PLAYER ================= */
  tryDash() {
    if (this.phase !== 'playing' || this.dashT > 0) return;
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    let ix = 0, iz = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) iz += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) iz -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) ix -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) ix += 1;
    ix += this.touchMove.x;
    iz += this.touchMove.y;
    const dir = new THREE.Vector3().addScaledVector(fwd, iz).addScaledVector(right, ix);
    if (dir.lengthSq() < 0.01) dir.copy(fwd);
    dir.normalize();
    this.dashDir.copy(dir);
    this.dashing = 0.22;
    this.dashT = this.dashCd;
    this.fovKick = Math.max(this.fovKick, 9);
    this.shake = Math.max(this.shake, 0.12);
    audio.dash();
    this.burst(this.playerPos.clone().add(new THREE.Vector3(0, -0.8, 0)), 0x7df9ff, 18, 6, 0.18, 5, 0.6);
  }

  updatePlayer(dt: number) {
    const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const speed = this.stats.speed * (sprint ? 1.45 : 1);
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    let ix = 0, iz = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) iz += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) iz -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) ix -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) ix += 1;
    ix += this.touchMove.x;
    iz += this.touchMove.y;
    const wish = new THREE.Vector3().addScaledVector(fwd, iz).addScaledVector(right, ix);
    if (wish.lengthSq() > 1) wish.normalize();

    if (this.dashing > 0) {
      this.playerVel.lerp(this.dashDir.clone().multiplyScalar(20), Math.min(1, dt * 12));
    } else {
      const target = wish.multiplyScalar(speed);
      this.playerVel.x += (target.x - this.playerVel.x) * Math.min(1, dt * 9);
      this.playerVel.z += (target.z - this.playerVel.z) * Math.min(1, dt * 9);
    }
    this.playerPos.x += this.playerVel.x * dt;
    this.playerPos.z += this.playerVel.z * dt;
    this.vy -= 30 * dt;
    this.py += this.vy * dt;
    if (this.py <= 0) {
      this.py = 0;
      if (this.vy < 0) this.vy = 0;
    }

    const r = Math.hypot(this.playerPos.x, this.playerPos.z);
    if (r > ARENA_R - 1) {
      this.playerPos.x *= (ARENA_R - 1) / r;
      this.playerPos.z *= (ARENA_R - 1) / r;
      this.playerVel.multiplyScalar(0.4);
    }
    this.playerPos.y = 1.7 + this.py + Math.sin(this.bobT * 2) * 0.02 * (this.py === 0 ? 1 : 0);
    const hv = Math.hypot(this.playerVel.x, this.playerVel.z);
    if (hv > 1 && this.py === 0) this.bobT += dt * hv * 1.4;
  }

  /* ================= COMBAT ================= */
  burst(pos: THREE.Vector3, color: number, count: number, speed = 6, size = 0.2, gravity = 10, life = 0.65) {
    let spawned = 0;
    const col = new THREE.Color(color);
    for (const p of this.particles) {
      if (p.active) continue;
      p.active = true;
      p.mesh.visible = true;
      p.mat.color.copy(col).offsetHSL((Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.12);
      p.mat.opacity = 1;
      p.mesh.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3));
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const sp = speed * (0.35 + Math.random() * 0.9);
      p.vel.set(Math.sin(ph) * Math.cos(th) * sp, Math.abs(Math.cos(ph)) * sp * 0.9 + 1.5, Math.sin(ph) * Math.sin(th) * sp);
      p.maxLife = life * (0.6 + Math.random() * 0.7);
      p.life = p.maxLife;
      p.gravity = gravity;
      p.baseScale = size * (0.65 + Math.random() * 1.0);
      p.mesh.scale.setScalar(p.baseScale);
      if (++spawned >= count) break;
    }
  }

  spawnFloater(pos: THREE.Vector3, text: string, color = '#ffffff', big = false) {
    if (this.floaters.length > 42) {
      const old = this.floaters.shift()!;
      this.scene.remove(old.sprite);
      old.tex.dispose();
    }
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.font = `800 ${big ? 62 : 44}px 'Baloo 2', 'Fredoka', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(25,15,50,0.95)';
    ctx.strokeText(text, 128, 64);
    ctx.fillStyle = color;
    ctx.fillText(text, 128, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sprite.position.copy(pos);
    sprite.scale.set(big ? 2.1 : 1.45, big ? 1.05 : 0.72, 1);
    this.scene.add(sprite);
    this.floaters.push({ sprite, tex, vel: 2.2 + Math.random(), life: 0.78, maxLife: 0.78 });
  }

  createRing(pos: THREE.Vector3, color: number, maxR: number, dur = 0.5) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false });
    const mesh = new THREE.Mesh(this.geo.ring, mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(pos.x, 0.15, pos.z);
    mesh.scale.setScalar(0.1);
    this.scene.add(mesh);
    this.rings.push({ mesh, mat, t: 0, dur, maxR });
  }

  spawnSlimeAt(kind: SlimeKind, x: number, z: number, kick?: THREE.Vector3, silent = false): Slime {
    const def = SLIMES[kind];
    const d = this.diffWave;
    const hp = def.hp * (def.boss ? 12 + d * 6 : 8 + d * 4.5);
    const s = def.scale * (def.boss ? 1 + Math.min(0.4, d * 0.01) : 1);
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: def.color, roughness: 0.18, metalness: 0.04, emissive: def.color, emissiveIntensity: 0.06,
      transparent: !!def.ghost, opacity: def.ghost ? 0.74 : 1,
    });
    const body = new THREE.Mesh(this.geo.slimeBody, bodyMat);
    body.scale.setScalar(s);
    body.castShadow = true;
    group.add(body);

    // Extra cute kawaii face
    const eyes: THREE.Group[] = [];
    for (const sd of [-1, 1]) {
      const eg = new THREE.Group();
      eg.position.set(sd * 0.28 * s, 0.06 * s, 0.68 * s);
      eg.scale.setScalar(s);
      const eye = new THREE.Mesh(this.geo.eye, this.mat.eye);
      eye.scale.set(1.05, 1.22, 0.55);
      eg.add(eye);
      const shine = new THREE.Mesh(this.geo.shine, this.mat.white);
      shine.position.set(0.055, 0.065, 0.095);
      eg.add(shine);
      const shine2 = new THREE.Mesh(this.geo.shine, this.mat.white);
      shine2.scale.setScalar(0.48);
      shine2.position.set(-0.045, -0.055, 0.11);
      eg.add(shine2);
      group.add(eg);
      eyes.push(eg);

      const blush = new THREE.Mesh(this.geo.blush, this.mat.blush);
      blush.position.set(sd * 0.48 * s, -0.09 * s, 0.64 * s);
      blush.scale.set(1.15 * s, 0.62 * s, 0.38 * s);
      group.add(blush);
    }
    const mouth = new THREE.Mesh(this.geo.mouth, this.mat.dark);
    mouth.position.set(0, -0.1 * s, 0.77 * s);
    mouth.scale.setScalar(s);
    mouth.rotation.z = Math.PI;
    group.add(mouth);

    const hl = new THREE.Mesh(this.geo.bodyShine, this.mat.white);
    hl.position.set(-0.32 * s, 0.34 * s, 0.5 * s);
    hl.scale.set(1.1 * s, 0.62 * s, 0.8 * s);
    group.add(hl);

    // Cute smooth rounded accessories (no sharp cones or boxes!)
    if (kind === 'pink') {
      const bowMat = new THREE.MeshStandardMaterial({ color: 0xff3d8a, roughness: 0.35 });
      for (const sd of [-1, 1]) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.14 * s, 12, 10), bowMat);
        b.position.set(sd * 0.19 * s, 0.62 * s, 0.35 * s);
        b.scale.set(1.35, 0.82, 0.55);
        group.add(b);
      }
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 10, 8), bowMat);
      knot.position.set(0, 0.62 * s, 0.38 * s);
      group.add(knot);
    }
    if (kind === 'orange' || kind === 'boss') {
      for (const sd of [-1, 1]) {
        const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.03 * s, 0.14 * s, 6, 8), this.mat.dark);
        brow.position.set(sd * 0.27 * s, 0.32 * s, 0.66 * s);
        brow.rotation.z = Math.PI / 2 + sd * -0.4;
        group.add(brow);
      }
    }
    if (kind === 'mint' || kind === 'mintling') {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.2 * s, 12, 10), this.mat.leaf);
      leaf.position.set(0.1 * s, 0.72 * s, 0);
      leaf.scale.set(1.45, 0.34, 0.82);
      leaf.rotation.z = 0.25;
      group.add(leaf);
      const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.022 * s, 0.14 * s, 6, 8), this.mat.dark);
      stem.position.set(0, 0.64 * s, 0);
      group.add(stem);
    }
    if (kind === 'spiky') {
      const bumpMat = new THREE.MeshStandardMaterial({ color: def.accent, roughness: 0.3 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const bump = new THREE.Mesh(this.geo.bump, bumpMat);
        bump.scale.set(s, s * 1.15, s);
        bump.position.set(Math.cos(a) * 0.68 * s, 0.34 * s, Math.sin(a) * 0.68 * s);
        group.add(bump);
      }
    }
    if (kind === 'ghost') {
      const skirt = new THREE.Mesh(new THREE.TorusGeometry(0.55 * s, 0.09 * s, 10, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
      skirt.rotation.x = Math.PI / 2;
      skirt.position.y = -0.45 * s;
      group.add(skirt);
    }
    if (kind === 'gold') {
      const halo = new THREE.Mesh(this.geo.halo, new THREE.MeshBasicMaterial({ color: 0xfff3a0 }));
      halo.position.y = 0.92 * s;
      halo.rotation.x = Math.PI / 2.2;
      group.add(halo);
    }
    if (kind === 'boss') {
      const band = new THREE.Mesh(this.geo.crown, this.mat.crownMat);
      band.position.y = 0.72 * s;
      band.scale.setScalar(s);
      group.add(band);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const pearl = new THREE.Mesh(this.geo.bump, this.mat.crownMat);
        pearl.position.set(Math.cos(a) * 0.38 * s, 0.92 * s, Math.sin(a) * 0.38 * s);
        pearl.scale.setScalar(s * 0.85);
        group.add(pearl);
      }
    }

    group.position.set(x, 0.64 * s, z);
    this.scene.add(group);

    const slime: Slime = {
      kind, def, group, body, bodyMat, eyes, scale: s,
      hp, maxHp: hp,
      speed: def.speed * (1 + Math.min(0.5, d * 0.02)) * (0.9 + Math.random() * 0.2),
      dmg: Math.round(def.dmg * (1 + d * 0.05)),
      radius: 0.74 * s,
      hopT: Math.random() * 10, hopSpeed: 4.8 + Math.random() * 2,
      flash: 0, sq: 0, sqV: 0, atkCd: 0, wobble: Math.random() * 10,
      kb: kick ? kick.clone() : new THREE.Vector3(),
      stun: 0, slowT: 0, slamT: 4 + Math.random() * 2,
      spawnT: 0.35, dead: false, deathT: 0, deathScore: 0, deathCombo: 0,
      blinkT: 1 + Math.random() * 3, blink: 0, bonkCd: 0,
      chatT: 1.5 + Math.random() * 6, hopCycle: 0, voice: VOICE[kind],
    };
    this.slimes.push(slime);
    this.burst(group.position.clone().add(new THREE.Vector3(0, 0.5, 0)), def.color, 14, 5, 0.24, 8, 0.6);
    if (!silent) {
      if (def.boss) audio.slimeBoss();
      else audio.slimeSpawn(slime.voice);
    }
    return slime;
  }

  spawnPortal(kind: SlimeKind) {
    let angle = Math.random() * Math.PI * 2;
    const pr = ARENA_R - 3;
    for (let tries = 0; tries < 8; tries++) {
      const x = Math.cos(angle) * pr, z = Math.sin(angle) * pr;
      if (Math.hypot(x - this.playerPos.x, z - this.playerPos.z) > 11) break;
      angle += 0.8;
    }
    const x = Math.cos(angle) * pr, z = Math.sin(angle) * pr;
    const col = SLIMES[kind].color;
    const grp = new THREE.Group();
    const ring = new THREE.Mesh(this.geo.ring, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95 }));
    ring.scale.setScalar(1.1);
    ring.rotation.x = Math.PI / 2;
    grp.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.9, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    disc.rotation.x = -Math.PI / 2;
    grp.add(disc);
    grp.position.set(x, 0.1, z);
    this.scene.add(grp);
    this.portals.push({ mesh: grp, t: 0, kind, x, z, done: false });
  }

  shoot(dt: number) {
    this.fireT -= dt;
    const g = this.gun();
    const want = this.firing || this.touchFiring;
    const edge = want && !this.wasWant;
    this.wasWant = want;
    if (this.phase !== 'playing' || !want) return;
    if (this.fireT > 0) return;
    if (!g.auto && !edge) return;
    this.fireT = 1 / this.stats.fireRate;
    audio.shoot(g.id);

    const gm = this.gunModels[g.id];
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const origin = new THREE.Vector3();
    gm.tip.getWorldPosition(origin);

    const pellets = g.id === 'sniper' || g.id === 'rocket' ? 1 : g.pellets + this.stats.multishot;
    for (let i = 0; i < pellets; i++) {
      const d = dir.clone();
      if (pellets > 1) {
        const side = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 1, 0)).normalize();
        const off = (i / (pellets - 1) - 0.5) * g.spread * 2.2;
        d.addScaledVector(side, off);
      }
      d.x += (Math.random() - 0.5) * g.spread * 0.4;
      d.y += (Math.random() - 0.5) * g.spread * 0.4;
      d.normalize();
      const crit = Math.random() < this.stats.crit;
      const dmg = this.stats.damage * (0.9 + Math.random() * 0.2) * (crit ? 2.2 : 1);
      const color = crit ? 0xffe14d : g.color;
      const mesh = new THREE.Mesh(this.geo.bullet, basic(color));
      mesh.position.copy(origin);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
      const sz = g.size * (crit ? 1.3 : 1);
      mesh.scale.set(sz, sz, sz * g.stretch);
      this.scene.add(mesh);
      this.bullets.push({
        mesh, vel: d.multiplyScalar(g.speed), life: g.life, dmg, crit,
        pierce: g.pierce + this.levels.pierce, blast: g.blast, knock: this.stats.knock,
        slow: g.slow, gun: g, hit: new Set(), color, trailT: 0, boom: false,
      });
    }

    this.gunRecoil = Math.min(0.3, this.gunRecoil + 0.03 + g.recoil * 0.03);
    const fwdH = new THREE.Vector3(dir.x, 0, dir.z).normalize();
    this.playerVel.addScaledVector(fwdH, -g.recoil * 0.9);
    (gm.flash.material as THREE.MeshBasicMaterial).opacity = 1;
    gm.flash.scale.setScalar(0.8 + Math.random() * 0.7);
    gm.light.intensity = 6;
    this.fovKick = Math.max(this.fovKick, 1.5 + g.recoil * 0.2);
    this.shake = Math.max(this.shake, 0.04 + g.recoil * 0.01);
  }

  explode(pos: THREE.Vector3, radius: number, dmg: number, knock: number, exclude: Set<Slime>) {
    this.burst(pos.clone(), 0xffb347, 36, 12, 0.3, 9, 0.8);
    this.burst(pos.clone(), 0xfff3c4, 18, 8, 0.24, 6, 0.5);
    this.createRing(pos, 0xffe04a, radius * 1.1, 0.45);
    audio.boom();
    this.shake = Math.max(this.shake, 0.55);
    this.fovKick = Math.max(this.fovKick, 4);

    for (const s of [...this.slimes]) {
      if (s.dead || s.spawnT > 0 || exclude.has(s)) continue;
      const dx = s.group.position.x - pos.x, dz = s.group.position.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d > radius) continue;
      const f = 1 - d / radius;
      const dir = new THREE.Vector3(d > 0.01 ? dx / d : 1, 0, d > 0.01 ? dz / d : 0);
      this.damageSlime(s, dmg * (0.4 + 0.6 * f), dir, knock * (0.5 + f), false, 0);
    }

    const pp = this.playerPos;
    const pd = Math.hypot(pp.x - pos.x, pp.y - pos.y, pp.z - pos.z);
    const pr = radius * 1.2;
    if (pd < pr) {
      const f = 1 - pd / pr;
      const hd = Math.hypot(pp.x - pos.x, pp.z - pos.z);
      const hx = hd > 0.05 ? (pp.x - pos.x) / hd : 0;
      const hz = hd > 0.05 ? (pp.z - pos.z) / hd : 0;
      this.playerVel.x += hx * knock * 0.9 * f;
      this.playerVel.z += hz * knock * 0.9 * f;
      this.vy = Math.max(this.vy, 4 + 12 * f);
    }
  }

  damageSlime(s: Slime, dmg: number, dir: THREE.Vector3, knock: number, crit: boolean, slow: number) {
    if (s.dead || s.spawnT > 0 || s.ambient) return;
    let d = dmg;
    if (s.def.armor) d *= 1 - s.def.armor;
    s.hp -= d;
    s.flash = 1;
    s.sq = 0.35;
    s.sqV = 0;
    if (knock > 0) {
      const kv = (knock * (crit ? 1.3 : 1) * 1.6) / s.def.mass;
      s.kb.x += dir.x * kv;
      s.kb.z += dir.z * kv;
      s.stun = Math.max(s.stun, Math.min(0.45, (knock * 0.04) / s.def.mass));
    }
    if (slow > 0) s.slowT = Math.max(s.slowT, slow);

    this.spawnFloater(
      s.group.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 1.1 + Math.random() * 0.4, (Math.random() - 0.5) * 0.6)),
      `${Math.round(d)}${crit ? '!' : ''}`, crit ? '#ffe14d' : '#ffffff', crit,
    );
    this.burst(s.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)), s.def.color, crit ? 9 : 5, 5, 0.18, 8, 0.45);
    audio.hit(crit);
    this.cb.onHitmarker(false);
    if (s.hp <= 0) this.killSlime(s, dir);
    else {
      audio.squeak(s.voice);
      audio.splat();
    }
  }

  killSlime(s: Slime, dir: THREE.Vector3) {
    if (s.dead) return;
    s.dead = true;
    s.spawnT = 0;
    s.deathT = 0.16;
    s.body.scale.setScalar(s.scale);
    s.kb.set((dir.x * 2) / s.def.mass, 0, (dir.z * 2) / s.def.mass);
    const def = s.def;
    this.kills++;
    this.combo++;
    this.comboT = 3.5;
    const sc = def.score + Math.min(this.combo, 20) * 2 + this.wave * 2;
    this.score += sc;
    s.deathScore = sc;
    s.deathCombo = this.combo;
    audio.balloonInflate(s.voice);
    this.cb.onHitmarker(true);
    this.emitHud();
  }

  burstSlime(s: Slime) {
    const def = s.def;
    const sc = s.deathScore;
    const [g0, g1] = def.gems;
    const gemCount = g0 + Math.floor(Math.random() * (g1 - g0 + 1));
    for (let i = 0; i < gemCount; i++) {
      const mat = def.color === SLIMES.gold.color ? this.mat.gemGold : this.mat.gem;
      const mesh = new THREE.Mesh(this.geo.gem, mat);
      mesh.castShadow = true;
      mesh.position.copy(s.group.position).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.8, (Math.random() - 0.5) * 0.8));
      this.scene.add(mesh);
      this.gemsArr.push({ mesh, vel: new THREE.Vector3((Math.random() - 0.5) * 7, 5 + Math.random() * 4, (Math.random() - 0.5) * 7), t: Math.random() * 10 });
    }
    const p = s.group.position.clone();
    this.balloonBursts.emit(p, def.color, s.radius * 1.35, this.camera, !!def.boss);
    this.burst(p, def.color, def.boss ? 16 : 7, 9, 0.17, 5, 0.45);
    this.burst(p, 0xffffff, 7, 7, 0.14, 2, 0.35);
    this.burst(p, 0xffe14d, 5, 7, 0.15, 4, 0.65);
    this.spawnFloater(s.group.position.clone().add(new THREE.Vector3(0, 1.4, 0)), `+${sc}`, def.flee ? '#ffe04a' : '#ffffff', !!(def.boss || def.flee));
    if (s.deathCombo >= 3) this.spawnFloater(s.group.position.clone().add(new THREE.Vector3(0, 2.05, 0)), `${s.deathCombo}x`, '#ff9df0', s.deathCombo >= 8);
    if (def.boss) this.createRing(s.group.position, 0xbc82ff, 9, 0.8);
    if (def.splits) {
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2;
        this.spawnSlimeAt('mintling', s.group.position.x, s.group.position.z, new THREE.Vector3(Math.cos(a) * 5, 0, Math.sin(a) * 5), true);
      }
      audio.slimeSplit();
    }
    audio.balloonPop(s.voice, s.deathCombo);
    this.shake = Math.max(this.shake, def.boss ? 0.85 : 0.15);
  }

  bossSlam(s: Slime) {
    const p = s.group.position;
    this.createRing(p, 0xbc82ff, 8, 0.6);
    this.createRing(p, 0xffffff, 5, 0.4);
    this.burst(p.clone().setY(0.2), 0xd6b8ff, 30, 10, 0.25, 10, 0.7);
    this.shake = Math.max(this.shake, 0.7);
    audio.boom();
    for (const o of this.slimes) {
      if (o === s || o.dead || o.spawnT > 0) continue;
      const dx = o.group.position.x - p.x, dz = o.group.position.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 7 && d > 0.01) {
        const k = 9 / o.def.mass;
        o.kb.x += (dx / d) * k;
        o.kb.z += (dz / d) * k;
        o.stun = Math.max(o.stun, 0.3);
      }
    }
    const pp = this.playerPos;
    const pd = Math.hypot(pp.x - p.x, pp.z - p.z);
    if (pd < 7) {
      const f = 1 - pd / 7;
      const nx = pd > 0.01 ? (pp.x - p.x) / pd : 0;
      const nz = pd > 0.01 ? (pp.z - p.z) / pd : 1;
      this.playerVel.x += nx * 14 * f;
      this.playerVel.z += nz * 14 * f;
      this.vy = Math.max(this.vy, 6 * f);
      if (this.dashing <= 0) this.hurtPlayer(Math.round(s.dmg * 0.6 * f + 4), p);
    }
  }

  hurtPlayer(dmg: number, from: THREE.Vector3) {
    if (this.god) return;
    if (this.dashing > 0 || this.phase !== 'playing') return;
    if (this.runTime - this.lastHurt < 0.35) return;
    this.lastHurt = this.runTime;
    this.hp -= dmg;
    this.combo = 0;
    this.comboT = 0;
    this.shake = Math.max(this.shake, 0.45);
    const knock = this.playerPos.clone().sub(from).setY(0);
    if (knock.lengthSq() < 0.001) knock.set(1, 0, 0);
    knock.normalize().multiplyScalar(7);
    this.playerVel.add(knock);
    audio.hurt();
    this.cb.onHurt();
    this.emitHud(true);
    if (this.hp <= 0) {
      this.hp = 0;
      this.burst(this.playerPos.clone(), 0xff5d5d, 40, 9, 0.25, 8, 1);
      this.finishRun(false);
    }
  }

  /* ================= LOOP ================= */
  loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    // Menus use cached weapon renders, so a paused arena needs no GPU redraws.
    if (this.phase === 'shop' || this.phase === 'paused') {
      this.keys.clear();
      this.firing = this.touchFiring = false;
      if (this.lastRenderedPhase !== this.phase) this.renderer.render(this.scene, this.camera);
      this.lastRenderedPhase = this.phase;
      return;
    }
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.lastRenderedPhase = this.phase;
  };

  update(dt: number) {
    const playing = this.phase === 'playing';
    const menuOrbit = this.phase === 'menu' || (this.phase === 'shop' && this.shopMeta?.kind === 'menu');

    if (this.phase === 'paused' || (this.phase === 'shop' && !menuOrbit)) {
      this.keys.clear();
      this.firing = this.touchFiring = false;
      this.emitHud();
      return;
    }

    if (playing) this.runTime += dt;
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    if (this.dashT > 0) this.dashT -= dt;
    if (this.dashing > 0) this.dashing -= dt;
    if (this.god) this.hp = this.stats.maxHp;
    else if (playing && this.hp < this.stats.maxHp && this.runTime - this.lastHurt > 6) {
      this.hp = Math.min(this.stats.maxHp, this.hp + 4 * dt);
    }

    if (!menuOrbit) this.updatePlayer(dt);
    this.shoot(dt);
    if (playing) this.updateSpawning(dt);
    this.updateSlimes(dt, playing, menuOrbit);
    this.updateBullets(dt);
    this.updateParticles(dt);
    this.balloonBursts.update(dt);
    this.updateGems(dt, playing);
    this.updateFloaters(dt);
    this.updatePortals(dt);
    this.updateRings(dt);
    this.world?.update(performance.now() * 0.001, dt);
    this.updateGun(dt);

    if (menuOrbit) {
      this.menuAngle += dt * 0.14;
      const r = 18.5;
      this.camera.position.set(Math.cos(this.menuAngle) * r, 7.2 + Math.sin(this.menuAngle * 2) * 0.7, Math.sin(this.menuAngle) * r);
      this.camera.lookAt(0, 1.3, 0);
    } else {
      this.shake = Math.max(0, this.shake - dt * 1.8);
      this.fovKick = Math.max(0, this.fovKick - dt * 22);
      const sh = this.shake * this.shake;
      const sx = (Math.random() - 0.5) * sh * 0.7, sy = (Math.random() - 0.5) * sh * 0.7;
      this.camera.position.set(this.playerPos.x + sx, this.playerPos.y + sy, this.playerPos.z);
      this.camera.rotation.set(this.pitch + sy * 0.4, this.yaw + sx * 0.4, sx * 0.25);

      const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      const targetFov = 76 + this.fovKick + (sprint ? 3 : 0) + (this.dashing > 0 ? 6 : 0);
      if (Math.abs(this.camera.fov - targetFov) > 0.1) {
        this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 10);
        this.camera.updateProjectionMatrix();
      }
    }

    for (const k of Object.keys(this.gunModels)) {
      const gm = this.gunModels[k];
      if (gm.light.intensity > 0) gm.light.intensity = Math.max(0, gm.light.intensity - dt * 40);
      const fm = gm.flash.material as THREE.MeshBasicMaterial;
      if (fm.opacity > 0) fm.opacity = Math.max(0, fm.opacity - dt * 9);
    }

    if (playing && !this.clearing && this.spawnQueue.length === 0 && this.portals.length === 0 && this.slimes.length === 0) {
      this.finishWave();
    }
    this.emitHud();
  }

  updateSpawning(dt: number) {
    if (this.spawnQueue.length === 0) return;
    this.spawnT -= dt;
    const alive = this.slimes.filter((s) => !s.dead).length + this.portals.length;
    const cap = 14 + Math.min(10, Math.floor(this.diffWave / 2));
    if (this.spawnT <= 0 && alive < cap) {
      const kind = this.spawnQueue.shift()!;
      this.spawnPortal(kind);
      this.spawnT = Math.max(0.28, 1.0 - this.diffWave * 0.03);
    }
  }

  updateSlimes(dt: number, playing: boolean, menuOrbit: boolean) {
    const pp = this.playerPos;
    for (let i = this.slimes.length - 1; i >= 0; i--) {
      const s = this.slimes[i];
      const gp = s.group.position;

      if (s.spawnT > 0) {
        s.spawnT -= dt;
        const k = 1 - s.spawnT / 0.35;
        s.group.scale.setScalar(0.2 + 0.8 * Math.max(0, k));
        continue;
      }
      if (s.dead) {
        s.deathT -= dt;
        gp.x += s.kb.x * dt;
        gp.z += s.kb.z * dt;
        gp.y += dt * .7;
        const inflation = 1 - Math.max(0, s.deathT) / .16;
        const swell = 1 + inflation * inflation * .46;
        s.group.scale.set(swell, swell * (1 + inflation * .09), swell);
        s.bodyMat.emissiveIntensity = .12 + inflation * .35;
        if (s.deathT <= 0) {
          this.burstSlime(s);
          this.scene.remove(s.group);
          this.slimes.splice(i, 1);
        }
        continue;
      }

      s.hopT += dt * s.hopSpeed * (s.stun > 0 ? 0.5 : 1);
      if (playing || menuOrbit) {
        const cp = this.camera.position;
        const dd = Math.hypot(gp.x - cp.x, gp.z - cp.z);
        const near = Math.max(0, 1 - dd / 26) * (menuOrbit ? 0.7 : 1);
        const cyc = Math.floor(s.hopT / Math.PI);
        if (cyc !== s.hopCycle) {
          s.hopCycle = cyc;
          if (near > 0.1 && s.stun <= 0) audio.slimeHop(s.voice, near * (s.def.boss ? 1.6 : 1));
        }
        s.chatT -= dt;
        if (s.chatT <= 0) {
          s.chatT = 3.5 + Math.random() * 7;
          if (near > 0.22 && !s.def.boss) audio.slimeChat(s.voice, near);
        }
      }
      s.wobble += dt * 2.5;
      s.atkCd -= dt;
      s.bonkCd -= dt;
      s.stun -= dt;
      s.slowT -= dt;
      s.blinkT -= dt;
      s.blink -= dt;

      if (menuOrbit && s.ambient) {
        // Happy meandering slimes in the background meadow
        const a = s.wobble * 0.25 + i;
        gp.x += Math.cos(a) * dt * 1.2;
        gp.z += Math.sin(a) * dt * 1.2;
        const r = Math.hypot(gp.x, gp.z);
        if (r > 13) { gp.x *= 13 / r; gp.z *= 13 / r; }
        s.group.rotation.y = Math.atan2(Math.cos(a), Math.sin(a));
      } else {
        const toP = new THREE.Vector3(pp.x - gp.x, 0, pp.z - gp.z);
        const dist = toP.length();
        const dirN = dist > 0.001 ? toP.clone().divideScalar(dist) : new THREE.Vector3(0, 0, 1);

        if (playing && s.stun <= 0) {
          const slowF = s.slowT > 0 ? 0.45 : 1;
          const strafe = Math.sin(s.wobble * 0.7) * 0.7;
          const side = new THREE.Vector3(-dirN.z, 0, dirN.x);
          const move = s.def.flee && dist < 10
            ? dirN.clone().negate().addScaledVector(side, strafe * 0.5).normalize()
            : dirN.clone().addScaledVector(side, strafe * 0.4).normalize();
          const sp = s.speed * slowF * (dist < 3 && !s.def.flee ? 1.3 : 1) * (s.def.flee && dist < 10 ? 1.4 : 1);
          gp.x += move.x * sp * dt;
          gp.z += move.z * sp * dt;

          if (s.def.boss) {
            s.slamT -= dt;
            if (s.slamT <= 0 && dist < 9) {
              s.slamT = 5;
              this.bossSlam(s);
            }
          }
          if (!s.def.flee && dist < s.radius + 1.1 && s.atkCd <= 0) {
            s.atkCd = 0.9;
            audio.slimeChomp(s.voice);
            this.hurtPlayer(s.dmg, gp);
            s.kb.addScaledVector(dirN, -3);
          }
        }

        gp.x += s.kb.x * dt;
        gp.z += s.kb.z * dt;
        s.kb.multiplyScalar(Math.exp(-dt * 3.6));
        if (s.kb.lengthSq() < 0.0004) s.kb.set(0, 0, 0);

        const r = Math.hypot(gp.x, gp.z);
        const lim = ARENA_R - 1.2;
        if (r > lim) {
          const nx = gp.x / r, nz = gp.z / r;
          gp.x = nx * lim;
          gp.z = nz * lim;
          const dot = s.kb.x * nx + s.kb.z * nz;
          const speed = Math.hypot(s.kb.x, s.kb.z);
          if (dot > 0) {
            s.kb.x = (s.kb.x - 2 * dot * nx) * 0.6;
            s.kb.z = (s.kb.z - 2 * dot * nz) * 0.6;
          }
          if (speed > 4 && s.bonkCd <= 0) {
            s.bonkCd = 0.4;
            this.damageSlime(s, speed * 0.9, new THREE.Vector3(-nx, 0, -nz), 0, false, 0);
            this.spawnFloater(gp.clone().add(new THREE.Vector3(0, 1.5, 0)), 'BONK!', '#ffe14d', false);
            audio.bonk();
          }
        }
        s.group.rotation.y = Math.atan2(dirN.x, dirN.z);
      }

      const hop = Math.abs(Math.sin(s.hopT)) * s.def.hop * 0.55 * (s.stun > 0 ? 0.4 : 1);
      gp.y = 0.6 * s.scale + hop;
      s.sqV += (0 - s.sq) * 90 * dt;
      s.sqV *= Math.exp(-dt * 7);
      s.sq += s.sqV * dt;
      const hopSq = Math.sin(s.hopT * 2) * 0.07;
      const sc = s.scale;
      s.body.scale.set(sc * (1 + s.sq + hopSq), sc * (1 - s.sq * 1.1 - hopSq), sc * (1 + s.sq + hopSq));

      if (s.flash > 0) {
        s.flash = Math.max(0, s.flash - dt * 5);
        s.bodyMat.emissiveIntensity = 0.06 + s.flash * 1.4;
        s.bodyMat.emissive.setHex(s.flash > 0.4 ? 0xffffff : s.def.color);
      }
      if (s.blinkT <= 0) {
        s.blinkT = 2 + Math.random() * 3;
        s.blink = 0.12;
      }
      for (const eg of s.eyes) {
        const open = s.blink > 0 ? 0.14 : 1;
        eg.scale.set(s.scale, s.scale * open, s.scale);
      }
    }

    if (menuOrbit) return;

    // Pairwise separation + bonk collisions
    const list = this.slimes;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.dead || a.spawnT > 0) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.dead || b.spawnT > 0) continue;
        const ax = a.group.position.x, az = a.group.position.z;
        const bx = b.group.position.x, bz = b.group.position.z;
        const dx = ax - bx, dz = az - bz;
        const d = Math.hypot(dx, dz);
        const minD = a.radius + b.radius;
        if (d >= minD || d < 0.0001) continue;
        const nx = dx / d, nz = dz / d;
        const overlap = minD - d;
        if (!(a.def.ghost || b.def.ghost)) {
          const ma = a.def.mass, mb = b.def.mass;
          const wa = mb / (ma + mb), wb = ma / (ma + mb);
          a.group.position.x += nx * overlap * wa;
          a.group.position.z += nz * overlap * wa;
          b.group.position.x -= nx * overlap * wb;
          b.group.position.z -= nz * overlap * wb;
          const rel = (a.kb.x - b.kb.x) * nx + (a.kb.z - b.kb.z) * nz;
          if (rel < 0) {
            const imp = -rel * 0.6;
            a.kb.x += (nx * imp) / ma; a.kb.z += (nz * imp) / ma;
            b.kb.x -= (nx * imp) / mb; b.kb.z -= (nz * imp) / mb;
            if (Math.abs(rel) > 4 && a.bonkCd <= 0 && b.bonkCd <= 0) {
              a.bonkCd = 0.3; b.bonkCd = 0.3;
              const dmg = Math.abs(rel) * 0.7;
              this.damageSlime(a, dmg, new THREE.Vector3(-nx, 0, -nz), 0, false, 0);
              this.damageSlime(b, dmg, new THREE.Vector3(nx, 0, nz), 0, false, 0);
              a.stun = Math.max(a.stun, 0.2); b.stun = Math.max(b.stun, 0.2);
              this.spawnFloater(new THREE.Vector3((ax + bx) / 2, 1.6, (az + bz) / 2), 'BONK!', '#ffe14d', false);
              audio.bonk();
            }
          }
        }
      }
    }
  }

  updateBullets(dt: number) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      b.vel.y -= (b.gun.id === 'rocket' ? 0.8 : 3.5) * dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      const p = b.mesh.position;
      let dead = b.life <= 0 || p.y < 0.05 || p.y > 40 || Math.hypot(p.x, p.z) > 55;

      if (b.gun.id === 'rocket') {
        b.trailT -= dt;
        if (b.trailT <= 0) {
          b.trailT = 0.04;
          this.burst(p.clone(), 0xffffff, 1, 1, 0.16, 0, 0.35);
        }
      }

      if (!dead && this.phase === 'playing') {
        for (const s of this.slimes) {
          if (s.dead || s.spawnT > 0 || b.hit.has(s)) continue;
          const dx = p.x - s.group.position.x;
          const dy = p.y - (s.group.position.y + 0.2);
          const dz = p.z - s.group.position.z;
          const rr = s.radius + 0.35;
          if (dx * dx + dy * dy + dz * dz < rr * rr) {
            b.hit.add(s);
            const dir = b.vel.clone().setY(0);
            if (dir.lengthSq() < 0.0001) dir.set(1, 0, 0);
            dir.normalize();
            this.damageSlime(s, b.dmg, dir, b.knock, b.crit, b.slow);
            if (b.blast > 0) { dead = true; break; }
            if (b.pierce > 0) {
              b.pierce--;
              b.dmg *= 0.85;
            } else {
              dead = true;
              this.burst(p.clone(), b.color, 5, 4, 0.14, 6, 0.35);
              break;
            }
          }
        }
      }

      if (dead) {
        if (b.blast > 0 && !b.boom) {
          b.boom = true;
          this.explode(p.clone(), b.blast, b.dmg * 0.6, b.knock, b.hit);
        } else if (p.y < 0.1 && b.life > 0) {
          this.burst(new THREE.Vector3(p.x, 0.15, p.z), b.color, 4, 3, 0.12, 8, 0.3);
        }
        this.scene.remove(b.mesh);
        this.bullets.splice(i, 1);
      }
    }
  }

  updateParticles(dt: number) {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.mesh.position.y < 0.06) {
        p.mesh.position.y = 0.06;
        p.vel.y *= -0.45;
        p.vel.x *= 0.72;
        p.vel.z *= 0.72;
      }
      const k = p.life / p.maxLife;
      p.mesh.scale.setScalar(Math.max(0.001, p.baseScale * k));
      p.mat.opacity = Math.min(1, k * 1.6);
    }
  }

  updateRings(dt: number) {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.t += dt;
      const k = Math.min(1, r.t / r.dur);
      r.mesh.scale.setScalar(0.1 + (r.maxR - 0.1) * (1 - Math.pow(1 - k, 3)));
      r.mat.opacity = 0.9 * (1 - k);
      if (k >= 1) {
        this.scene.remove(r.mesh);
        r.mat.dispose();
        this.rings.splice(i, 1);
      }
    }
  }

  updateGems(dt: number, playing: boolean) {
    const pp = this.playerPos;
    for (let i = this.gemsArr.length - 1; i >= 0; i--) {
      const g = this.gemsArr[i];
      g.t += dt;
      g.vel.y -= 14 * dt;
      g.mesh.position.addScaledVector(g.vel, dt);
      if (g.mesh.position.y < 0.3) {
        g.mesh.position.y = 0.3;
        g.vel.y *= -0.45;
        g.vel.x *= 0.8;
        g.vel.z *= 0.8;
        if (Math.abs(g.vel.y) < 1) g.vel.y = 0;
      }
      const dx = pp.x - g.mesh.position.x;
      const dy = (pp.y - 0.5) - g.mesh.position.y;
      const dz = pp.z - g.mesh.position.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const magnetR = this.stats.magnet;
      if (playing && d < magnetR) {
        const pull = 26 * (1 - d / (magnetR * 1.4));
        g.mesh.position.x += (dx / (d + 0.001)) * pull * dt;
        g.mesh.position.y += (dy / (d + 0.001)) * pull * dt;
        g.mesh.position.z += (dz / (d + 0.001)) * pull * dt;
      }
      g.mesh.rotation.y += dt * 4;
      g.mesh.position.y += Math.sin(g.t * 5) * dt * 0.25;
      if (playing && d < 1.15) {
        this.gems++;
        this.gemsEarned++;
        this.score += 2;
        this.persist();
        audio.pickup();
        this.burst(g.mesh.position.clone(), 0x7df9ff, 5, 4, 0.14, 6, 0.35);
        this.pickupLight.position.copy(g.mesh.position);
        this.pickupLight.intensity = 4;
        this.scene.remove(g.mesh);
        this.gemsArr.splice(i, 1);
        this.emitHud(true);
      }
    }
    if (this.pickupLight.intensity > 0) this.pickupLight.intensity = Math.max(0, this.pickupLight.intensity - dt * 18);
  }

  updateFloaters(dt: number) {
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt;
      if (f.life <= 0) {
        this.scene.remove(f.sprite);
        f.tex.dispose();
        (f.sprite.material as THREE.Material).dispose();
        this.floaters.splice(i, 1);
        continue;
      }
      f.sprite.position.y += f.vel * dt;
      (f.sprite.material as THREE.SpriteMaterial).opacity = Math.min(1, (f.life / f.maxLife) * 2);
    }
  }

  updatePortals(dt: number) {
    for (let i = this.portals.length - 1; i >= 0; i--) {
      const p = this.portals[i];
      p.t += dt;
      p.mesh.scale.setScalar(Math.min(1.4, 0.4 + p.t * 2.2));
      p.mesh.rotation.y += dt * 5;
      if (p.t > 0.55 && !p.done) {
        p.done = true;
        this.spawnSlimeAt(p.kind, p.x, p.z);
      }
      if (p.t > 0.8) {
        this.scene.remove(p.mesh);
        this.portals.splice(i, 1);
      }
    }
  }

  updateGun(dt: number) {
    this.gunRecoil = Math.max(0, this.gunRecoil - dt * 5);
    this.swapT = Math.max(0, this.swapT - dt);
    const hv = Math.hypot(this.playerVel.x, this.playerVel.z);
    if (hv <= 1) this.bobT += dt * 0.5;
    const bob = Math.sin(this.bobT * 2.2) * 0.012 * (hv > 1 ? 1 : 0.4);
    const bobX = Math.cos(this.bobT * 1.1) * 0.008 * (hv > 1 ? 1 : 0.3);
    const want = this.firing || this.touchFiring;
    const kick = want ? Math.sin(performance.now() * 0.06) * 0.004 : 0;
    const sw = this.swapT * 1.5;
    const gm = this.gunModels[this.gunId];
    if (!gm) return;
    gm.group.position.set(0.34 + bobX, -0.32 + bob + kick - sw, -0.62 + this.gunRecoil * 0.9);
    gm.group.rotation.set(0.02 + this.gunRecoil * 0.9, -0.06, this.gunRecoil * 0.25);
  }

  /* ================= HUD ================= */
  emitHud(force = false) {
    const now = performance.now();
    if (!force && now - this.hudT < 90) return;
    this.hudT = now;
    const boss = this.slimes.find((s) => s.def.boss && !s.dead && s.spawnT <= 0);
    const levelMode = this.mode === 'levels';
    const L = LEVELS[this.levelIdx];
    this.cb.onHud({
      mode: this.mode,
      levelName: levelMode ? L.name : 'Endless',
      levelNo: levelMode ? this.levelIdx + 1 : 0,
      levelCount: LEVELS.length,
      waveNo: levelMode ? this.waveIdx + 1 : this.wave,
      waveTotal: levelMode ? L.waves : 0,
      hp: Math.max(0, Math.ceil(this.hp)),
      maxHp: this.stats.maxHp,
      wave: this.wave,
      score: this.score,
      gems: this.gems,
      kills: this.kills,
      alive: this.slimes.filter((s) => !s.dead && !s.ambient).length + this.spawnQueue.length + this.portals.length,
      combo: this.combo,
      comboT: this.comboT,
      dashT: Math.max(0, this.dashT),
      dashMax: this.dashCd,
      stats: { ...this.stats },
      time: this.runTime,
      gunId: this.gunId,
      owned: this.ownedList(),
      god: this.god,
      boss: boss ? { hp: Math.max(0, boss.hp), max: boss.maxHp, name: boss.def.name } : null,
    });
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('mousedown', this.boundMouseDown);
    window.removeEventListener('mouseup', this.boundMouseUp);
    window.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('wheel', this.boundWheel);
    document.removeEventListener('pointerlockchange', this.boundLockChange);
    window.removeEventListener('resize', this.boundResize);
    this.canvas.removeEventListener('contextmenu', this.boundContext);
    this.gunTextures.forEach((t) => t.dispose());
    this.balloonBursts.dispose();
    audio.setTrack('off');
    this.renderer.dispose();
  }
}
