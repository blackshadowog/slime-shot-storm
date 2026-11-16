/* ============ SLIMES ============ */
export type SlimeKind =
  | 'green' | 'blue' | 'pink' | 'orange' | 'gold' | 'mint' | 'mintling' | 'spiky' | 'ghost' | 'boss';

export interface SlimeDef {
  name: string;
  color: number;
  accent: number;
  scale: number;
  hp: number;
  speed: number;
  dmg: number;
  gems: [number, number];
  score: number;
  hop: number;
  mass: number;
  armor?: number;
  ghost?: boolean;
  flee?: boolean;
  splits?: boolean;
  boss?: boolean;
}

export const SLIMES: Record<SlimeKind, SlimeDef> = {
  green:    { name: 'Minty',   color: 0x67eb7a, accent: 0x34b856, scale: 1.0,  hp: 1.0,  speed: 3.1, dmg: 9,  gems: [1, 2],   score: 10,  hop: 1.1, mass: 1.0 },
  blue:     { name: 'Zippy',   color: 0x63ccff, accent: 0x2e85e0, scale: 0.82, hp: 0.7,  speed: 4.9, dmg: 6,  gems: [1, 2],   score: 15,  hop: 1.5, mass: 0.7 },
  pink:     { name: 'Bonk',    color: 0xff85cc, accent: 0xd94196, scale: 1.48, hp: 3.0,  speed: 2.1, dmg: 16, gems: [3, 5],   score: 30,  hop: 0.8, mass: 2.4 },
  orange:   { name: 'Bouncy',  color: 0xffab4a, accent: 0xe66f1f, scale: 1.1,  hp: 1.5,  speed: 3.8, dmg: 11, gems: [2, 3],   score: 20,  hop: 1.8, mass: 1.1 },
  gold:     { name: 'Goldie',  color: 0xffe04a, accent: 0xe09f18, scale: 0.9,  hp: 0.55, speed: 4.5, dmg: 5,  gems: [8, 13],  score: 60,  hop: 1.6, mass: 0.8, flee: true },
  mint:     { name: 'Split',   color: 0x82f5d4, accent: 0x33bd9b, scale: 1.2,  hp: 1.6,  speed: 3.0, dmg: 10, gems: [2, 3],   score: 25,  hop: 1.2, mass: 1.2, splits: true },
  mintling: { name: 'Mini',    color: 0x82f5d4, accent: 0x33bd9b, scale: 0.62, hp: 0.5,  speed: 4.3, dmg: 5,  gems: [1, 1],   score: 8,   hop: 1.4, mass: 0.6 },
  spiky:    { name: 'Berry',   color: 0x9fb4ff, accent: 0x5266c4, scale: 1.25, hp: 2.2,  speed: 2.6, dmg: 14, gems: [3, 4],   score: 35,  hop: 0.9, mass: 2.0, armor: 0.42 },
  ghost:    { name: 'Boo',     color: 0xf2ebff, accent: 0xa490dc, scale: 1.0,  hp: 0.9,  speed: 4.0, dmg: 8,  gems: [2, 3],   score: 25,  hop: 1.3, mass: 0.8, ghost: true },
  boss:     { name: 'King',    color: 0xbc82ff, accent: 0x7233db, scale: 2.6,  hp: 16.0, speed: 1.9, dmg: 26, gems: [25, 35], score: 300, hop: 0.9, mass: 5.0, boss: true },
};

/* ============ GUN ABILITIES ============ */
export type AbilityId =
  | 'balanced' | 'scatter' | 'bigknock' | 'rapid' | 'slow' | 'double'
  | 'pierce' | 'crit' | 'semi' | 'blast' | 'rocketjump' | 'charged';

export const ABILITIES: Record<AbilityId, { label: string; icon: string; tint: string }> = {
  balanced:   { label: 'All-Rounder',  icon: 'sparkle',  tint: '#8ce0ff' },
  scatter:    { label: '7-Pellet Fan', icon: 'scatter',  tint: '#ffb3d9' },
  bigknock:   { label: 'Heavy Knock',  icon: 'hammer',   tint: '#ffc48c' },
  rapid:      { label: 'Full-Auto 14/s', icon: 'zap',    tint: '#ffe680' },
  slow:       { label: 'Slime Slow',   icon: 'snow',     tint: '#b6ff9e' },
  double:     { label: 'Twin Shot',    icon: 'double',   tint: '#c8ff8c' },
  pierce:     { label: 'Pierces 3',    icon: 'arrow',    tint: '#d9c0ff' },
  crit:       { label: '+22% Crit',    icon: 'star',     tint: '#ffe066' },
  semi:       { label: 'Tap to Fire',  icon: 'target',   tint: '#ffc9a3' },
  blast:      { label: 'Area Blast',   icon: 'boom',     tint: '#ff9a8c' },
  rocketjump: { label: 'Rocket Jump',  icon: 'jump',     tint: '#ff8fc7' },
  charged:    { label: 'Big Damage',   icon: 'flame',    tint: '#ffb066' },
};

