import { GameUI } from './game-ui.js';
import { Game3D } from './game-3d.js';
import { GameLogic } from './game-logic.js';
import { GameAudio } from './game-audio.js';

const GRAVITY = -28;
const JUMP_FORCE = 10;
const LANE_WIDTH = 4;
const MAX_DELTA = 0.05;
const SWIPE_MIN_XY = 28;
const SWIPE_MIN_DOWN = 70;

export class GameCore {
    constructor() {
        this.ui = new GameUI();
        this.logic = new GameLogic();
        this.audio = new GameAudio();
        this.threeD = new Game3D({
            canvas: this.ui.elements['game-canvas'],
            onCollision: (type, index) => this.handleCollision(type, index),
            onObstaclePassed: (closeness) => this.handleObstaclePassed(closeness)
        });

        this.gameState = null;
        this.animationFrame = null;
        this.touchStart = null;
        this.menuAnimationFrame = null;
        this.dashTimeout = null;

        this.lastSwipeUpTime = 0;
        this.lastJumpKeyPressTime = 0;
        this.doubleTapDelay = 400;

        this.init();
    }

    async init() {
        try {
            const loadingText = this.ui.elements['menu-loading-text'];
            const loadingContainer = this.ui.elements['menu-loading-container'];
            const playBtn = this.ui.elements['play-btn'];

            if (loadingText) loadingText.textContent = 'Načítám 3D scénu...';
            await this.threeD.init();

            if (loadingText) loadingText.textContent = 'Inicializuji audio...';
            this.audio.init();

            this.setupEventListeners();
            this.logic.loadStats(this.ui.elements);

            if (loadingContainer) loadingContainer.style.display = 'none';
            if (playBtn) playBtn.disabled = false;

            this.menuLoop();
        } catch (error) {
            console.error('Fatal game init error:', error);
            this.ui.showScreen('webgl-fallback');
        }
    }

    setupEventListeners() {
        const on = (id, eventName, handler) => {
            const el = this.ui.elements[id] || document.getElementById(id);
            if (el) el.addEventListener(eventName, handler);
        };

        on('play-btn', 'click', () => this.startGame());
        on('restart-btn', 'click', () => this.startGame());
        on('menu-btn', 'click', () => this.returnToMenu());
        on('pause-btn', 'click', () => this.togglePause());

        window.addEventListener('resize', () => this.threeD.onWindowResize());
        window.addEventListener('keydown', (e) => this.handleKeyInput(e));
        window.addEventListener('blur', () => {
            if (this.gameState?.isPlaying && !this.gameState.isPaused) this.togglePause();
        });

        const canvas = this.ui.elements['game-canvas'];
        if (canvas) {
            canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
            canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
            canvas.addEventListener('touchcancel', () => { this.touchStart = null; }, { passive: true });
        }

        on('ctrl-left', 'touchstart', (e) => { e.preventDefault(); this.moveLane(-1); });
        on('ctrl-right', 'touchstart', (e) => { e.preventDefault(); this.moveLane(1); });
        on('ctrl-jump', 'touchstart', (e) => { e.preventDefault(); this.handleJumpTap(); });
        on('ctrl-dash', 'touchstart', (e) => { e.preventDefault(); this.doDash(); });

        on('ctrl-left', 'click', () => this.moveLane(-1));
        on('ctrl-right', 'click', () => this.moveLane(1));
        on('ctrl-jump', 'click', () => this.handleJumpTap());
        on('ctrl-dash', 'click', () => this.doDash());
    }

