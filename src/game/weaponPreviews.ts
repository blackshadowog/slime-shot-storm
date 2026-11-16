import * as THREE from 'three';

type Weapon = { group: THREE.Group; flash: THREE.Mesh };

/** Snapshot the actual gameplay meshes once, not a second set of illustrations. */
export function renderWeaponPreviews(
  renderer: THREE.WebGLRenderer,
  weapons: Record<string, Weapon>,
): Record<string, string> {
  const size = renderer.getSize(new THREE.Vector2());
  const pixelRatio = renderer.getPixelRatio();
  const clearColor = renderer.getClearColor(new THREE.Color());
  const clearAlpha = renderer.getClearAlpha();
  const shadowEnabled = renderer.shadowMap.enabled;
  const output: Record<string, string> = {};
  const studio = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 30);
  camera.position.set(2.1, 1.5, 5.5);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  studio.add(new THREE.HemisphereLight(0xf6f3ff, 0x6c5f9b, 2.2));
  const key = new THREE.DirectionalLight(0xfff3dc, 3.3);
  key.position.set(-3, 5, 4);
  const fill = new THREE.DirectionalLight(0xc1eaff, 2.4);
  fill.position.set(3, 1, -3);
  studio.add(key, fill);

  try {
    renderer.setPixelRatio(1);
    renderer.setSize(768, 432, false);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = false;

    for (const [id, weapon] of Object.entries(weapons)) {
      const model = new THREE.Group();
      for (const child of weapon.group.children) {
        if (child instanceof THREE.Mesh && child !== weapon.flash) model.add(child.clone());
      }
      model.rotation.set(0, -Math.PI / 2, -0.1);
      const bounds = new THREE.Box3().setFromObject(model);
      model.position.sub(bounds.getCenter(new THREE.Vector3()));
      studio.add(model);
      bounds.setFromObject(model);
      const viewBounds = new THREE.Box3();
      for (const x of [bounds.min.x, bounds.max.x]) {
        for (const y of [bounds.min.y, bounds.max.y]) {
          for (const z of [bounds.min.z, bounds.max.z]) {
            viewBounds.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
          }
        }
      }
      const viewSize = viewBounds.getSize(new THREE.Vector3());
      const aspect = 768 / 432;
      const halfHeight = Math.max(viewSize.y, viewSize.x / aspect) * 0.57;
      camera.left = -halfHeight * aspect;
      camera.right = halfHeight * aspect;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
      renderer.render(studio, camera);
      output[id] = renderer.domElement.toDataURL('image/png');
      studio.remove(model);
      // Clones share gameplay resources; do not dispose their materials or geometry.
    }
  } finally {
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(size.x, size.y, false);
    renderer.setClearColor(clearColor, clearAlpha);
    renderer.shadowMap.enabled = shadowEnabled;
    studio.clear();
  }

  return output;
}