/* ============ GUNS ============ */
export type GunTex = 'dots' | 'gumball' | 'sprinkles' | 'goo' | 'hex' | 'candy';

export interface GunDef {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  cost: number;
  rate: number;
  damage: number;
  pellets: number;
  spread: number;
  speed: number;
  life: number;
  knock: number;
  pierce: number;
  blast: number;
  slow: number;
  recoil: number;
  crit: number;
  color: number;
  accent: number;
  size: number;
  stretch: number;
  auto: boolean;
  tex: GunTex;
  abilities: AbilityId[];
}

export const GUNS: GunDef[] = [
  {
    id: 'bubble', name: 'Bubble', icon: '🫧', blurb: 'Trusty starter blaster.',
    cost: 0, rate: 5.5, damage: 12, pellets: 1, spread: 0.012, speed: 40, life: 1.4,
    knock: 4.5, pierce: 0, blast: 0, slow: 0, recoil: 0.6, crit: 0.05,
    color: 0x8066ff, accent: 0x453599, size: 1.0, stretch: 1.0, auto: true,
    tex: 'dots', abilities: ['balanced'],
  },
  {
    id: 'gumdrop', name: 'Gumdrop', icon: '🍬', blurb: 'Point blank chaos.',
    cost: 45, rate: 1.6, damage: 9, pellets: 7, spread: 0.11, speed: 44, life: 0.4,
    knock: 9.5, pierce: 0, blast: 0, slow: 0, recoil: 4.8, crit: 0.05,
    color: 0xff80ba, accent: 0xd63c8f, size: 0.8, stretch: 1.0, auto: true,
    tex: 'gumball', abilities: ['scatter', 'bigknock'],
  },
  {
    id: 'sprinkle', name: 'Sprinkle', icon: '🌈', blurb: 'Never stop spraying.',
    cost: 65, rate: 14, damage: 5.5, pellets: 1, spread: 0.045, speed: 46, life: 1.1,
    knock: 1.8, pierce: 0, blast: 0, slow: 0, recoil: 0.2, crit: 0.05,
    color: 0xffdc47, accent: 0xff80ba, size: 0.7, stretch: 1.0, auto: true,
    tex: 'sprinkles', abilities: ['rapid'],
  },
  {
    id: 'glue', name: 'Glue', icon: '🧴', blurb: 'Slows the whole herd.',
    cost: 55, rate: 3.2, damage: 5, pellets: 2, spread: 0.07, speed: 30, life: 0.8,
    knock: 2.2, pierce: 0, blast: 0, slow: 2.8, recoil: 0.4, crit: 0.05,
    color: 0x92f27a, accent: 0x35b34f, size: 0.9, stretch: 1.0, auto: true,
    tex: 'goo', abilities: ['slow', 'double'],
  },
  {
    id: 'sniper', name: 'Honey', icon: '🍯', blurb: 'One tap, one slime.',
    cost: 85, rate: 1.2, damage: 85, pellets: 1, spread: 0.002, speed: 100, life: 1.2,
    knock: 9.5, pierce: 3, blast: 0, slow: 0, recoil: 3.0, crit: 0.22,
    color: 0xffb72b, accent: 0x995508, size: 0.65, stretch: 3.0, auto: false,
    tex: 'hex', abilities: ['pierce', 'crit', 'semi', 'charged'],
  },
  {
    id: 'rocket', name: 'Lollipop', icon: '🍭', blurb: 'Boom. Also: fly.',
    cost: 100, rate: 0.95, damage: 46, pellets: 1, spread: 0.01, speed: 24, life: 3.0,
    knock: 15, pierce: 0, blast: 3.8, slow: 0, recoil: 4.0, crit: 0.05,
    color: 0xff6294, accent: 0xffffff, size: 1.35, stretch: 1.4, auto: true,
    tex: 'candy', abilities: ['blast', 'rocketjump', 'bigknock'],
  },
];

