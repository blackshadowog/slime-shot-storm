import * as THREE from 'three';
import type { Theme } from './data';

export const ARENA_R = 29;

export interface World {
  group: THREE.Group;
  update: (t: number, dt: number) => void;
  dispose: () => void;
}

const rnd = Math.random;
const rr = (a: number, b: number) => a + rnd() * (b - a);
const WHITE = 0xffffff;
const TRUNK = 0x8d5e3c;

/* ---------- procedural smooth curved geometries ---------- */



/** Plump curved palm frond ribbon (smooth arch, rounded tip) */
function makePalmFrondGeo(): THREE.BufferGeometry {
  const segs = 8;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    const w = Math.sin(f * Math.PI) * 0.36 + 0.03 * (1 - f);
    const x = f * 2.3;
    const y = Math.sin(f * Math.PI * 0.72) * 0.55 - f * f * 0.55;
    pos.push(x, y, -w, x, y, w);
    if (i < segs) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** Soft rounded mushroom umbrella cap using LatheGeometry */
function makeMushroomCapGeo(): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const a = t * Math.PI * 0.55;
    const r = Math.sin(a) * 1.38;
    const y = Math.cos(a) * 0.85;
    pts.push(new THREE.Vector2(r, y));
  }
  pts.push(new THREE.Vector2(1.22, -0.08));
  pts.push(new THREE.Vector2(0.32, 0.08));
  return new THREE.LatheGeometry(pts, 24);
}

/** 5-petal plump flower crown merged into a single instancable geometry */
function makeFlowerCrownGeo(): THREE.BufferGeometry {
  const petal = new THREE.SphereGeometry(0.115, 10, 8);
  petal.scale(1.15, 0.36, 0.78);
  const srcPos = petal.attributes.position;
  const srcNorm = petal.attributes.normal;
  const srcIdx = petal.index!;
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const euler = new THREE.Euler();

  const petals = 5;
  for (let p = 0; p < petals; p++) {
    const a = (p / petals) * Math.PI * 2;
    const base = p * srcPos.count;
    euler.set(0, -a, 0.14);
    q.setFromEuler(euler);
    const ox = Math.cos(a) * 0.125;
    const oz = Math.sin(a) * 0.125;
    for (let i = 0; i < srcPos.count; i++) {
      v.fromBufferAttribute(srcPos, i).applyQuaternion(q);
      positions.push(v.x + ox, v.y, v.z + oz);
      n.fromBufferAttribute(srcNorm, i).applyQuaternion(q);
      normals.push(n.x, n.y, n.z);
    }
    for (let i = 0; i < srcIdx.count; i++) {
      indices.push(base + srcIdx.getX(i));
    }
  }
  petal.dispose();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  return geo;
}

/** Organic painterly meadow grass texture (ZERO checkerboard squares!) */
function makeMeadowTexture(a: string, b: string): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  const g = cv.getContext('2d')!;
  g.fillStyle = a;
  g.fillRect(0, 0, 512, 512);

  // Soft sunlit dappled organic patches
  for (let i = 0; i < 65; i++) {
    const x = rnd() * 512;
    const y = rnd() * 512;
    const r = 28 + rnd() * 72;
    const grad = g.createRadialGradient(x, y, 2, x, y, r);
    const col = i % 3 === 0 ? 'rgba(255,255,220,0.13)' : i % 2 === 0 ? b + '55' : 'rgba(40,120,45,0.09)';
    grad.addColorStop(0, col);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  // Soft painterly grass strokes
  g.lineCap = 'round';
  for (let i = 0; i < 330; i++) {
    const x = rnd() * 512;
    const y = rnd() * 512;
    const len = 5 + rnd() * 11;
    const ang = -Math.PI / 2 + (rnd() - 0.5) * 0.7;
    g.strokeStyle = rnd() > 0.45 ? 'rgba(255,255,255,0.12)' : 'rgba(25,90,35,0.12)';
    g.lineWidth = 1.5 + rnd() * 1.5;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    g.stroke();
  }

  // Tiny painted clover dots
  for (let i = 0; i < 90; i++) {
    g.fillStyle = rnd() > 0.35 ? 'rgba(255,255,255,0.18)' : 'rgba(255,240,140,0.22)';
    g.beginPath();
    g.arc(rnd() * 512, rnd() * 512, 1.8 + rnd() * 1.8, 0, Math.PI * 2);
    g.fill();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 9);
  return tex;
}

/** Vertical pastel sky dome texture */
function makeSkyTexture(top: string, horizon: string): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 256;
  const g = cv.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top);
  grad.addColorStop(0.45, top);
  grad.addColorStop(0.56, horizon);
  grad.addColorStop(1, horizon);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 256);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Cute rounded butterfly wing shape */
function makeWingGeo(): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.08, 0.14, 0.24, 0.16, 0.24, 0.04);
  s.bezierCurveTo(0.24, -0.02, 0.16, -0.05, 0.14, -0.05);
  s.bezierCurveTo(0.2, -0.09, 0.17, -0.17, 0.08, -0.14);
  s.bezierCurveTo(0.02, -0.12, 0, -0.05, 0, 0);
  return new THREE.ShapeGeometry(s, 10);
}

