import { GameUI } from './game-ui.js';
import { Game3D } from './game-3d.js';
import { GameLogic } from './game-logic.js';
import { GameAudio } from './game-audio.js';

const GRAVITY = -30;
const JUMP_FORCE = 10;
const LANE_WIDTH = 4;
const MAX_DELTA = 0.05;

export class GameCore {
    constructor() {
        this.ui = new GameUI();
        this.logic = new GameLogic();
        this.audio = new GameAudio();
        this.threeD = new Game3D({
            canvas: this.ui.elements['game-canvas'],
            onCollision: (type, index) => this.handleCollision(type, index)
        });

        this.gameState = null;
        this.animationFrame = null;
        this.touchStart = null;
        this.menuAnimationFrame = null;
        this.dashTimeout = null;

        this.lastSwipeUpTime = 0;
        this.lastJumpKeyPressTime = 0;
        this.doubleTapDelay = 300;

        this.init();
    }

    async init() {
        const menuLoadingText = this.ui.elements['menu-loading-text'];
        const menuLoadingContainer = this.ui.elements['menu-loading-container'];
        const playBtn = this.ui.elements['play-btn'];

        try {
            if (menuLoadingText) menuLoadingText.textContent = 'Načítám 3D scénu...';
            await this.threeD.init();
            
            if (menuLoadingText) menuLoadingText.textContent = 'Inicializuji audio...';
            this.audio.init();

            this.setupEventListeners();
            this.logic.loadStats(this.ui.elements);

            if (menuLoadingContainer) menuLoadingContainer.style.display = 'none';
            if (playBtn) playBtn.disabled = false;
            
            this.menuLoop();
        } catch (error) {
            console.error('Fatální chyba při inicializaci hry:', error);
            this.ui.showScreen('webgl-fallback');
        }
    }

    setupEventListeners() {
        const addListener = (id, event, handler) => {
            const element = this.ui.elements[id];
            if (element) element.addEventListener(event, handler);
        };

        addListener('play-btn', 'click', () => this.startGame());
        addListener('restart-btn', 'click', () => this.startGame());
        addListener('menu-btn', 'click', () => this.returnToMenu());
        addListener('pause-btn', 'click', () => this.togglePause());

        window.addEventListener('resize', () => this.threeD.onWindowResize());
        window.addEventListener('keydown', (e) => this.handleInput('keydown', e));
        window.addEventListener('blur', () => {
            if (this.gameState?.isPlaying && !this.gameState.isPaused) this.togglePause();
        });

        const canvas = this.ui.elements['game-canvas'];
        if (canvas) {
            canvas.addEventListener('touchstart', (e) => this.handleInput('touchstart', e), { passive: false });
            canvas.addEventListener('touchend', (e) => this.handleInput('touchend', e), { passive: false });
            canvas.addEventListener('touchcancel', () => { this.touchStart = null; }, { passive: true });
        }
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
        if (this.menuAnimationFrame) {
            cancelAnimationFrame(this.menuAnimationFrame);
            this.menuAnimationFrame = null;
        }
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
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
        if (!this.gameState || !this.gameState.isPlaying) return;
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

        const targetX = (this.gameState.lane - 1) * LANE_WIDTH;
        this.threeD.update(this.gameState, targetX, delta);
    }

    handleCollision(type, index) {
        if (!this.gameState || !this.gameState.isPlaying) return;

        if (type.startsWith('powerup')) {
            const powerupType = this.logic.collectPowerup(this.gameState, index, this.threeD.gameObjects);
            if (!powerupType) return;

            if (powerupType === 'life' || powerupType === 'shield') {
                this.ui.updateLives(this.gameState.lives);
                this.audio.playSound('powerup_shield');
            } else {
                this.audio.playSound('powerup');
            }
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
                if (flash) {
                    flash.classList.add('flash');
                    setTimeout(() => flash.classList.remove('flash'), 500);
                }
                this.audio.vibrate([100, 50, 100]);
                this.audio.playSound('collision');

                const isGameOver = this.logic.handlePlayerHit(this.gameState);
                this.ui.updateLives(this.gameState.lives);
                
                if (isGameOver) this.gameOver();
            }
        }
    }

    gameOver() {
        if (!this.gameState?.isPlaying) return;
        this.gameState.isPlaying = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        const finalStats = this.logic.getFinalStats(this.gameState);
        this.logic.saveStats(finalStats);
        this.ui.showGameOver(finalStats);
    }
    
    handleInput(type, event) {
        if (!this.gameState || !this.gameState.isPlaying || this.gameState.isPaused) return;

        if (type === 'touchstart') {
            event.preventDefault();
            const touch = event.touches?.[0];
            if (!touch) return;
            this.touchStart = { x: touch.clientX, y: touch.clientY };
        } else if (type === 'touchend') {
            event.preventDefault();
            if (!this.touchStart) return;
            const touch = event.changedTouches?.[0];
            if (!touch) return;

            const dx = touch.clientX - this.touchStart.x;
            const dy = touch.clientY - this.touchStart.y;
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);

            if (absX > absY && absX > 30) {
                this.gameState.lane = Math.max(0, Math.min(2, this.gameState.lane + (dx > 0 ? 1 : -1)));
            } else if (absY > 30) {
                if (dy < 0) this.handleJumpGesture();
                else this.doDash();
            }
            this.touchStart = null;
        } else if (type === 'keydown') {
            switch (event.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    this.gameState.lane = Math.max(0, this.gameState.lane - 1);
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.gameState.lane = Math.min(2, this.gameState.lane + 1);
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
        if (this.logic.canJump(this.gameState)) {
            this.gameState.playerVelocityY = JUMP_FORCE;
            this.gameState.jumpCount = 1;
            this.gameState.runStats.jumps++;
            this.audio.playSound('jump');
        } else if (this.logic.canDoubleJump(this.gameState)) {
            this.gameState.playerVelocityY = JUMP_FORCE * 0.9;
            this.gameState.jumpCount = 2;
            this.logic.activateSkill('doubleJump');
            this.gameState.runStats.jumps++;
            this.gameState.isDoingTrick = true;
            this.audio.playSound('jump');
        }
    }

    doSuperJump() {
        if (this.logic.canJump(this.gameState) && this.logic.canSuperJump(this.gameState)) {
            this.logic.activateSkill('superJump');
            this.gameState.playerVelocityY = JUMP_FORCE * 1.5;
            this.gameState.jumpCount = 1;
            this.gameState.isDoingFrontFlip = true;
            this.gameState.runStats.jumps++;
            this.audio.playSound('super_jump');
        }
    }

    doDash() {
        if (this.logic.canDash(this.gameState)) {
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
            }, 300);
        }
    }

    togglePause() {
        if (!this.gameState || !this.gameState.isPlaying) return;
        this.gameState.isPaused = !this.gameState.isPaused;
        this.ui.togglePause(this.gameState.isPaused);
        this.threeD.clock.getDelta();
    }
}