/* ============ UPGRADES ============ */
export type UpgradeId = 'damage' | 'firerate' | 'multishot' | 'magnet' | 'maxhp' | 'speed' | 'crit' | 'pierce' | 'knock';

export interface UpgradeDef {
  name: string;
  tag: string;
  base: number;
  mult: number;
  max: number;
  gradient: string;
}

export const UPGRADE_DEFS: Record<UpgradeId, UpgradeDef> = {
  damage:    { name: 'Damage',    tag: '+25%', base: 18,  mult: 18,  max: 12, gradient: 'from-orange-400 to-rose-500' },
  firerate:  { name: 'Fire Rate', tag: '+18%', base: 18,  mult: 18,  max: 10, gradient: 'from-amber-300 to-orange-500' },
  multishot: { name: 'Multi',     tag: '+1',   base: 95,  mult: 140, max: 4,  gradient: 'from-fuchsia-400 to-purple-600' },
  knock:     { name: 'Knockback', tag: '+30%', base: 20,  mult: 20,  max: 8,  gradient: 'from-rose-300 to-pink-600' },
  magnet:    { name: 'Magnet',    tag: '+65%', base: 14,  mult: 14,  max: 8,  gradient: 'from-cyan-300 to-sky-500' },
  maxhp:     { name: 'Max HP',    tag: '+25',  base: 20,  mult: 20,  max: 10, gradient: 'from-emerald-300 to-green-600' },
  speed:     { name: 'Speed',     tag: '+12%', base: 14,  mult: 14,  max: 6,  gradient: 'from-lime-300 to-emerald-500' },
  crit:      { name: 'Crit',      tag: '+12%', base: 25,  mult: 28,  max: 8,  gradient: 'from-yellow-200 to-amber-500' },
  pierce:    { name: 'Pierce',    tag: '+1',   base: 70,  mult: 90,  max: 3,  gradient: 'from-violet-400 to-indigo-600' },
};

/* ============ THEMES ============ */
export type TreeStyle = 'round' | 'pine' | 'blossom' | 'palm' | 'candy' | 'mushroom' | 'cactus' | 'crystal' | 'cloud';

export interface Theme {
  name: string;
  sky: number;
  skyTop: string;
  skyHorizon: string;
  fog: number;
  hemiSky: number;
  hemiGround: number;
  sun: number;
  grassA: string;
  grassB: string;
  dirt: number;
  path: number;
  tree: TreeStyle;
  treeCols: number[];
  flowerCols: number[];
  rock: number;
  hill: number[];
  bush: number[];
  water: boolean;
  musicRoot: number;
}

