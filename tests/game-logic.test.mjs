import test from 'node:test';
import assert from 'node:assert/strict';
import { GameLogic } from '../game-logic.js';

class LocalStorageMock {
  constructor() {
    this.store = new Map();
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  setItem(key, value) {
    this.store.set(key, String(value));
  }

  clear() {
    this.store.clear();
  }
}

globalThis.localStorage = new LocalStorageMock();

test('initial state is playable and sane', () => {
  const logic = new GameLogic();
  const state = logic.getInitialGameState();

  assert.equal(state.isPlaying, true);
  assert.equal(state.isPaused, false);
  assert.equal(state.lane, 1);
  assert.equal(state.lives, 3);
  assert.equal(state.playerY, -0.6);
  assert.equal(state.jumpCount, 0);
});

test('jump physics lands back on ground and resets jump count', () => {
  const logic = new GameLogic();
  const state = logic.getInitialGameState();

  state.playerVelocityY = 10;
  state.jumpCount = 1;

  for (let i = 0; i < 90; i += 1) {
    logic.updatePlayerVerticalPosition(state, 1 / 60, -30);
  }

  assert.equal(state.playerY, -0.6);
  assert.equal(state.playerVelocityY, 0);
  assert.equal(state.jumpCount, 0);
});

test('invincibility and cooldowns decrement without going negative', () => {
  const logic = new GameLogic();
  const state = logic.getInitialGameState();

  state.invincibilityTimer = 100;
  logic.activateSkill('dash');
  logic.updateSkills(state, 10);

  assert.equal(state.invincibilityTimer, 0);
  assert.equal(logic.skills.dash.cooldown, 0);
});

test('powerups update state and hide collected mesh', () => {
  const logic = new GameLogic();
  const state = logic.getInitialGameState();
  const gameObjects = [
    { powerupType: 'shield', mesh: { visible: true } },
    { powerupType: 'life', mesh: { visible: true } },
    { powerupType: 'speed', mesh: { visible: true } }
  ];

  assert.equal(logic.collectPowerup(state, 0, gameObjects), 'shield');
  assert.equal(state.hasShield, true);
  assert.equal(gameObjects[0].mesh.visible, false);

  assert.equal(logic.collectPowerup(state, 1, gameObjects), 'life');
  assert.equal(state.lives, 4);

  const baseSpeed = state.baseSpeed;
  assert.equal(logic.collectPowerup(state, 2, gameObjects), 'speed');
  assert.equal(state.baseSpeed, baseSpeed + 1.5);

  logic.resetSkills();
});

test('final stats save numeric best score', () => {
  localStorage.clear();
  const logic = new GameLogic();
  const state = logic.getInitialGameState();
  state.score = 123.9;

  const stats = logic.getFinalStats(state);
  logic.saveStats(stats);

  assert.equal(stats.score, 123);
  assert.equal(stats.bestScore, 123);
  assert.equal(localStorage.getItem('fp3d_bestScore'), '123');
});
