import { GameUI } from './game-ui.js';
import { Game3D } from './game-3d.js';
import { GameLogic } from './game-logic.js';
import { GameAudio } from './game-audio.js';

const GRAVITY = -30;
const JUMP_FORCE = 10;
const LANE_WIDTH = 4;

class GameCore {
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

        // ZMĚNA: Přidány proměnné pro detekci dvojitého stisku/swipu
        this.lastSwipeUpTime = 0;
        this.lastJumpKeyPressTime = 0;
        this.doubleTapDelay = 300; // 300ms okno pro dvojitý stisk
    }

    async init() {
        this.ui.showLoading('Načítám 3D scénu...');
        try {
            await this.threeD.init();
            this.ui.showLoading('Inicializuji audio...');
            this.audio.init();
            this.setupEventListeners();
            this.logic.loadStats(this.ui.elements);
            this.ui.showScreen('main-menu');
            this.menuLoop();
        } catch (error) {
            console.error("Fatální chyba při inicializaci hry:", error);
            this.ui.elements['webgl-fallback'].classList.add('active');
        }
    }

    setupEventListeners() {
        const addListener = (id, event, handler) => {
            const element = this.ui.elements[id];
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`Element s ID '${id}' nebyl nalezen.`);
            }
        };

        addListener('play-btn', 'click', () => this.startGame());
        addListener('restart-btn', 'click', () => this.startGame());
        addListener('menu-btn', 'click', () => {
            this.ui.showScreen('main-menu');
            this.threeD.player.mesh.visible = false;
            this.menuLoop();
        });
        addListener('pause-btn', 'click', () => this.togglePause());
        addListener('analyze-run-btn', 'click', () => this.ui.analyzeRun());

        window.addEventListener('resize', () => this.threeD.onWindowResize());
        window.addEventListener('keydown', (e) => this.handleInput('keydown', e));

        const canvas = this.ui.elements['game-canvas'];
        if (canvas) {
            canvas.addEventListener('touchstart', (e) => this.handleInput('touchstart', e), { passive: false });
            canvas.addEventListener('touchend', (e) => this.handleInput('touchend', e), { passive: false });
        }
    }

    startGame() {
        if (this.menuAnimationFrame) cancelAnimationFrame(this.menuAnimationFrame);
        
        this.audio.resumeContext();
        this.gameState = this.logic.getInitialGameState();
        this.gameState.isDoingTrick = false; 
        // ZMĚNA: Přidán nový stav pro salto vpřed
        this.gameState.isDoingFrontFlip = false;
        this.logic.resetSkills();
        this.threeD.reset();
        this.ui.showScreen('game-screen');
        this.ui.updateSkillUI(this.logic.skills);
        this.ui.updateLives(this.gameState.lives);
        
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        this.gameLoop();
    }
    
    menuLoop() {
        this.menuAnimationFrame = requestAnimationFrame(() => this.menuLoop());
        const delta = this.threeD.clock.getDelta();
        this.threeD.updateMenuBackground(delta);
    }
    
    gameLoop() {
        if (!this.gameState || !this.gameState.isPlaying) return;
        this.animationFrame = requestAnimationFrame(() => this.gameLoop());
        if (this.gameState.isPaused) return;

        const delta = this.threeD.clock.getDelta();
        this.update(delta);
    }

    update(delta) {
        this.logic.updateScore(this.gameState, delta);
        this.ui.updateScore(this.gameState.score);
        this.logic.updatePlayerVerticalPosition(this.gameState, delta, GRAVITY);
        this.logic.updateSkills(delta, () => this.ui.updateSkillUI(this.logic.skills));

        const targetX = (this.gameState.lane - 1) * LANE_WIDTH;
        this.threeD.update(this.gameState, targetX, delta);
    }

    handleCollision(type, index) {
        if (type.startsWith('powerup')) {
            const powerupType = this.logic.collectPowerup(this.gameState, index, this.threeD.gameObjects);
            if (powerupType === 'life') {
                this.ui.updateLives(this.gameState.lives);
                this.audio.playSound('powerup_shield');
                this.ui.showQuote('powerup');
            } else if (powerupType === 'shield') {
                this.audio.playSound('powerup_shield');
                this.ui.showQuote('powerup');
            } else {
                this.audio.playSound('powerup');
                this.ui.showQuote('powerup');
                this.ui.triggerScoreGlow();
            }
            this.audio.vibrate(50);
        } else if (type === 'obstacle') {
            if (this.gameState.invincibilityTimer > 0) return;

            if (this.logic.consumeShield(this.gameState)) {
                this.audio.playSound('shield_break');
                this.threeD.triggerShieldBreakEffect();
                this.threeD.gameObjects[index].mesh.visible = false;
                this.gameState.invincibilityTimer = 1000;
            } else {
                const flash = document.getElementById('collision-flash');
                flash.classList.add('flash');
                setTimeout(() => flash.classList.remove('flash'), 500);
                this.audio.vibrate([100, 50, 100]);
                this.audio.playSound('collision');

                const isGameOver = this.logic.handlePlayerHit(this.gameState);
                this.ui.updateLives(this.gameState.lives);
                
                if (isGameOver) {
                    this.gameOver();
                }
            }
        }
    }

    gameOver() {
        if (!this.gameState.isPlaying) return;
        this.gameState.isPlaying = false;
        this.ui.showQuote('gameover');
        
        const finalStats = this.logic.getFinalStats(this.gameState);
        this.logic.saveStats(finalStats);
        this.ui.showGameOver(finalStats);
    }
    
    handleInput(type, event) {
        if (!this.gameState || !this.gameState.isPlaying || this.gameState.isPaused) return;

        if (type === 'touchstart') {
            event.preventDefault();
            this.touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        } else if (type === 'touchend') {
            event.preventDefault();
            if (!this.touchStart) return;
            const dx = event.changedTouches[0].clientX - this.touchStart.x;
            const dy = event.changedTouches[0].clientY - this.touchStart.y;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) { // Swipe do strany
                this.gameState.lane = Math.max(0, Math.min(2, this.gameState.lane + (dx > 0 ? 1 : -1)));
            } else if (Math.abs(dy) > 30) {
                if (dy < 0) { // Swipe nahoru
                    // ZMĚNA: Detekce dvojitého swipu
                    const now = Date.now();
                    if (now - this.lastSwipeUpTime < this.doubleTapDelay) {
                        this.doSuperJump();
                        this.lastSwipeUpTime = 0; // Reset, aby se zamezilo trojitému swipu
                    } else {
                        this.doJump();
                    }
                    this.lastSwipeUpTime = now;
                } else { // Swipe dolů
                    this.doDash();
                }
            }
            this.touchStart = null;
        } else if (type === 'keydown') {
            switch (event.code) {
                case 'ArrowLeft': case 'KeyA': this.gameState.lane = Math.max(0, this.gameState.lane - 1); break;
                case 'ArrowRight': case 'KeyD': this.gameState.lane = Math.min(2, this.gameState.lane + 1); break;
                case 'ArrowUp': case 'KeyW': case 'Space': 
                    event.preventDefault();
                    // ZMĚNA: Detekce dvojitého stisku
                    const now = Date.now();
                    if (now - this.lastJumpKeyPressTime < this.doubleTapDelay) {
                        this.doSuperJump();
                        this.lastJumpKeyPressTime = 0; // Reset
                    } else {
                        this.doJump();
                    }
                    this.lastJumpKeyPressTime = now;
                    break;
                case 'ArrowDown': case 'KeyS': event.preventDefault(); this.doDash(); break;
            }
        }
    }

    doJump() {
        if (this.logic.canJump(this.gameState)) {
            this.gameState.playerVelocityY = JUMP_FORCE;
            this.gameState.jumpCount = 1;
            this.gameState.runStats.jumps++;
            this.audio.playSound('jump');
            this.ui.showQuote('jump');
        } else if (this.logic.canDoubleJump(this.gameState)) {
            this.gameState.playerVelocityY = JUMP_FORCE * 0.9;
            this.gameState.jumpCount = 2;
            this.logic.activateSkill('doubleJump');
            this.ui.updateSkillUI(this.logic.skills);
            this.gameState.runStats.jumps++;
            this.gameState.isDoingTrick = true;
            this.audio.playSound('jump');
            this.ui.showQuote('trik');
        }
    }

    // ZMĚNA: Nová funkce pro super skok
    doSuperJump() {
        // Super skok lze provést pouze ze země
        if (this.logic.canJump(this.gameState) && this.logic.canSuperJump(this.gameState)) {
            this.logic.activateSkill('superJump');
            this.ui.updateSkillUI(this.logic.skills);

            this.gameState.playerVelocityY = JUMP_FORCE * 1.5; // O 50% vyšší skok
            this.gameState.jumpCount = 1; // Spotřebuje první skok
            this.gameState.isDoingFrontFlip = true; // Spustí animaci salta
            
            this.gameState.runStats.jumps++;
            this.audio.playSound('super_jump'); // Nový zvukový efekt
            this.ui.showQuote('super_jump'); // Nová hláška
        }
    }

    doDash() {
        if (this.logic.canDash(this.gameState)) {
            this.audio.vibrate(75);
            this.gameState.isDashing = true;
            this.logic.activateSkill('dash');
            this.ui.updateSkillUI(this.logic.skills);
            this.gameState.runStats.dashes++;
            this.audio.playSound('dash');
            this.ui.showQuote('boost');
            setTimeout(() => this.gameState.isDashing = false, 300);
        }
    }

    togglePause() {
        if (!this.gameState || !this.gameState.isPlaying) return;
        this.gameState.isPaused = !this.gameState.isPaused;
        this.ui.togglePause(this.gameState.isPaused);
    }
}

export { GameCore };