export const THEMES: Theme[] = [
  { name: 'Sunny Meadow',  sky: 0x99d9ff, skyTop: '#56b4f5', skyHorizon: '#e9f8ff', fog: 0xbfe8ff, hemiSky: 0xdaf0ff, hemiGround: 0x7bc966, sun: 0xfff5cc, grassA: '#78d468', grassB: '#66c458', dirt: 0x9c6d49, path: 0xf4dfb8, tree: 'round',    treeCols: [0x52c762, 0x6ae875, 0x3eb354], flowerCols: [0xff88be, 0xffe04a, 0xffffff, 0xff9466, 0xc794ff], rock: 0xc4ccd4, hill: [0x79cf72, 0x96d9a8], bush: [0x4ec45d, 0x72e07a], water: true,  musicRoot: 0 },
  { name: 'Sakura Grove',  sky: 0xffdced, skyTop: '#f5a6d4', skyHorizon: '#fff2f8', fog: 0xffe5f2, hemiSky: 0xfff0f8, hemiGround: 0xc996b5, sun: 0xfff3f8, grassA: '#a0de87', grassB: '#8fd277', dirt: 0xa1715a, path: 0xf9e5d0, tree: 'blossom',  treeCols: [0xffa6cf, 0xffc7e2, 0xfff2f8], flowerCols: [0xffffff, 0xff9ecc, 0xffe570], rock: 0xdecad6, hill: [0xf2b3d4, 0xd9a8f5], bush: [0xffb8dc, 0xffd6eb], water: true,  musicRoot: 4 },
  { name: 'Candy Land',    sky: 0xc4f2ff, skyTop: '#8adfff', skyHorizon: '#fff0fb', fog: 0xdcf7ff, hemiSky: 0xffffff, hemiGround: 0xffbce3, sun: 0xffffff, grassA: '#ffd9f2', grassB: '#ffc8e8', dirt: 0xffb3d9, path: 0xfff5cb, tree: 'candy',    treeCols: [0xff6b9d, 0x7df9ff, 0xffe04a], flowerCols: [0xff6b9d, 0x7df9ff, 0xffe04a, 0xffffff], rock: 0xffe6f7, hill: [0xffb8e0, 0xb8ebff], bush: [0xffa3d4, 0xb3f2ff], water: false, musicRoot: 7 },
  { name: 'Coral Beach',   sky: 0x8be4ff, skyTop: '#3ec2f5', skyHorizon: '#e5fbff', fog: 0xc0f3ff, hemiSky: 0xdff8ff, hemiGround: 0xf7d89e, sun: 0xfff5d4, grassA: '#fae6ad', grassB: '#f2da96', dirt: 0xdcb87e, path: 0xffedc4, tree: 'palm',     treeCols: [0x34c777, 0x4ae092, 0x26a863], flowerCols: [0xff8585, 0xffd5a8, 0xffffff], rock: 0xe8cca6, hill: [0x82d6f5, 0xa8e3ff], bush: [0xffa694, 0x82decb], water: true,  musicRoot: 2 },
  { name: 'Frosty Peak',   sky: 0xd6f1ff, skyTop: '#89c7f5', skyHorizon: '#f5fbff', fog: 0xeaf8ff, hemiSky: 0xffffff, hemiGround: 0xa6d8ff, sun: 0xf5fcff, grassA: '#edfaff', grassB: '#dff4ff', dirt: 0xb3cee0, path: 0xe0f1ff, tree: 'pine',     treeCols: [0x3b9c87, 0x4bb59c, 0x2f8774], flowerCols: [0xffa6d6, 0xcabaff, 0xffffff], rock: 0xc5dced, hill: [0xd9efff, 0xc2e2ff], bush: [0x94dec5, 0xbfeadb], water: true,  musicRoot: 9 },
  { name: 'Mushroom Glen', sky: 0xd0bfff, skyTop: '#8e78e6', skyHorizon: '#f5edff', fog: 0xe0d4ff, hemiSky: 0xf4ebff, hemiGround: 0x92d68e, sun: 0xffedff, grassA: '#92de84', grassB: '#81d174', dirt: 0x826596, path: 0xede0ff, tree: 'mushroom', treeCols: [0xff7391, 0xffb8ca, 0x85e3ff], flowerCols: [0xfff2ad, 0xffb8ff, 0xffffff], rock: 0xc7b9db, hill: [0xb09ceb, 0x9682db], bush: [0xff96b6, 0xabf2a6], water: true,  musicRoot: 5 },
  { name: 'Desert Mesa',   sky: 0xffdeb3, skyTop: '#f5a96b', skyHorizon: '#fff4df', fog: 0xffebd0, hemiSky: 0xfff3db, hemiGround: 0xebb578, sun: 0xffe6b3, grassA: '#f5d28c', grassB: '#efc77f', dirt: 0xc2845a, path: 0xfae3b8, tree: 'cactus',   treeCols: [0x66d990, 0x4ec27d, 0x85e6a6], flowerCols: [0xff8266, 0xffd647, 0xffa6c4], rock: 0xd19877, hill: [0xe6a378, 0xd68b67], bush: [0xdca670, 0xebb980], water: false, musicRoot: 11 },
  { name: 'Rainbow Hills', sky: 0xb0ebff, skyTop: '#6ec4ff', skyHorizon: '#fff7e8', fog: 0xd6f6ff, hemiSky: 0xffffff, hemiGround: 0x85de64, sun: 0xfffce6, grassA: '#82e37e', grassB: '#70d66d', dirt: 0x946546, path: 0xfff2c9, tree: 'round',    treeCols: [0xff94b6, 0xffd670, 0x80e8ce, 0xa394ff], flowerCols: [0xff6699, 0xffd670, 0x80e8ce, 0xa394ff, 0xffffff], rock: 0xcbd4e3, hill: [0xffa6ce, 0xa6e6ff], bush: [0xff94b6, 0x80e8ce], water: true, musicRoot: 3 },
  { name: 'Cloud Kingdom', sky: 0xc7edff, skyTop: '#8ccdf7', skyHorizon: '#ffffff', fog: 0xe8f8ff, hemiSky: 0xffffff, hemiGround: 0xccebff, sun: 0xffffff, grassA: '#cef7c7', grassB: '#bef0b6', dirt: 0xcfe0f2, path: 0xfafcff, tree: 'cloud',    treeCols: [0xffffff, 0xfcfaff, 0xf0f9ff], flowerCols: [0xffffff, 0xffdcf2, 0xdcf2ff], rock: 0xebf3ff, hill: [0xf7fbff, 0xe0f0ff], bush: [0xffffff, 0xdcf7e3], water: false, musicRoot: 6 },
  { name: 'Crystal Crown', sky: 0x3b277d, skyTop: '#1f124f', skyHorizon: '#7058bd', fog: 0x49358f, hemiSky: 0xa699ff, hemiGround: 0x35286e, sun: 0xd6c7ff, grassA: '#756bc2', grassB: '#675db5', dirt: 0x483785, path: 0xa699e6, tree: 'crystal',  treeCols: [0x7df9ff, 0xff94e3, 0xbc9cff], flowerCols: [0x7df9ff, 0xff94e3, 0xffe694], rock: 0x857bc9, hill: [0x6c5cd1, 0x8575e3], bush: [0x7df9ff, 0xff94e3], water: true,  musicRoot: 8 },
];

