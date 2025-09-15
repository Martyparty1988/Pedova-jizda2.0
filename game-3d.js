import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { Game3D } from './game-3d.js';
import { GameUI } from './game-ui.js';
import { GameLogic } from './game-logic.js';
import { GameAudio } from './game-audio.js';

export class GameCore {
    constructor() {
        this.isGameRunning = false;
        this.totalTime = 0;
        // OPRAVA: Vytvoření instance hodin pro měření času
        this.clock = new THREE.Clock();
        
        this.lastSwipe = 0;
        this.swipeCooldown = 200; // ms
        this.lastSuperSwipe = 0;
        this.superSwipeCooldown = 500; // ms
    }

    async init() {
        try {
            this.ui = new GameUI();
            this.logic = new GameLogic();
            this.audio = new GameAudio();
            await this.audio.loadSounds();

            this.game3d = new Game3D(this);
            this.game3d.init();
            
            this.setupEventListeners();
            
            this.menuLoop();
            
        } catch (error) {
            console.error("Fatální chyba při inicializaci hry:", error);
            this.ui.showError("Nepodařilo se spustit hru. Zkuste obnovit stránku.");
        }
    }
    
    setupEventListeners() {
        this.ui.startButton.addEventListener('click', () => this.startGame());
        this.ui.restartButton.addEventListener('click', () => this.startGame());

        let touchstartX = 0;
        let touchstartY = 0;
        let touchendX = 0;
        let touchendY = 0;

        document.addEventListener('touchstart', e => {
            touchstartX = e.changedTouches[0].screenX;
            touchstartY = e.changedTouches[0].screenY;
        }, { passive: false });

        document.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            touchendY = e.changedTouches[0].screenY;
            this.handleSwipe();
        });
        
        const handleSwipe = () => {
             const deltaX = touchendX - touchstartX;
             const deltaY = touchendY - touchstartY;
             const now = Date.now();

            if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 30) {
                if (deltaY < 0 && now - this.lastSwipe > this.swipeCooldown) { // Swipe up
                    if(now - this.lastSuperSwipe < this.superSwipeCooldown){
                        this.logic.requestSuperJump = true;
                    } else {
                        this.logic.requestJump = true;
                    }
                    this.lastSuperSwipe = now;
                    this.lastSwipe = now;
                }
            }
        };

        document.addEventListener('keydown', (event) => {
            if (!this.isGameRunning) return;
            if (event.code === 'Space') {
                this.logic.requestJump = true;
            }
        });
    }

    startGame() {
        this.isGameRunning = true;
        this.logic.reset();
        this.ui.showHUD();
        this.ui.updateLives(this.logic.lives);
        this.ui.updateScore(this.logic.score);
        this.ui.updateCollectibles(this.logic.collectibles);
        this.audio.play('start');
        
        this.game3d.startIntroAnimation(() => {
            this.gameLoop();
        });
    }

    gameOver() {
        this.isGameRunning = false;
        this.ui.showGameOver(this.logic.score);
        this.audio.play('gameOver');
    }
    
    menuLoop() {
        if (this.isGameRunning) return;
        requestAnimationFrame(() => this.menuLoop());
        const delta = this.clock.getDelta();
        this.totalTime += delta;
        // Zde může být animace pozadí v menu
        this.game3d.renderer.render(this.game3d.scene, this.game3d.camera);
    }

    gameLoop() {
        if (!this.isGameRunning) return;
        
        const delta = this.clock.getDelta();
        this.totalTime += delta;

        this.logic.update(delta);
        this.game3d.update(delta, this.logic);
        this.ui.updateScore(this.logic.score);

        if (this.logic.isGameOver) {
            this.gameOver();
        } else {
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}


