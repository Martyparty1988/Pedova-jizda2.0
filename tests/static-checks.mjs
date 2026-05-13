import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const count = (text, pattern) => (text.match(new RegExp(pattern, 'g')) || []).length;

const runtimeFiles = [
  'index.html',
  'main.js',
  'game-core.js',
  'game-ui.js',
  'game-logic.js',
  'game-3d.js',
  'player.js',
  'environment.js',
  'gameObjectFactory.js',
  'game-audio.js',
  'game-assets.js'
];

for (const file of runtimeFiles) {
  const text = read(file);
  assert.doesNotMatch(text, /```/, `${file} must not contain markdown code fences`);
  assert.doesNotMatch(text, /[‘’]/, `${file} must not contain curly JS quote characters`);
}

const style = read('style.css');
const core = read('game-core.js');
const logic = read('game-logic.js');
const three = read('game-3d.js');
const player = read('player.js');
const audio = read('game-audio.js');

assert.match(style, /#game-screen\.screen\.active\s*{[^}]*backdrop-filter:\s*none;/s, 'active game overlay must not blur the canvas');
assert.match(style, /#game-screen\.screen\.active\s*{[^}]*-webkit-backdrop-filter:\s*none;/s, 'iOS Safari overlay blur must be disabled too');

assert.equal(count(three, 'syncRenderResolution\\('), 3, 'Game3D should have one syncRenderResolution method and two calls');
assert.equal(count(three, 'setupRuntimeViewportListeners\\('), 2, 'Game3D should have one viewport listener method plus one call');
assert.match(three, /setFromCenterAndSize\(/, 'player collider should be explicit, not enlarged by the shield child mesh');
assert.doesNotMatch(three, /this\.playerCollider\.setFromObject\(this\.player\.mesh\)/, 'player collider must not include invisible shield child');
assert.match(three, /const maxPixelRatio = this\.isMobile \? 2\.2 : 2;/, 'mobile DPR must be capped for stable iPhone performance');

assert.match(core, /updateSkills\(this\.gameState, delta\)/, 'GameCore must pass gameState into skill timer updates');
assert.doesNotMatch(core, /updateSkills\(delta, null\)/, 'old updateSkills(delta, null) call should stay removed');
assert.match(core, /togglePause\(\)\s*{[\s\S]*this\.threeD\.clock\.getDelta\(\);[\s\S]*}/, 'pause toggle should reset clock delta to avoid time jumps');

assert.match(logic, /invincibilityTimer = Math\.max\(0,/, 'invincibility timer must not go negative');
assert.match(logic, /speedTimeouts/, 'speed powerup timeout cleanup must be tracked');

assert.match(player, /Výšku hráče řídí GameLogic/, 'Player.update must not overwrite jump height');
assert.doesNotMatch(player, /this\.mesh\.position\.y\s*=\s*-0\.4/, 'Player.update must not force mesh Y and break jumps');

assert.doesNotMatch(audio, /o\.type\s*=\s*['"]noise['"]/, 'WebAudio oscillator type noise is invalid');
assert.match(audio, /createBufferSource\(/, 'shield break should use generated noise buffer');

console.log('Static regression checks passed.');
