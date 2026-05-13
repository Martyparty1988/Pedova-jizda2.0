import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const runtimeFiles = ['index.html', 'main.js', 'style.css'];

for (const file of runtimeFiles) {
  const text = read(file);
  assert.doesNotMatch(text, /```/, `${file} must not contain markdown code fences`);
  assert.doesNotMatch(text, /[‘’]/, `${file} must not contain curly JS quote characters`);
}

const index = read('index.html');
const main = read('main.js');
const style = read('style.css');

assert.match(index, /<canvas id="game-canvas"/, 'index must include the game canvas');
assert.match(index, /<script src="main\.js" defer><\/script>/, 'index must load the self-contained game script without fragile module imports');
assert.doesNotMatch(index, /https:\/\/cdn\.skypack\.dev/, 'runtime must not depend on Skypack CDN');
assert.doesNotMatch(index, /type="module"/, 'runtime should avoid module-loading failures on mobile browsers');

assert.match(main, /class PedroGame/, 'main.js must expose the professional game controller');
assert.match(main, /requestAnimationFrame/, 'game must use requestAnimationFrame loop');
assert.match(main, /devicePixelRatio/, 'canvas must handle high-DPI iPhone screens');
assert.match(main, /visualViewport/, 'canvas must handle iPhone browser viewport changes');
assert.match(main, /touchstart/, 'game must support touch controls');
assert.match(main, /localStorage\.setItem\('pedro_best_score'/, 'game must persist best score');
assert.doesNotMatch(main, /from ['"]https:\/\/cdn\.skypack\.dev/, 'main runtime must not import external 3D modules');

assert.match(style, /#game-canvas/, 'CSS must style the canvas');
assert.match(style, /env\(safe-area-inset-bottom/, 'CSS must handle iPhone safe areas');
assert.match(style, /backdrop-filter/, 'UI should use polished glass panels');
assert.match(style, /\.controls/, 'CSS must include mobile controls');
assert.match(style, /\.brand-card/, 'CSS must include professional menu card styling');

console.log('Static professional runtime checks passed.');