    returnToMenu() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.gameState = null;
        this.ui.showScreen('main-menu');
        if (this.threeD.player) this.threeD.player.mesh.visible = false;
        this.threeD.clock.getDelta();
        this.menuLoop();
    }

    startGame() {
        if (this.menuAnimationFrame) cancelAnimationFrame(this.menuAnimationFrame);
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        this.menuAnimationFrame = null;
        this.animationFrame = null;

        if (this.dashTimeout) {
            clearTimeout(this.dashTimeout);
            this.dashTimeout = null;
        }

        this.audio.resumeContext();
        this.logic.resetSkills();
        this.gameState = this.logic.getInitialGameState();
        this.gameState.isDoingTrick = false;
        this.gameState.isDoingFrontFlip = false;
        this.touchStart = null;
        this.lastSwipeUpTime = 0;
        this.lastJumpKeyPressTime = 0;

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
        this.ui.updateCombo(this.gameState.combo);
        this.ui.updateDashCooldown(this.logic.getDashCooldownPercent());

        const targetX = (this.gameState.lane - 1) * LANE_WIDTH;
        this.threeD.update(this.gameState, targetX, delta);
    }

    handleObstaclePassed(closeness = 0) {
        if (!this.gameState?.isPlaying) return;
        this.logic.dodgedObstacle(this.gameState);
        if (closeness > 0.65) {
            const bonus = this.logic.nearMissBonus(this.gameState);
            this.ui.showNearMiss(bonus);
            this.audio.vibrate(30);
        }
    }

    handleCollision(type, index) {
        if (!this.gameState?.isPlaying) return;

        if (type.startsWith('powerup')) {
            const powerupType = this.logic.collectPowerup(this.gameState, index, this.threeD.gameObjects);
            if (!powerupType) return;

            this.ui.updateLives(this.gameState.lives);
            this.audio.playSound(powerupType === 'shield' || powerupType === 'life' ? 'powerup_shield' : 'powerup');
            this.audio.vibrate(50);
            return;
        }

        if (type !== 'obstacle') return;
        if (this.gameState.invincibilityTimer > 0) return;

        if (this.logic.consumeShield(this.gameState)) {
            this.audio.playSound('shield_break');
            this.threeD.triggerShieldBreakEffect();
            if (this.threeD.gameObjects[index]?.mesh) this.threeD.gameObjects[index].mesh.visible = false;
            this.gameState.invincibilityTimer = 1000;
            return;
        }

        const flash = document.getElementById('collision-flash');
        if (flash) {
            flash.classList.add('flash');
            setTimeout(() => flash.classList.remove('flash'), 500);
        }
        this.audio.vibrate([100, 50, 100]);
        this.audio.playSound('collision');

        if (this.logic.handlePlayerHit(this.gameState)) this.gameOver();
        else this.ui.updateLives(this.gameState.lives);
    }

    gameOver() {
        if (!this.gameState?.isPlaying) return;
        this.gameState.isPlaying = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        const stats = this.logic.getFinalStats(this.gameState);
        this.logic.saveStats(stats);
        this.ui.showGameOver(stats);
    }

    handleTouchStart(event) {
        if (!this.gameState?.isPlaying || this.gameState.isPaused) return;
        event.preventDefault();
        const touch = event.touches?.[0];
        if (touch) this.touchStart = { x: touch.clientX, y: touch.clientY };
    }

    handleTouchEnd(event) {
        if (!this.gameState?.isPlaying || this.gameState.isPaused) return;
        event.preventDefault();
        if (!this.touchStart) return;
        const touch = event.changedTouches?.[0];
        if (!touch) return;

        const dx = touch.clientX - this.touchStart.x;
        const dy = touch.clientY - this.touchStart.y;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (absX > absY && absX > SWIPE_MIN_XY) this.moveLane(dx > 0 ? 1 : -1);
        else if (dy < -SWIPE_MIN_XY && absY > absX) this.handleJumpGesture();
        else if (dy > SWIPE_MIN_DOWN && absY > absX * 1.5) this.doDash();
        else if (absX < 15 && absY < 15) this.handleJumpTap();

        this.touchStart = null;
    }

    handleKeyInput(event) {
        if (!this.gameState?.isPlaying || this.gameState.isPaused) {
            if (event.code === 'Escape') this.togglePause();
            return;
        }

        switch (event.code) {
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLane(-1);
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveLane(1);
                break;
            case 'ArrowUp':
            case 'KeyW':
            case 'Space':
                event.preventDefault();
                this.handleJumpKey();
                break;
            case 'ArrowDown':
            case 'KeyS':
                event.preventDefault();
                this.doDash();
                break;
            case 'Escape':
                this.togglePause();
                break;
        }
    }

    moveLane(direction) {
        if (!this.gameState) return;
        const newLane = Math.max(0, Math.min(2, this.gameState.lane + direction));
        if (newLane !== this.gameState.lane) {
            this.gameState.lane = newLane;
            this.audio.vibrate(20);
        }
    }

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

        const stateAtDashStart = this.gameState;
        this.audio.vibrate(75);
        stateAtDashStart.isDashing = true;
        this.logic.activateSkill('dash');
        stateAtDashStart.runStats.dashes++;
        this.audio.playSound('dash');

        if (this.dashTimeout) clearTimeout(this.dashTimeout);
        this.dashTimeout = setTimeout(() => {
            if (this.gameState === stateAtDashStart) stateAtDashStart.isDashing = false;
            this.dashTimeout = null;
        }, 450);
    }

    togglePause() {
        if (!this.gameState?.isPlaying) return;
        this.gameState.isPaused = !this.gameState.isPaused;
        this.ui.togglePause(this.gameState.isPaused);
        this.threeD.clock.getDelta();
    }
}
