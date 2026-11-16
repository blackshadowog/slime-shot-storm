import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const url = process.env.GAME_URL || 'http://localhost:5173';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.setDefaultTimeout(30000);

// Test-only access to the live engine; no debug globals are shipped in the app.
await page.route('**/src/game/engine.ts*', async route => {
  const response = await route.fetch();
  const body = await response.text();
  await route.fulfill({ response, body: `${body}\nconst originalInit = GameEngine.prototype.init;\nGameEngine.prototype.init = function () { window.__testGame = this; return originalInit.call(this); };` });
});

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForFunction(() => window.__testGame?.renderer);
  assert.match(await page.title(), /S-S-S.*Slime-Shot-Storm/);
  assert.equal(await page.getByRole('heading', { name: 'S-S-S: Slime-Shot-Storm' }).count(), 1);
  assert.equal(await page.locator('a[href="https://github.com/blackshadowog"]').count(), 1);
  assert.equal(await page.locator('a[href="https://www.linkedin.com/in/abhishek-kumar-tiwari-b448b5328/"]').count(), 1);
  if (process.env.SCREENSHOTS) await page.screenshot({ path: 'artifacts/sss-home.png', animations: 'disabled', timeout: 90000 });
  console.log('Home and brand verified');

  await page.getByRole('button', { name: 'SHOP', exact: true }).click();
  await page.getByRole('tabpanel', { name: 'Power-ups' }).waitFor();
  assert.equal(await page.locator('.power-up').count(), 9);
  assert.equal(await page.locator('.power-up__buy:disabled').count(), 9);
  assert.equal(await page.locator('.power-up__progress > span').count(), 69);
  if (process.env.SCREENSHOTS) await page.screenshot({ path: 'artifacts/sss-powerups.png', animations: 'disabled', timeout: 90000 });
  console.log('Reference power-ups verified');

  await page.getByRole('tab', { name: 'Guns', exact: true }).click();
  await page.locator('.weapon-preview-stage img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  assert.equal(await page.locator('.weapon-preview-stage img').count(), 6);
  const previews = await page.locator('.weapon-preview-stage img').evaluateAll(images => images.map(image => {
    const canvas = document.createElement('canvas');
    canvas.width = 768; canvas.height = 432;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, 768, 432).data;
    let opaque = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 120) opaque++;
    return { name: image.alt, width: image.naturalWidth, opaque, transparent: pixels[3] === 0 };
  }));
  for (const preview of previews) {
    assert.equal(preview.width, 768);
    assert.ok(preview.opaque > 10000, `Empty weapon render: ${preview.name}`);
    assert.ok(preview.transparent, 'Weapon render should have a transparent background');
  }
  await page.waitForTimeout(300);
  if (process.env.SCREENSHOTS) await page.screenshot({ path: 'artifacts/sss-guns.png', animations: 'disabled', timeout: 90000 });
  console.log('All six real weapon renders verified');

  await page.evaluate(() => { window.__testGame.gems = 500; window.__testGame.persist(); window.__testGame.emitShop(); });
  await page.getByRole('button', { name: 'Buy Gumdrop for 45 gems' }).click();
  assert.equal(await page.getByRole('button', { name: 'Gumdrop equipped' }).count(), 1);
  await page.getByRole('tab', { name: 'Power-ups' }).click();
  await page.getByRole('button', { name: 'Upgrade Damage for 18 gems' }).click();
  assert.equal(await page.locator('[data-upgrade="damage"] .power-up__level').textContent(), '1/12');
  assert.equal(await page.locator('[data-upgrade="damage"] .is-filled').count(), 1);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('slimeStormSaveV2')));
  assert.equal(saved.gems, 437);
  assert.equal(saved.levels.damage, 1);
  assert.equal(saved.gunId, 'gumdrop');
  console.log('Purchases, equip, and persistence verified');

  await page.getByRole('button', { name: 'Close shop' }).click();
  await page.getByRole('button', { name: 'ENDLESS', exact: true }).click();
  await page.waitForFunction(() => window.__testGame.phase === 'playing');
  console.log('Run started');
  const balloon = await page.evaluate(() => {
    const e = window.__testGame;
    cancelAnimationFrame(e.raf);
    e.clearField();
    e.spawnQueue = [];
    e.clearing = true;
    e.playerPos.set(0, 1.7, 6);
    e.camera.position.copy(e.playerPos);
    e.camera.lookAt(0, 1.3, 0);
    const slime = e.spawnSlimeAt('green', 0, 0, undefined, true);
    slime.spawnT = 0;
    slime.group.position.y = 1.1;
    e.damageSlime(slime, slime.maxHp + 1, e.playerPos.clone().set(0, 0, -1), 0, false, 0);
    const before = e.gemsArr.length;
    e.updateSlimes(.08, true, false);
    const scale = slime.group.scale.x;
    const aliveDuringInflation = e.scene.children.includes(slime.group);
    e.updateSlimes(.09, true, false);
    e.balloonBursts.update(.03);
    return {
      before, scale, aliveDuringInflation,
      after: e.gemsArr.length,
      removed: !e.scene.children.includes(slime.group),
      scraps: e.balloonBursts.scraps.filter(s => s.life > 0).length,
      rings: e.balloonBursts.rings.filter(r => r.life > 0).length,
      kills: e.kills,
    };
  });
  assert.equal(balloon.before, 0, 'Loot should appear at the pop, not before inflation');
  assert.ok(balloon.scale > 1.1);
  assert.equal(balloon.aliveDuringInflation, true);
  assert.equal(balloon.removed, true);
  assert.ok(balloon.after >= 1 && balloon.after <= 2);
  assert.equal(balloon.scraps, 18);
  assert.equal(balloon.rings, 2);
  assert.equal(balloon.kills, 1);
  console.log('Balloon inflation, burst, and delayed loot verified');

  const split = await page.evaluate(() => {
    const e = window.__testGame;
    e.clearField();
    const slime = e.spawnSlimeAt('mint', 0, 0, undefined, true);
    slime.spawnT = 0;
    e.killSlime(slime, e.playerPos.clone().set(1, 0, 0));
    e.updateSlimes(.17, true, false);
    return e.slimes.map(s => s.kind);
  });
  assert.deepEqual(split, ['mintling', 'mintling']);
  console.log('Splitter behavior verified');

  await page.evaluate(() => window.__testGame.quitToMenu());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'SHOP', exact: true }).click();
  const mobile = await page.locator('.power-up').evaluateAll(cards => cards.map(card => ({ width: card.clientWidth, right: card.getBoundingClientRect().right })));
  assert.ok(mobile.every(card => card.right <= 390 && card.width > 130));
  console.log('Mobile layout verified');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ cards: 9, weaponPreviews: previews, purchase: saved.gems, balloon, split, mobile: 'passed', errors }, null, 2));
} finally {
  await browser.close();
}