/* ============ 100 LEVELS ============ */
export interface WorldDef {
  name: string;
  theme: number;
  levels: number;
  pool: Partial<Record<SlimeKind, number>>;
}

export const WORLDS: WorldDef[] = [
  { name: 'Sunny Meadow',  theme: 0, levels: 10, pool: { green: 10, blue: 2 } },
  { name: 'Sakura Grove',  theme: 1, levels: 10, pool: { green: 7, blue: 4, orange: 3 } },
  { name: 'Candy Land',    theme: 2, levels: 10, pool: { green: 5, blue: 4, pink: 3, mint: 2 } },
  { name: 'Coral Beach',   theme: 3, levels: 10, pool: { blue: 5, orange: 4, pink: 2, ghost: 2 } },
  { name: 'Frosty Peak',   theme: 4, levels: 10, pool: { blue: 4, pink: 4, spiky: 3 } },
  { name: 'Mushroom Glen', theme: 5, levels: 10, pool: { orange: 4, mint: 3, green: 4, ghost: 2 } },
  { name: 'Desert Mesa',   theme: 6, levels: 10, pool: { orange: 4, spiky: 4, pink: 3, gold: 1 } },
  { name: 'Rainbow Hills', theme: 7, levels: 10, pool: { green: 3, blue: 3, orange: 3, pink: 2, mint: 2, gold: 1 } },
  { name: 'Cloud Kingdom', theme: 8, levels: 10, pool: { ghost: 4, mint: 3, blue: 4, spiky: 3, pink: 3, gold: 2 } },
  { name: 'Crystal Crown', theme: 9, levels: 10, pool: { green: 2, blue: 2, orange: 2, pink: 2, mint: 2, spiky: 2, ghost: 2, gold: 1 } },
];

export interface LevelDef {
  code: string;
  name: string;
  world: number;
  theme: number;
  waves: number;
  boss: boolean;
  pool: Partial<Record<SlimeKind, number>>;
}

function poolFor(w: number, l: number): Partial<Record<SlimeKind, number>> {
  const base: Partial<Record<SlimeKind, number>> = { ...WORLDS[w].pool };
  if (l >= 2) base.blue = (base.blue || 0) + 2;
  if (l >= 3) base.orange = (base.orange || 0) + 2;
  if (l >= 4) base.mint = (base.mint || 0) + 2;
  if (l >= 5) base.pink = (base.pink || 0) + 2;
  if (l >= 6) base.spiky = (base.spiky || 0) + 2;
  if (l >= 7) base.ghost = (base.ghost || 0) + 2;
  if (l >= 8) base.gold = (base.gold || 0) + 1;
  return base;
}

export const LEVELS: LevelDef[] = (() => {
  const out: LevelDef[] = [];
  WORLDS.forEach((w, wi) => {
    for (let l = 0; l < w.levels; l++) {
      const boss = l === w.levels - 1 || (l === 4 && wi >= 1);
      out.push({
        code: `${wi + 1}-${l + 1}`,
        name: w.name,
        world: wi,
        theme: w.theme,
        waves: 3 + Math.min(3, Math.floor(l / 3)) + (wi >= 5 ? 1 : 0),
        boss,
        pool: poolFor(wi, l),
      });
    }
  });
  return out;
})();

export const LEVEL_COUNT = LEVELS.length;
