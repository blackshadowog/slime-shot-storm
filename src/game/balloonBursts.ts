import * as THREE from 'three';

interface Scrap {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  spin: THREE.Vector3;
  life: number;
  duration: number;
  size: number;
}

interface AirRing {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  life: number;
  duration: number;
  radius: number;
}

const CAPACITY = 180;

export class BalloonBursts {
  readonly group = new THREE.Group();
  private readonly geometry = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 0.8, Math.PI * 0.25, Math.PI * 0.42);
  private readonly material = new THREE.MeshStandardMaterial({ roughness: 0.34, side: THREE.DoubleSide, metalness: 0 });
  private readonly pieces = new THREE.InstancedMesh(this.geometry, this.material, CAPACITY);
  private readonly dummy = new THREE.Object3D();
  private readonly scraps: Scrap[] = [];
  private readonly rings: AirRing[] = [];
  private cursor = 0;
  private ringCursor = 0;

  constructor() {
    this.geometry.center();
    this.pieces.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pieces.frustumCulled = false;
    this.group.add(this.pieces);
    this.dummy.scale.setScalar(0);
    this.dummy.updateMatrix();
    for (let i = 0; i < CAPACITY; i++) {
      this.pieces.setMatrixAt(i, this.dummy.matrix);
      this.pieces.setColorAt(i, new THREE.Color());
      this.scraps.push({
        position: new THREE.Vector3(), velocity: new THREE.Vector3(),
        rotation: new THREE.Euler(), spin: new THREE.Vector3(),
        life: 0, duration: 1, size: 1,
      });
    }
    for (let i = 0; i < 16; i++) {
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.91, 1, 48),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
      );
      mesh.visible = false;
      this.group.add(mesh);
      this.rings.push({ mesh, life: 0, duration: 0.3, radius: 1 });
    }
  }

  emit(position: THREE.Vector3, color: number, radius: number, camera: THREE.Camera, boss = false) {
    const count = boss ? 38 : 18;
    const base = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const index = this.cursor++ % CAPACITY;
      const scrap = this.scraps[index];
      const direction = new THREE.Vector3().randomDirection();
      scrap.position.copy(position).addScaledVector(direction, radius * 0.5);
      scrap.velocity.copy(direction).multiplyScalar((5 + Math.random() * 5) * (boss ? 1.35 : 1));
      scrap.velocity.y += 3;
      scrap.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      scrap.spin.set((Math.random() - .5) * 18, (Math.random() - .5) * 18, (Math.random() - .5) * 18);
      scrap.duration = 0.65 + Math.random() * 0.5;
      scrap.life = scrap.duration;
      scrap.size = (0.18 + Math.random() * 0.22) * Math.sqrt(radius);
      this.pieces.setColorAt(index, base.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.15));
    }
    if (this.pieces.instanceColor) this.pieces.instanceColor.needsUpdate = true;

    for (let i = 0; i < 2; i++) {
      const ring = this.rings[this.ringCursor++ % this.rings.length];
      ring.duration = i ? .37 : .24;
      ring.life = ring.duration;
      ring.radius = radius * (i ? 2.8 : 2.1);
      ring.mesh.position.copy(position);
      ring.mesh.quaternion.copy(camera.quaternion);
      if (i) ring.mesh.rotateX(Math.PI * .32);
      ring.mesh.scale.setScalar(radius * .7);
      ring.mesh.material.color.set(i ? color : 0xffffff);
      ring.mesh.material.opacity = .8;
      ring.mesh.visible = true;
    }
  }

  update(dt: number) {
    let changed = false;
    for (let i = 0; i < this.scraps.length; i++) {
      const scrap = this.scraps[i];
      if (scrap.life <= 0) continue;
      scrap.life = Math.max(0, scrap.life - dt);
      scrap.velocity.y -= 10 * dt;
      scrap.velocity.multiplyScalar(Math.exp(-dt * .8));
      scrap.position.addScaledVector(scrap.velocity, dt);
      if (scrap.position.y < .06) {
        scrap.position.y = .06;
        scrap.velocity.y = Math.abs(scrap.velocity.y) * .25;
      }
      scrap.rotation.x += scrap.spin.x * dt;
      scrap.rotation.y += scrap.spin.y * dt;
      scrap.rotation.z += scrap.spin.z * dt;
      const age = 1 - scrap.life / scrap.duration;
      const shrink = scrap.life <= 0 ? 0 : Math.min(1, scrap.life * 4);
      const stretch = 1 + Math.sin(age * 22) * .28 * (1 - age);
      this.dummy.position.copy(scrap.position);
      this.dummy.rotation.copy(scrap.rotation);
      this.dummy.scale.set(scrap.size * stretch * shrink, scrap.size / stretch * shrink, scrap.size * .55 * shrink);
      this.dummy.updateMatrix();
      this.pieces.setMatrixAt(i, this.dummy.matrix);
      changed = true;
    }
    if (changed) this.pieces.instanceMatrix.needsUpdate = true;

    for (const ring of this.rings) {
      if (ring.life <= 0) continue;
      ring.life = Math.max(0, ring.life - dt);
      const age = 1 - ring.life / ring.duration;
      ring.mesh.scale.setScalar(ring.radius * (.32 + age * .68));
      ring.mesh.material.opacity = .8 * (1 - age) ** 2;
      ring.mesh.visible = ring.life > 0;
    }
  }

  clear() {
    this.dummy.scale.setScalar(0);
    this.dummy.updateMatrix();
    this.scraps.forEach((scrap, i) => { scrap.life = 0; this.pieces.setMatrixAt(i, this.dummy.matrix); });
    this.pieces.instanceMatrix.needsUpdate = true;
    this.rings.forEach(ring => { ring.life = 0; ring.mesh.visible = false; });
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.pieces.dispose();
    this.rings.forEach(ring => { ring.mesh.geometry.dispose(); ring.mesh.material.dispose(); });
    this.group.clear();
  }
}