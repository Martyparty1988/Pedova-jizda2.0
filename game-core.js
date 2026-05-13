import { GameUI } from ‘./game-ui.js’;
import { Game3D } from ‘./game-3d.js’;
import { GameLogic } from ‘./game-logic.js’;
import { GameAudio } from ‘./game-audio.js’;

const GRAVITY    = -28;
const JUMP_FORCE = 10;
const LANE_WIDTH = 4;
const MAX_DELTA  = 0.05;

// Minimální vzdálenost swipe pro spuštění akce
const SWIPE_MIN_XY  = 28; // boční swipe
const SWIPE_MIN_DOWN = 70; // swipe dolů (dash) – větší, aby se nespouštěl náhodně

export class GameCore {
constructor() {
this.ui = new GameUI();
this.logic = new GameLogic();
this.audio = new GameAudio();
this.threeD = new Game3D({
canvas: this.ui.elements[‘game-canvas’],
onCollision: (type, index) => this.handleCollision(type, index),
onObstaclePassed: (closeness) => this.handleObstaclePassed(closeness),
});

```
    this.gameState = null;
    this.animationFrame = null;
    this.touchStart = null;
    this.menuAnimationFrame = null;
    this.dashTimeout = null;

    this.lastSwipeUpTime = 0;
    this.lastJumpKeyPressTime = 0;
    this.doubleTapDelay = 400; // zvýšeno z 300 → 400ms

    this.init();
}

async init() {
    try {
        if (this.ui.elements['menu-loading-text'])
            this.ui.elements['menu-loading-text'].textContent = 'Načítám 3D scénu...';
        await this.threeD.init();

        if (this.ui.elements['menu-loading-text'])
            this.ui.elements['menu-loading-text'].textContent = 'Inicializuji audio...';
        this.audio.init();

        this.setupEventListeners();
        this.logic.loadStats(this.ui.elements);

        if (this.ui.elements['menu-loading-container'])
            this.ui.elements['menu-loading-container'].style.display = 'none';
        if (this.ui.elements['play-btn'])
            this.ui.elements['play-btn'].disabled = false;

        this.menuLoop();
    } catch (error) {
        console.error('Fatální chyba:', error);
        this.ui.showScreen('webgl-fallback');
    }
}

setupEventListeners() {
    const on = (id, ev, fn) => { const el = this.ui.elements[id]; if (el) el.addEventListener(ev, fn); };

    on('play-btn',    'click', () => this.startGame());
    on('restart-btn', 'click', () => this.startGame());
    on('menu-btn',    'click', () => this.returnToMenu());
    on('pause-btn',   'click', () => this.togglePause());

    window.addEventListener('resize', () => this.threeD.onWindowResize());
    window.addEventListener('keydown', (e) => this.handleKeyInput(e));
    window.addEventListener('blur', () => {
        if (this.gameState?.isPlaying && !this.gameState.isPaused) this.togglePause();
    });

    const canvas = this.ui.elements['game-canvas'];
    if (canvas) {
        canvas.addEventListener('touchstart',  (e) => this.handleTouchStart(e),  { passive: false });
        canvas.addEventListener('touchend',    (e) => this.handleTouchEnd(e),    { passive: false });
        canvas.addEventListener('touchcancel', ()  => { this.touchStart = null; }, { passive: true });
    }

    // On-screen tlačítka
    const btnLeft  = document.getElementById('ctrl-left');
    const btnRight = document.getElementById('ctrl-right');
    const btnJump  = document.getElementById('ctrl-jump');
    const btnDash  = document.getElementById('ctrl-dash');

    if (btnLeft)  btnLeft.addEventListener('touchstart',  (e) => { e.preventDefault(); this.moveLane(-1); }, { passive: false });
    if (btnRight) btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); this.moveLane(1);  }, { passive: false });
    if (btnJump)  btnJump.addEventListener('touchstart',  (e) => { e.preventDefault(); this.handleJumpTap(); }, { passive: false });
    if (btnDash)  btnDash.addEventListener('touchstart',  (e) => { e.preventDefault(); this.doDash(); },       { passive: false });
}

returnToMenu() {
    if (this.animationFrame) { cancelAnimationFrame(this.animationFrame); this.animationFrame = null; }
    this.gameState = null;
    this.ui.showScreen('main-menu');
    if (this.threeD.player) this.threeD.player.mesh.visible = false;
    this.threeD.clock.getDelta();
    this.menuLoop();
}

startGame() {
    [this.menuAnimationFrame, this.animationFrame].forEach(f => { if (f) cancelAnimationFrame(f); });
    this.menuAnimationFrame = this.animationFrame = null;
    if (this.dashTimeout) { clearTimeout(this.dashTimeout); this.dashTimeout = null; }

    this.audio.resumeContext();
    this.logic.resetSkills();
    this.gameState = this.logic.getInitialGameState();
    this.gameState.isDoingTrick = false;
    this.gameState.isDoingFrontFlip = false;
    this.touchStart = null;
    this.lastSwipeUpTime = this.lastJumpKeyPressTime = 0;

    this.threeD.reset();
    this.ui.showScreen('game-screen');
    this.ui.updateScore(0);
    this.ui.updateLives(this.gameState.lives);
    this.ui.togglePause(false);
    this.ui.updateCombo(1);
    this.ui.updateDashCooldown(1);

    this.threeD.clock.getDelta();
    this.gameLoop();
}

menuLoop() {
    if (!this.ui.elements['main-menu']?.classList.contains('active')) return;
    if (this.menuAnimationFrame) cancelAnimationFrame(this.menuAnimationFrame);
    this.menuAnimationFrame = requestAnimationFrame(() => this.menuLoop());
    const delta = Math.min(this.threeD.clock.getDelta(), MAX_DELTA);
    this.threeD.updateMenuBackground(delta);
}

gameLoop() {
    if (!this.gameState?.isPlaying) return;
    this.animationFrame = requestAnimationFrame(() => this.gameLoop());
    if (this.gameState.isPaused) return;
    const delta = Math.min(this.threeD.clock.getDelta(), MAX_DELTA);
    this.update(delta);
}

update(delta) {
    if (!this.gameState) return;
    this.logic.updateScore(this.gameState, delta);
    this.ui.updateScore(Math.floor(this.gameState.score));
    this.logic.updatePlayerVerticalPosition(this.gameState, delta, GRAVITY);
    this.logic.updateSkills(this.gameState, delta);

    // Aktualizace combo a dash cooldown v UI
    this.ui.updateCombo(this.gameState.combo);
    this.ui.updateDashCooldown(this.logic.getDashCooldownPercent());

    const targetX = (this.gameState.lane - 1) * LANE_WIDTH;
    this.threeD.update(this.gameState, targetX, delta);
}

// Voláno z Game3D když překážka mine hráče
handleObstaclePassed(closeness) {
    if (!this.gameState?.isPlaying) return;

    const combo = this.logic.dodgedObstacle(this.gameState);

    // Near-miss: překážka prošla velmi blízko (closeness 0–1, kde 1 = skoro zásah)
    if (closeness > 0.65) {
        const bonus = this.logic.nearMissBonus(this.gameState);
        this.ui.showNearMiss(bonus);
        this.audio.vibrate(30);
    }
}

handleCollision(type, index) {
    if (!this.gameState?.isPlaying) return;

    if (type.startsWith('powerup')) {
        const pt = this.logic.collectPowerup(this.gameState, index, this.threeD.gameObjects);
        if (!pt) return;
        this.ui.updateLives(this.gameState.lives);
        this.audio.playSound(pt === 'shield' || pt === 'life' ? 'powerup_shield' : 'powerup');
        this.audio.vibrate(50);
    } else if (type === 'obstacle') {
        if (this.gameState.invincibilityTimer > 0) return;

        if (this.logic.consumeShield(this.gameState)) {
            this.audio.playSound('shield_break');
            this.threeD.triggerShieldBreakEffect();
            if (this.threeD.gameObjects[index]?.mesh) this.threeD.gameObjects[index].mesh.visible = false;
            this.gameState.invincibilityTimer = 1000;
        } else {
            const flash = document.getElementById('collision-flash');
            if (flash) { flash.classList.add('flash'); setTimeout(() => flash.classList.remove('flash'), 500); }
            this.audio.vibrate([100, 50, 100]);
            this.audio.playSound('collision');
            if (this.logic.handlePlayerHit(this.gameState)) this.gameOver();
            else this.ui.updateLives(this.gameState.lives);
        }
    }
}

gameOver() {
    if (!this.gameState?.isPlaying) return;
    this.gameState.isPlaying = false;
    if (this.animationFrame) { cancelAnimationFrame(this.animationFrame); this.animationFrame = null; }
    const stats = this.logic.getFinalStats(this.gameState);
    this.logic.saveStats(stats);
    this.ui.showGameOver(stats);
}

// ── TOUCH ─────────────────────────────────────────────────────────
handleTouchStart(event) {
    if (!this.gameState?.isPlaying || this.gameState.isPaused) return;
    event.preventDefault();
    const t = event.touches?.[0];
    if (t) this.touchStart = { x: t.clientX, y: t.clientY };
}

handleTouchEnd(event) {
    if (!this.gameState?.isPlaying || this.gameState.isPaused) return;
    event.preventDefault();
    if (!this.touchStart) return;
    const t = event.changedTouches?.[0];
    if (!t) return;

    const dx = t.clientX - this.touchStart.x;
    const dy = t.clientY - this.touchStart.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX > absY && absX > SWIPE_MIN_XY) {
        // Boční swipe = změna pruhu
        this.moveLane(dx > 0 ? 1 : -1);
    } else if (dy < -SWIPE_MIN_XY && absY > absX) {
        // Swipe nahoru = skok
        this.handleJumpGesture();
    } else if (dy > SWIPE_MIN_DOWN && absY > absX * 1.5) {
        // Swipe VÝRAZNĚ dolů = dash (vyšší práh, aby se nespustil náhodně)
        this.doDash();
    }
    // Krátký tap = skok
    else if (absX < 15 && absY < 15) {
        this.handleJumpTap();
    }

    this.touchStart = null;
}

// ── KEYBOARD ──────────────────────────────────────────────────────
handleKeyInput(event) {
    if (!this.gameState?.isPlaying || this.gameState.isPaused) {
        if (event.code === 'Escape') this.togglePause();
        return;
    }
    switch (event.code) {
        case 'ArrowLeft':  case 'KeyA': this.moveLane(-1); break;
        case 'ArrowRight': case 'KeyD': this.moveLane(1);  break;
        case 'ArrowUp': case 'KeyW': case 'Space':
            event.preventDefault(); this.handleJumpKey(); break;
        case 'ArrowDown': case 'KeyS':
            event.preventDefault(); this.doDash(); break;
        case 'Escape': this.togglePause(); break;
    }
}

moveLane(dir) {
    if (!this.gameState) return;
    const newLane = Math.max(0, Math.min(2, this.gameState.lane + dir));
    if (newLane !== this.gameState.lane) {
        this.gameState.lane = newLane;
        this.audio.vibrate(20); // krátká vibrace na potvrzení
    }
}

// Tap (krátký dotyk) = první skok nebo double jump
handleJumpTap() {
    this.doJump();
}

handleJumpGesture() {
    const now = Date.now();
    if (now - this.lastSwipeUpTime < this.doubleTapDelay) {
        this.doSuperJump();
        this.lastSwipeUpTime = 0;
    } else {
        this.doJump();
        this.lastSwipeUpTime = now;
    }
}

handleJumpKey() {
    const now = Date.now();
    if (now - this.lastJumpKeyPressTime < this.doubleTapDelay) {
        this.doSuperJump();
        this.lastJumpKeyPressTime = 0;
    } else {
        this.doJump();
        this.lastJumpKeyPressTime = now;
    }
}

doJump() {
    if (!this.gameState) return;
    if (this.logic.canJump(this.gameState)) {
        this.gameState.playerVelocityY = JUMP_FORCE;
        this.gameState.jumpCount = 1;
        this.gameState.runStats.jumps++;
        this.audio.playSound('jump');
    } else if (this.logic.canDoubleJump(this.gameState)) {
        this.gameState.playerVelocityY = JUMP_FORCE * 0.88;
        this.gameState.jumpCount = 2;
        this.logic.activateSkill('doubleJump');
        this.gameState.runStats.jumps++;
        this.gameState.isDoingTrick = true;
        this.audio.playSound('jump');
    }
}

doSuperJump() {
    if (!this.gameState) return;
    if (this.logic.canJump(this.gameState) && this.logic.canSuperJump(this.gameState)) {
        this.logic.activateSkill('superJump');
        this.gameState.playerVelocityY = JUMP_FORCE * 1.55;
        this.gameState.jumpCount = 1;
        this.gameState.isDoingFrontFlip = true;
        this.gameState.runStats.jumps++;
        this.audio.playSound('super_jump');
    }
}

doDash() {
    if (!this.gameState || !this.logic.canDash(this.gameState)) return;
    const gs = this.gameState;
    this.audio.vibrate(75);
    gs.isDashing = true;
    this.logic.activateSkill('dash');
    gs.runStats.dashes++;
    this.audio.playSound('dash');

    if (this.dashTimeout) clearTimeout(this.dashTimeout);
    this.dashTimeout = setTimeout(() => {
        if (this.gameState === gs) gs.isDashing = false;
        this.dashTimeout = null;
    }, 450); // prodlouženo 300 → 450ms
}

togglePause() {
    if (!this.gameState?.isPlaying) return;
    this.gameState.isPaused = !this.gameState.isPaused;
    this.ui.togglePause(this.gameState.isPaused);
    this.threeD.clock.getDelta();
}
```

}