export function buildWorld(th: Theme): World {
  const group = new THREE.Group();
  const anim: ((t: number, dt: number) => void)[] = [];
  const textures: THREE.Texture[] = [];
  const mats: THREE.Material[] = [];
  const matCache = new Map<string, THREE.MeshStandardMaterial>();

  const M = (color: number, rough = 0.82, metal = 0, emissive = 0, emInt = 0) => {
    const k = `${color}|${rough}|${metal}|${emissive}|${emInt}`;
    let m = matCache.get(k);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color, roughness: rough, metalness: metal,
        emissive: emissive ? new THREE.Color(emissive) : undefined,
        emissiveIntensity: emInt,
      });
      matCache.set(k, m);
      mats.push(m);
    }
    return m;
  };

  const place = (
    geo: THREE.BufferGeometry, mat: THREE.Material,
    x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, shadow = true,
  ) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = shadow;
    m.receiveShadow = shadow;
    return m;
  };

  // Shared smooth reusable geometries
  const sph16 = new THREE.SphereGeometry(1, 18, 14);
  const sph12 = new THREE.SphereGeometry(1, 12, 10);
  const cyl12 = new THREE.CylinderGeometry(1, 1, 1, 14);
  const frondGeo = makePalmFrondGeo();
  const mushCapGeo = makeMushroomCapGeo();
  const flowerCrownGeo = makeFlowerCrownGeo();
  const wingGeo = makeWingGeo();

  /* ============ 1. GRADIENT SKY DOME + SUN + RAINBOW ============ */
  const skyTex = makeSkyTexture(th.skyTop, th.skyHorizon);
  textures.push(skyTex);
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false });
  mats.push(skyMat);
  group.add(new THREE.Mesh(new THREE.SphereGeometry(220, 32, 20), skyMat));

  // Glowing soft sun + warm halo
  const sunGroup = new THREE.Group();
  sunGroup.position.set(62, 58, -98);
  const sunCoreMat = new THREE.MeshBasicMaterial({ color: th.sun, fog: false });
  const sunHaloMat = new THREE.MeshBasicMaterial({ color: th.sun, transparent: true, opacity: 0.28, fog: false });
  mats.push(sunCoreMat, sunHaloMat);
  sunGroup.add(new THREE.Mesh(new THREE.CircleGeometry(7.5, 36), sunCoreMat));
  const halo = new THREE.Mesh(new THREE.CircleGeometry(14, 36), sunHaloMat);
  halo.position.z = -0.2;
  sunGroup.add(halo);
  sunGroup.lookAt(0, 0, 0);
  group.add(sunGroup);

  // Subtle dreamy pastel rainbow arc in the background sky
  const rbCols = [0xff8fb8, 0xffc478, 0xfff085, 0x8ef2a0, 0x8cd8ff, 0xc7a3ff];
  const rbGroup = new THREE.Group();
  rbGroup.position.set(-18, -6, -95);
  rbGroup.rotation.y = 0.25;
  rbCols.forEach((c, i) => {
    const rMat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.22, fog: false, depthWrite: false });
    mats.push(rMat);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(62 - i * 1.4, 0.72, 8, 64, Math.PI), rMat);
    rbGroup.add(arc);
  });
  group.add(rbGroup);

  /* ============ 2. LUSH PAINTERLY MEADOW + STEPPING STONES ============ */
  const grassTex = makeMeadowTexture(th.grassA, th.grassB);
  textures.push(grassTex);
  const groundMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.94 });
  mats.push(groundMat);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(37, 72), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // Soft rounded earthen island skirt + lush grassy lip
  const grassLip = new THREE.Mesh(new THREE.TorusGeometry(36.5, 1.3, 14, 72), M(new THREE.Color(th.grassB).getHex(), 0.92));
  grassLip.rotation.x = Math.PI / 2;
  grassLip.position.y = -0.35;
  group.add(grassLip);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(36.2, 29, 8.5, 56), M(th.dirt, 0.98));
  rim.position.y = -4.55;
  group.add(rim);

  // Cute circular central stepping-stone garden patio
  const centerStone = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.75, 0.08, 36), M(th.path, 0.92));
  centerStone.position.y = 0.02;
  centerStone.receiveShadow = true;
  group.add(centerStone);
  const centerRing = new THREE.Mesh(new THREE.TorusGeometry(2.72, 0.16, 10, 36), M(th.rock, 0.9));
  centerRing.rotation.x = Math.PI / 2;
  centerRing.position.y = 0.04;
  group.add(centerRing);

  // Curved natural round stepping stones radiating along 4 garden paths
  const stepMat = M(th.path, 0.9);
  for (let p = 0; p < 4; p++) {
    const baseA = (p * Math.PI) / 2 + 0.35;
    for (let s = 0; s < 14; s++) {
      const dist = 4.2 + s * 1.72;
      const curve = Math.sin(s * 0.45) * 0.08;
      const a = baseA + curve;
      const sx = rr(0.62, 0.92);
      const sz = rr(0.55, 0.85);
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.08, 0.09, 16), stepMat);
      stone.position.set(Math.cos(a) * dist, 0.025, Math.sin(a) * dist);
      stone.scale.set(sx, 1, sz);
      stone.rotation.y = rnd() * Math.PI;
      stone.receiveShadow = true;
      group.add(stone);
    }
  }

  /* ============ 3. COZY NATURE POND + LOTUS + RUBBER DUCKY ============ */
  if (th.water) {
    const px = -13.5, pz = -9.5;
    const pondG = new THREE.Group();
    pondG.position.set(px, 0, pz);

    // Smooth recessed pond bed + sparkling water
    const bed = new THREE.Mesh(new THREE.CircleGeometry(4.5, 44), M(0x3ba8cc, 0.9));
    bed.rotation.x = -Math.PI / 2;
    bed.position.y = 0.02;
    pondG.add(bed);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x7ae2ff, roughness: 0.08, metalness: 0.18,
      transparent: true, opacity: 0.84, emissive: 0x3ec8f5, emissiveIntensity: 0.14,
    });
    mats.push(waterMat);
    const water = new THREE.Mesh(new THREE.CircleGeometry(4.35, 44), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.06;
    pondG.add(water);

    // Gentle expanding ripple ring on water
    const ripMat = new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.45, depthWrite: false });
    mats.push(ripMat);
    const ripple = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.56, 32), ripMat);
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.y = 0.075;
    pondG.add(ripple);

    // Smooth rounded river pebbles circling shoreline (NO dodecahedrons!)
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 + rr(-0.08, 0.08);
      const r = 4.35 + rr(-0.2, 0.25);
      const sz = rr(0.32, 0.62);
      const peb = place(sph12, M(th.rock, 0.88), Math.cos(a) * r, sz * 0.28, Math.sin(a) * r, sz * rr(0.9, 1.3), sz * 0.5, sz);
      peb.rotation.y = rnd() * Math.PI;
      pondG.add(peb);
    }

    // Mini curved wooden pier planks
    const pierG = new THREE.Group();
    pierG.position.set(3.8, 0.22, 1.2);
    pierG.rotation.y = -0.35;
    const plankGeo = new THREE.CapsuleGeometry(0.14, 1.4, 6, 12);
    for (let i = 0; i < 5; i++) {
      const pl = place(plankGeo, M(0xb88256, 0.85), -0.9 + i * 0.34, 0, 0);
      pl.rotation.x = Math.PI / 2;
      pierG.add(pl);
    }
    for (const z of [-0.65, 0.65]) {
      pierG.add(place(cyl12, M(TRUNK, 0.9), -0.65, -0.18, z, 0.1, 0.48, 0.1));
      pierG.add(place(sph12, M(TRUNK, 0.9), -0.65, 0.08, z, 0.12, 0.12, 0.12));
    }
    pondG.add(pierG);

    // Notched lily pads + multi-petal pink lotus flowers
    const padGeo = new THREE.CircleGeometry(0.55, 22, 0.28, Math.PI * 1.85);
    const padMat = M(0x5ed96e, 0.7);
    const lotusPositions = [[-2.1, -1.2], [-1.3, 1.6], [1.4, -1.9], [0.4, 2.3], [-2.8, 0.5], [2.1, -0.6]];
    lotusPositions.forEach(([lx, lz], i) => {
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.rotation.set(-Math.PI / 2, 0, rnd() * 6);
      pad.position.set(lx, 0.085, lz);
      pad.scale.setScalar(rr(0.75, 1.2));
      pondG.add(pad);
      if (i % 2 === 0) {
        const lotus = new THREE.Group();
        lotus.position.set(lx, 0.16, lz);
        for (let p = 0; p < 6; p++) {
          const a = (p / 6) * Math.PI * 2;
          const pet = place(sph12, M(0xff99cc, 0.4), Math.cos(a) * 0.14, 0.04, Math.sin(a) * 0.14, 0.14, 0.07, 0.09, false);
          pet.rotation.y = -a;
          lotus.add(pet);
        }
        lotus.add(place(sph12, M(0xffe04a, 0.4), 0, 0.08, 0, 0.1, 0.08, 0.1, false));
        pondG.add(lotus);
      }
    });

    // Cute bobbing rubber ducky!
    const duck = new THREE.Group();
    const dYellow = M(0xffe047, 0.35);
    const dBill = M(0xff8c38, 0.4);
    const dEye = M(0x241b3a, 0.2);
    duck.add(place(sph16, dYellow, 0, 0.22, 0, 0.34, 0.26, 0.42, true));
    duck.add(place(sph16, dYellow, 0, 0.48, 0.24, 0.22, 0.21, 0.22, true));
    duck.add(place(sph12, dYellow, 0, 0.33, -0.34, 0.13, 0.12, 0.16, false)); // tail
    duck.add(place(sph12, dBill, 0, 0.45, 0.44, 0.12, 0.06, 0.12, false)); // bill
    duck.add(place(sph12, dEye, -0.1, 0.53, 0.39, 0.04, 0.045, 0.03, false));
    duck.add(place(sph12, dEye, 0.1, 0.53, 0.39, 0.04, 0.045, 0.03, false));
    pondG.add(duck);

    anim.push((t) => {
      const a = t * 0.38;
      duck.position.set(Math.cos(a) * 1.15, Math.sin(t * 3.2) * 0.045, Math.sin(a) * 0.95);
      duck.rotation.y = -a;
      duck.rotation.z = Math.sin(t * 2.5) * 0.08;
      const rk = (t * 0.65) % 1;
      ripple.position.set(duck.position.x, 0.075, duck.position.z);
      ripple.scale.setScalar(0.6 + rk * 2.6);
      ripMat.opacity = 0.45 * (1 - rk);
    });

    group.add(pondG);
  }

  /* ============ 4. COZY ROUNDED LOG FENCE + WARM FAIRY LIGHTS ============ */
  const postMat = M(0xfff1d6, 0.72);
  const capMat = M(th.treeCols[0] ?? 0xff9ec7, 0.55);
  const bulbCols = [0xffe885, 0xffa6d4, 0x8ceeff, 0xa8ff9c];
  const posts = 48;
  const bulbMeshes: THREE.Mesh[] = [];

  for (let i = 0; i < posts; i++) {
    const a = (i / posts) * Math.PI * 2;
    const x = Math.cos(a) * ARENA_R;
    const z = Math.sin(a) * ARENA_R;
    // Smooth cylindrical wooden post + smooth ball top (zero boxes/cones!)
    group.add(place(cyl12, postMat, x, 0.62, z, 0.14, 1.24, 0.14));
    group.add(place(sph12, capMat, x, 1.3, z, 0.19, 0.19, 0.19));

    // Cute warm glowing fairy-light bulbs draped between posts
    const aNext = ((i + 1) / posts) * Math.PI * 2;
    for (const f of [0.33, 0.67]) {
      const am = a + (aNext - a) * f;
      const droop = Math.sin(f * Math.PI) * 0.22;
      const bc = bulbCols[(i + (f > 0.5 ? 1 : 0)) % bulbCols.length];
      const b = place(
        sph12, M(bc, 0.25, 0, bc, 1.15),
        Math.cos(am) * ARENA_R, 1.52 - droop, Math.sin(am) * ARENA_R,
        0.1, 0.12, 0.1, false,
      );
      b.userData.ph = i * 0.7 + f * 3;
      group.add(b);
      bulbMeshes.push(b);
    }
  }
  for (const h of [0.46, 0.92]) {
    const rail = new THREE.Mesh(new THREE.TorusGeometry(ARENA_R, 0.07, 10, 96), postMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = h;
    group.add(rail);
  }
  // Soft rope wire holding the fairy lights
  const wire = new THREE.Mesh(new THREE.TorusGeometry(ARENA_R, 0.02, 6, 96), M(0x5a4538, 0.9));
  wire.rotation.x = Math.PI / 2;
  wire.position.y = 1.54;
  group.add(wire);

  /* ============ 5. COZY 3D SHOP STALL (OUTSIDE FENCE!) ============ */
  const stall = new THREE.Group();
  const stallAngle = -0.82;
  stall.position.set(Math.cos(stallAngle) * (ARENA_R + 4.4), 0, Math.sin(stallAngle) * (ARENA_R + 4.4));
  stall.lookAt(0, 0, 0);
  const woodM = M(0xc88b5a, 0.8);
  const woodDark = M(0x8a5836, 0.85);
  // Rounded counter built from capsules/cylinders
  const counterBody = place(new THREE.CapsuleGeometry(0.65, 2.4, 8, 16), woodM, 0, 0.65, 0);
  counterBody.rotation.z = Math.PI / 2;
  stall.add(counterBody);
  const counterTop = place(new THREE.CapsuleGeometry(0.18, 2.9, 8, 14), M(0xfff1d6, 0.6), 0, 1.28, 0);
  counterTop.rotation.z = Math.PI / 2;
  stall.add(counterTop);
  // 4 round support poles
  for (const sx of [-1.45, 1.45]) for (const sz of [-0.5, 0.5]) {
    stall.add(place(cyl12, woodDark, sx, 1.65, sz, 0.09, 3.3, 0.09));
  }
  // Plump scalloped pastel-striped awning!
  const awningCols = [0xff7eb6, 0xfff5e6];
  for (let i = 0; i < 7; i++) {
    const seg = place(
      new THREE.CapsuleGeometry(0.28, 1.45, 8, 12),
      M(awningCols[i % 2], 0.55),
      -1.5 + i * 0.5, 3.2, 0.05,
    );
    seg.rotation.x = Math.PI / 2 + 0.22;
    stall.add(seg);
  }
  // Cute glowing jam jars & gems sitting on the shop counter
  const jarCols = [0x67eb7a, 0xff85cc, 0x63ccff, 0xffe04a];
  jarCols.forEach((jc, i) => {
    stall.add(place(cyl12, M(jc, 0.25, 0, jc, 0.45), -0.9 + i * 0.6, 1.58, 0.15, 0.14, 0.26, 0.14));
    stall.add(place(sph12, M(0xfff1d6, 0.5), -0.9 + i * 0.6, 1.73, 0.15, 0.15, 0.07, 0.15, false));
  });
  // Swinging warm lantern
  const lantern = place(sph12, M(0xffe98a, 0.2, 0, 0xffd24d, 1.4), 0, 2.7, 0.72, 0.22, 0.26, 0.22, false);
  stall.add(lantern);
  group.add(stall);

  /* ============ 6. REAL MULTI-PETAL FLOWERS (INSTANCED) ============ */
  const CLUSTERS = 56;
  const PER = 5;
  const FN = CLUSTERS * PER;
  const stemGeo = new THREE.CylinderGeometry(0.022, 0.028, 0.44, 6);
  const centerGeo = new THREE.SphereGeometry(0.075, 10, 8);
  const leafGeo = new THREE.SphereGeometry(0.08, 8, 6);
  leafGeo.scale(1.6, 0.28, 0.85);

  const stems = new THREE.InstancedMesh(stemGeo, M(0x46b856, 0.88), FN);
  const leaves = new THREE.InstancedMesh(leafGeo, M(0x52cc62, 0.85), FN);
  const crowns = new THREE.InstancedMesh(flowerCrownGeo, new THREE.MeshStandardMaterial({ color: WHITE, roughness: 0.45 }), FN);
  const centers = new THREE.InstancedMesh(centerGeo, M(0xffe04a, 0.4, 0, 0xffcf33, 0.18), FN);
  mats.push(crowns.material as THREE.Material);

  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  let fi = 0;
  for (let c = 0; c < CLUSTERS; c++) {
    const a = rnd() * Math.PI * 2;
    const r = 3.5 + rnd() * (ARENA_R - 5.2);
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
    // Keep out of pond
    if (th.water && Math.hypot(cx + 13.5, cz + 9.5) < 5.3) continue;
    for (let f = 0; f < PER && fi < FN; f++) {
      const x = cx + rr(-1.1, 1.1), z = cz + rr(-1.1, 1.1);
      const sc = rr(0.75, 1.25);
      const tiltX = rr(-0.18, 0.18);
      const tiltZ = rr(-0.18, 0.18);
      const rotY = rnd() * Math.PI * 2;

      dummy.position.set(x, 0.21 * sc, z);
      dummy.rotation.set(tiltX, rotY, tiltZ);
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      stems.setMatrixAt(fi, dummy.matrix);

      dummy.position.set(x + Math.cos(rotY) * 0.08 * sc, 0.12 * sc, z + Math.sin(rotY) * 0.08 * sc);
      dummy.rotation.set(0.25, rotY, 0);
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      leaves.setMatrixAt(fi, dummy.matrix);

      const hy = 0.44 * sc;
      const hx = x + tiltZ * -0.18 * sc;
      const hz = z + tiltX * 0.18 * sc;
      dummy.position.set(hx, hy, hz);
      dummy.rotation.set(tiltX * 1.2, rotY, tiltZ * 1.2);
      dummy.scale.setScalar(sc);
      dummy.updateMatrix();
      crowns.setMatrixAt(fi, dummy.matrix);
      crowns.setColorAt(fi, col.set(th.flowerCols[Math.floor(rnd() * th.flowerCols.length)]));

      dummy.position.set(hx, hy + 0.03 * sc, hz);
      dummy.scale.set(sc, sc * 0.72, sc);
      dummy.updateMatrix();
      centers.setMatrixAt(fi, dummy.matrix);
      fi++;
    }
  }
  stems.count = leaves.count = crowns.count = centers.count = fi;
  group.add(stems, leaves, crowns, centers);

  /* ============ 7. AIRY MEADOW — sparse clover dots, no dense grass ============ */
  const CN = 90;
  const cloverGeo = new THREE.SphereGeometry(0.11, 10, 8);
  cloverGeo.scale(1.5, 0.34, 1.5);
  const cloverMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(th.grassB).multiplyScalar(1.06), roughness: 0.9,
  });
  mats.push(cloverMat);
  const clovers = new THREE.InstancedMesh(cloverGeo, cloverMat, CN);
  for (let i = 0; i < CN; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 4 + rnd() * (ARENA_R - 6);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    dummy.position.set(x, 0.04, z);
    dummy.rotation.set(0, rnd() * Math.PI, 0);
    dummy.scale.setScalar(rr(0.7, 1.3));
    dummy.updateMatrix();
    clovers.setMatrixAt(i, dummy.matrix);
  }
  clovers.castShadow = false;
  group.add(clovers);

  /* ============ 8. PLUMP BERRY BUSHES + SMOOTH PEBBLE BOULDERS + TOADSTOOLS ============ */
  const bushes: THREE.Group[] = [];
  for (let i = 0; i < 24; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 5 + rnd() * (ARENA_R - 8);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (th.water && Math.hypot(x + 13.5, z + 9.5) < 5.8) continue;
    const bush = new THREE.Group();
    for (let j = 0; j < 4; j++) {
      const s = rr(0.5, 0.85);
      const ang = (j / 4) * Math.PI * 2;
      bush.add(place(sph16, M(th.bush[j % th.bush.length], 0.85), Math.cos(ang) * 0.42, s * 0.56, Math.sin(ang) * 0.42, s, s * 0.82, s));
    }
    // Cute shiny berries peeking out
    const bCol = th.flowerCols[i % th.flowerCols.length];
    for (let b = 0; b < 5; b++) {
      const ba = rnd() * Math.PI * 2;
      bush.add(place(sph12, M(bCol, 0.3), Math.cos(ba) * 0.72, rr(0.35, 0.72), Math.sin(ba) * 0.72, 0.1, 0.1, 0.1, false));
    }
    bush.position.set(x, 0, z);
    bush.userData.ph = rnd() * 10;
    group.add(bush);
    bushes.push(bush);
  }

  // Smooth river boulders (NO flat-shaded polygons!)
  for (let i = 0; i < 18; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 4 + rnd() * (ARENA_R - 5.5);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (th.water && Math.hypot(x + 13.5, z + 9.5) < 5.3) continue;
    const sz = rr(0.45, 0.9);
    const rock = place(sph16, M(th.rock, 0.92), x, sz * 0.28, z, sz * rr(0.95, 1.3), sz * 0.52, sz * rr(0.85, 1.15));
    rock.rotation.y = rnd() * Math.PI;
    group.add(rock);
  }

  // Cute tiny red-spotted storybook toadstools scattered near outer edge
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2;
    const r = ARENA_R - rr(2.2, 7.5);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (th.water && Math.hypot(x + 13.5, z + 9.5) < 5.2) continue;
    const mg = new THREE.Group();
    const sc = rr(0.35, 0.55);
    mg.add(place(cyl12, M(0xfff1dc, 0.8), 0, 0.3, 0, 0.16, 0.6, 0.16));
    mg.add(place(mushCapGeo, M(0xff6b8a, 0.45), 0, 0.52, 0, 0.45, 0.45, 0.45));
    for (let s = 0; s < 4; s++) {
      const sa = (s / 4) * Math.PI * 2 + 0.4;
      mg.add(place(sph12, M(WHITE, 0.5), Math.cos(sa) * 0.34, 0.78, Math.sin(sa) * 0.34, 0.08, 0.04, 0.08, false));
    }
    mg.position.set(x, 0, z);
    mg.scale.setScalar(sc);
    group.add(mg);
  }

  /* ============ 9. LUSH SMOOTH ORGANIC TREES (ZERO TRIANGLES!) ============ */
  const trees: THREE.Group[] = [];
  const spinCrystals: THREE.Mesh[] = [];

  const makeCuteTree = () => {
    const g = new THREE.Group();
    const c = (i: number) => th.treeCols[i % th.treeCols.length];

    switch (th.tree) {
      case 'blossom': {
        const bark = M(0x734e3f, 0.9);
        const tr = place(new THREE.CylinderGeometry(0.24, 0.42, 2.4, 14), bark, 0, 1.2, 0);
        tr.rotation.z = 0.06;
        g.add(tr);
        const br = place(new THREE.CylinderGeometry(0.11, 0.18, 1.2, 10), bark, 0.45, 2.2, 0.1);
        br.rotation.z = -0.6;
        g.add(br);
        const puffs: [number, number, number, number, number][] = [
          [0, 3.25, 0, 1.55, 0], [1.05, 2.75, 0.4, 1.15, 1], [-0.95, 2.85, -0.3, 1.2, 2],
          [0.2, 3.9, -0.35, 1.05, 1], [-0.45, 3.3, 0.85, 0.95, 0],
        ];
        puffs.forEach(([px, py, pz, r, ci]) => g.add(place(sph16, M(c(ci), 0.72), px, py, pz, r, r * 0.84, r)));
        break;
      }
      case 'pine': {
        // Soft rounded tiered evergreen puffs — zero sharp cones!
        g.add(place(new THREE.CylinderGeometry(0.26, 0.4, 1.9, 14), M(TRUNK, 0.9), 0, 0.95, 0));
        const tiers = [
          { y: 2.05, r: 1.75, n: 6, ci: 0 },
          { y: 3.15, r: 1.35, n: 5, ci: 1 },
          { y: 4.15, r: 0.92, n: 4, ci: 2 },
        ];
        tiers.forEach((tier) => {
          g.add(place(sph16, M(c(tier.ci), 0.85), 0, tier.y, 0, tier.r * 0.85, tier.r * 0.62, tier.r * 0.85));
          for (let i = 0; i < tier.n; i++) {
            const a = (i / tier.n) * Math.PI * 2 + tier.y;
            g.add(place(sph12, M(c(tier.ci), 0.85), Math.cos(a) * tier.r * 0.52, tier.y - 0.12, Math.sin(a) * tier.r * 0.52, tier.r * 0.56, tier.r * 0.42, tier.r * 0.56));
          }
        });
        // Soft snowy puff on top!
        g.add(place(sph16, M(WHITE, 0.65), 0, 4.85, 0, 0.68, 0.46, 0.68));
        break;
      }
      case 'palm': {
        const bark = M(0xcba16b, 0.88);
        for (let i = 0; i < 6; i++) {
          const t = i / 5;
          const seg = place(new THREE.CylinderGeometry(0.2 - t * 0.05, 0.24 - t * 0.05, 0.82, 12), bark, Math.sin(t * 1.1) * 0.6, 0.4 + i * 0.68, 0);
          seg.rotation.z = -0.18 + t * 0.12;
          g.add(seg);
        }
        const topX = Math.sin(1.1) * 0.6, topY = 4.25;
        const frondMat = new THREE.MeshStandardMaterial({ color: c(0), roughness: 0.72, side: THREE.DoubleSide });
        mats.push(frondMat);
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          const fr = new THREE.Mesh(frondGeo, frondMat);
          fr.position.set(topX, topY, 0);
          fr.rotation.y = a;
          fr.castShadow = true;
          g.add(fr);
        }
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          g.add(place(sph12, M(0x7c4f2e, 0.75), topX + Math.cos(a) * 0.24, topY - 0.18, Math.sin(a) * 0.24, 0.18, 0.2, 0.18));
        }
        break;
      }
      case 'candy': {
        g.add(place(new THREE.CylinderGeometry(0.13, 0.15, 3.0, 14), M(WHITE, 0.4), 0, 1.5, 0));
        g.add(place(sph16, M(c(0), 0.28), 0, 3.55, 0, 1.15, 1.15, 0.72));
        const swirl = place(new THREE.TorusGeometry(0.68, 0.14, 12, 32), M(WHITE, 0.3), 0, 3.55, 0.46);
        g.add(swirl);
        const swirl2 = place(new THREE.TorusGeometry(0.32, 0.11, 10, 24), M(c(2), 0.3), 0, 3.55, 0.56);
        g.add(swirl2);
        break;
      }
      case 'mushroom': {
        const stalk = place(new THREE.CylinderGeometry(0.3, 0.48, 2.2, 16), M(0xfff1dc, 0.8), 0, 1.1, 0);
        stalk.rotation.z = 0.05;
        g.add(stalk);
        g.add(place(mushCapGeo, M(c(0), 0.45), 0, 2.05, 0, 1.15, 1.15, 1.15));
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          g.add(place(sph12, M(WHITE, 0.5), Math.cos(a) * 0.88, 2.66, Math.sin(a) * 0.88, 0.22, 0.1, 0.22, false));
        }
        g.add(place(sph12, M(WHITE, 0.5), 0, 3.0, 0, 0.24, 0.1, 0.24, false));
        break;
      }
      case 'cactus': {
        const cMat = M(c(0), 0.75);
        g.add(place(new THREE.CapsuleGeometry(0.42, 2.2, 10, 16), cMat, 0, 1.55, 0));
        for (const sd of [-1, 1]) {
          const armH = place(new THREE.CapsuleGeometry(0.22, 0.65, 8, 12), cMat, sd * 0.6, 1.75 + sd * 0.15, 0);
          armH.rotation.z = Math.PI / 2;
          g.add(armH);
          g.add(place(new THREE.CapsuleGeometry(0.22, 0.85, 8, 12), cMat, sd * 0.95, 2.25 + sd * 0.15, 0));
        }
        // Cute blooming pink blossom on top of cactus!
        g.add(place(flowerCrownGeo, M(0xff85bc, 0.4), 0, 3.12, 0, 1.9, 1.9, 1.9, false));
        g.add(place(sph12, M(0xffe04a, 0.4), 0, 3.18, 0, 0.14, 0.1, 0.14, false));
        break;
      }
      case 'cloud': {
        g.add(place(new THREE.CylinderGeometry(0.08, 0.1, 1.4, 10), M(0xffe9a3, 0.5, 0, 0xffd24d, 0.3), 0, 0.7, 0));
        const puffs: [number, number, number, number][] = [[0, 2.25, 0, 1.2], [-0.95, 2.0, 0.25, 0.92], [0.95, 2.0, -0.2, 0.92], [0.1, 2.65, -0.35, 0.82]];
        puffs.forEach(([x, y, z, r], i) => g.add(place(sph16, M(c(i), 0.6, 0, WHITE, 0.12), x, y, z, r, r * 0.72, r)));
        break;
      }
      case 'crystal': {
        g.add(place(sph16, M(0x5d50b0, 0.75), 0, 0.35, 0, 1.0, 0.55, 1.0));
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          const col = c(i);
          const orb = place(new THREE.CapsuleGeometry(0.32, 0.9 + rr(0, 0.6), 10, 16), M(col, 0.18, 0.1, col, 0.55), Math.cos(a) * 0.55, 1.25 + rr(0, 0.35), Math.sin(a) * 0.55);
          orb.rotation.z = Math.cos(a) * 0.22;
          orb.rotation.x = Math.sin(a) * 0.22;
          g.add(orb);
        }
        const floatOrb = place(sph16, M(0x7df9ff, 0.15, 0.1, 0x7df9ff, 0.9), 0, 2.75, 0, 0.45, 0.45, 0.45, false);
        spinCrystals.push(floatOrb);
        g.add(floatOrb);
        break;
      }
      case 'round':
      default: {
        const bark = M(TRUNK, 0.9);
        g.add(place(new THREE.CylinderGeometry(0.28, 0.46, 2.4, 14), bark, 0, 1.2, 0));
        const br = place(new THREE.CylinderGeometry(0.12, 0.2, 1.1, 10), bark, -0.45, 2.15, 0.15);
        br.rotation.z = 0.62;
        g.add(br);
        const puffs: [number, number, number, number, number][] = [
          [0, 3.25, 0, 1.55, 0], [1.02, 2.65, 0.38, 1.12, 1], [-0.95, 2.75, -0.28, 1.18, 2],
          [0.25, 3.85, -0.3, 1.02, 1], [-0.3, 3.1, 0.9, 0.92, 0],
        ];
        puffs.forEach(([px, py, pz, r, ci]) => g.add(place(sph16, M(c(ci), 0.78), px, py, pz, r, r * 0.86, r)));
        // Cute shiny red apples / hanging berries
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + 0.5;
          g.add(place(sph12, M(0xff5e78, 0.3), Math.cos(a) * 1.22, 2.65 + rr(-0.2, 0.5), Math.sin(a) * 1.22, 0.16, 0.16, 0.16, false));
        }
        break;
      }
    }
    return g;
  };

  const placeTree = (a: number, r: number, scaleMin: number, scaleMax: number) => {
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (th.water && Math.hypot(x + 13.5, z + 9.5) < 6.4) return;
    // Keep clear of shop stall
    if (Math.hypot(x - stall.position.x, z - stall.position.z) < 5.5) return;
    const t = makeCuteTree();
    t.position.set(x, th.tree === 'cloud' ? rr(1.8, 3.2) : 0, z);
    t.rotation.y = rnd() * Math.PI * 2;
    t.scale.setScalar(rr(scaleMin, scaleMax));
    t.userData.ph = rnd() * 10;
    group.add(t);
    trees.push(t);
  };

  for (let i = 0; i < 22; i++) placeTree((i / 22) * Math.PI * 2 + rr(-0.1, 0.1), ARENA_R + rr(4.5, 13), 0.95, 1.4);
  for (let i = 0; i < 7; i++) placeTree((i / 7) * Math.PI * 2 + 0.5, ARENA_R - rr(4.2, 6.2), 0.85, 1.08);

  /* ============ 10. SMOOTH ROLLING HILLS (ZERO TRIANGLE MOUNTAINS!) ============ */
  const hillGeo = new THREE.SphereGeometry(1, 28, 18);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rr(-0.1, 0.1);
    const r = 64 + rr(-4, 10);
    const w = rr(18, 28);
    const h = rr(8, 16);
    const hill = place(hillGeo, M(th.hill[0], 0.95), Math.cos(a) * r, -2.5, Math.sin(a) * r, w, h, w * rr(0.7, 1.1), false);
    group.add(hill);
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + 0.24;
    const r = 104 + rr(-6, 14);
    const w = rr(28, 42);
    const h = rr(15, 26);
    const farHill = place(hillGeo, M(th.hill[1] ?? th.hill[0], 0.98), Math.cos(a) * r, -4, Math.sin(a) * r, w, h, w * rr(0.75, 1.1), false);
    group.add(farHill);
  }

  /* ============ 11. FLUFFY CLOUDS ============ */
  const cloudMat = M(WHITE, 0.95, 0, WHITE, 0.14);
  const clouds: { g: THREE.Group; sp: number; baseY: number; ph: number }[] = [];
  for (let i = 0; i < 11; i++) {
    const cg = new THREE.Group();
    const puffs: [number, number, number, number][] = [
      [0, 0.4, 0, 2.4], [-2.1, 0, 0.3, 1.8], [2.1, 0.1, -0.2, 1.9], [-0.9, 0.9, -0.5, 1.5], [1.1, 0.8, 0.5, 1.4],
    ];
    puffs.forEach(([x, y, z, r]) => cg.add(place(sph16, cloudMat, x, y, z, r, r * 0.66, r, false)));
    const a = rnd() * Math.PI * 2;
    const by = 18 + rnd() * 14;
    cg.position.set(Math.cos(a) * (34 + rnd() * 58), by, Math.sin(a) * (34 + rnd() * 58));
    cg.scale.setScalar(rr(0.9, 1.65));
    group.add(cg);
    clouds.push({ g: cg, sp: 0.35 + (i % 3) * 0.22, baseY: by, ph: rnd() * 10 });
  }

  /* ============ 12. BUTTERFLIES + SUNLIT POLLEN MOTES ============ */
  const bflies: { g: THREE.Group; wl: THREE.Mesh; wr: THREE.Mesh; cx: number; cz: number; R: number; s: number; ph: number }[] = [];
  const wingCols = [0xffa3d7, 0xffe566, 0x99ecff, 0xcfb0ff, 0xffffff];
  for (let i = 0; i < 8; i++) {
    const bg = new THREE.Group();
    const wmat = new THREE.MeshBasicMaterial({ color: wingCols[i % wingCols.length], side: THREE.DoubleSide });
    mats.push(wmat);
    const wl = new THREE.Mesh(wingGeo, wmat);
    wl.scale.x = -1;
    const wr = new THREE.Mesh(wingGeo, wmat);
    bg.add(wl, wr, place(sph12, M(0x3b2d4f, 0.5), 0, 0, 0, 0.032, 0.032, 0.08, false));
    group.add(bg);
    const a = rnd() * Math.PI * 2;
    bflies.push({ g: bg, wl, wr, cx: Math.cos(a) * 10, cz: Math.sin(a) * 10, R: 3 + rnd() * 6, s: 0.38 + rnd() * 0.42, ph: rnd() * 10 });
  }

  // Drifting sunlit golden pollen / blossom motes
  const motes: { m: THREE.Mesh; x: number; y: number; z: number; sp: number; ph: number }[] = [];
  const moteCol = th.tree === 'blossom' ? 0xffb8de : 0xfff6b8;
  const moteMat = new THREE.MeshBasicMaterial({ color: moteCol, transparent: true, opacity: 0.72 });
  mats.push(moteMat);
  for (let i = 0; i < 36; i++) {
    const a = rnd() * Math.PI * 2;
    const r = rnd() * (ARENA_R - 2);
    const x = Math.cos(a) * r, y = rr(0.6, 5.5), z = Math.sin(a) * r;
    const m = place(sph12, moteMat, x, y, z, 0.06, 0.06, 0.06, false);
    group.add(m);
    motes.push({ m, x, y, z, sp: rr(0.35, 0.8), ph: rnd() * 10 });
  }

  /* ============ ANIMATION ============ */
  anim.push((t, dt) => {
    for (const tr of trees) tr.rotation.z = Math.sin(t * 1.2 + (tr.userData.ph as number)) * 0.022;
    for (const bu of bushes) {
      const s = 1 + Math.sin(t * 1.7 + (bu.userData.ph as number)) * 0.025;
      bu.scale.set(s, 1 / s, s);
    }
    for (const cr of spinCrystals) {
      cr.rotation.y += dt * 1.1;
      cr.position.y = 2.75 + Math.sin(t * 2.2) * 0.18;
    }
    for (const c of clouds) {
      c.g.position.x += dt * c.sp;
      if (c.g.position.x > 105) c.g.position.x = -105;
      c.g.position.y = c.baseY + Math.sin(t * 0.4 + c.ph) * 0.4;
    }
    for (const b of bflies) {
      const th2 = t * b.s + b.ph;
      b.g.position.set(b.cx + Math.cos(th2) * b.R, 1.35 + Math.sin(t * 2.3 + b.ph) * 0.4, b.cz + Math.sin(th2) * b.R);
      b.g.rotation.y = -th2;
      const flap = Math.sin(t * 24 + b.ph) * 0.85;
      b.wl.rotation.y = flap;
      b.wr.rotation.y = -flap;
    }
    for (const mt of motes) {
      mt.m.position.set(
        mt.x + Math.sin(t * mt.sp + mt.ph) * 0.9,
        th.tree === 'blossom'
          ? ((mt.y - t * 0.6) % 5.5 + 5.5) % 5.5 + 0.3
          : mt.y + Math.sin(t * mt.sp * 1.3 + mt.ph) * 0.45,
        mt.z + Math.cos(t * mt.sp + mt.ph) * 0.9,
      );
    }
    lantern.position.x = Math.sin(t * 2.1) * 0.08;
    for (const b of bulbMeshes) {
      const pulse = 0.88 + Math.sin(t * 3 + (b.userData.ph as number)) * 0.14;
      b.scale.set(0.1 * pulse, 0.12 * pulse, 0.1 * pulse);
    }
  });

  const dispose = () => {
    group.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    mats.forEach((m) => m.dispose());
    textures.forEach((tx) => tx.dispose());
    sph16.dispose();
    sph12.dispose();
    cyl12.dispose();
    frondGeo.dispose();
    mushCapGeo.dispose();
    flowerCrownGeo.dispose();
    wingGeo.dispose();
    hillGeo.dispose();
    stemGeo.dispose();
    centerGeo.dispose();
    leafGeo.dispose();
    stems.dispose();
    leaves.dispose();
    crowns.dispose();
    centers.dispose();
  };

  return { group, update: (t, dt) => anim.forEach((f) => f(t, dt)), dispose };
}
