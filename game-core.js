// game-core.js

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

        this.init();
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
                console.error(`Chyba: Element s ID '${id}' nebyl nalezen a nelze na něj navázat event listener.`);
            }
        };

        addListener('play-btn', 'click', () => this.startGame());
        addListener('restart-btn', 'click', () => this.startGame());
        addListener('menu-btn', 'click', () => this.ui.showScreen('main-menu'));
        addListener('pause-btn', 'click', () => this.togglePause());
        addListener('analyze-run-btn', 'click', () => this.ui.analyzeRun());

        window.addEventListener('resize', () => this.threeD.onWindowResize());
        window.addEventListener('keydown', (e) => this.handleInput('keydown', e));

        const canvas = this.ui.elements['game-canvas'];
        if (canvas) {
            canvas.addEventListener('touchstart', (e) => this.handleInput('touchstart', e), { passive: false });
            canvas.addEventListener('touchend', (e) => this.handleInput('touchend', e), { passive: false });
        } else {
            console.error("Chyba: Element canvas s ID 'game-canvas' nebyl nalezen.");
        }
    }

    startGame() {
        this.audio.resumeContext();
        this.gameState = this.logic.getInitialGameState();
        this.logic.resetSkills();
        this.threeD.reset();
        this.ui.showScreen('game-screen');
        this.ui.updateSkillUI(this.logic.skills);

        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        this.gameLoop();
    }

    gameLoop() {
        if (!this.gameState.isPlaying) return;
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
        if (type === 'obstacle') {
            this.gameOver();
        } else if (type === 'powerup') {
            this.logic.collectPowerup(this.gameState, index, this.threeD.gameObjects);
            this.audio.playSound('powerup');
            this.ui.showQuote('powerup');
            this.ui.triggerScoreGlow();
            this.audio.vibrate(50);
        }
    }

    gameOver() {
        if (!this.gameState.isPlaying) return;
        this.audio.vibrate([100, 50, 100]);
        this.gameState.isPlaying = false;
        this.audio.playSound('collision');
        this.ui.showQuote('collision');

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
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
                this.gameState.lane = Math.max(0, Math.min(2, this.gameState.lane + (dx > 0 ? 1 : -1)));
            } else if (Math.abs(dy) > 30) {
                if (dy < 0) this.doJump(); else this.doDash();
            }
            this.touchStart = null;
        } else if (type === 'keydown') {
            switch (event.code) {
                case 'ArrowLeft': case 'KeyA': this.gameState.lane = Math.max(0, this.gameState.lane - 1); break;
                case 'ArrowRight': case 'KeyD': this.gameState.lane = Math.min(2, this.gameState.lane + 1); break;
                case 'ArrowUp': case 'KeyW': case 'Space': event.preventDefault(); this.doJump(); break;
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
            this.audio.playSound('jump');
            this.ui.showQuote('frontflip');
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
            this.ui.showQuote('slide');
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
