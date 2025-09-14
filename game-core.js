game-core.js        canvas.addEventListener('touchstart', (e) => this.handleInput('touchstart', e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.handleInput('touchend', e), { passive: false });
    }

    /**
     * Spustí novou hru.
     */
    startGame() {
        this.audio.resumeContext();
        this.gameState = this.logic.getInitialGameState();
        this.logic.resetSkills();
        this.threeD.reset();
        this.ui.prepareForGame(this.logic.skills);
        
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        this.gameLoop();
    }
    
    /**
     * Hlavní herní smyčka.
     */
    gameLoop() {
        if (!this.gameState.isPlaying) return;
        this.animationFrame = requestAnimationFrame(() => this.gameLoop());
        if (this.gameState.isPaused) return;

        const delta = this.threeD.clock.getDelta();
        this.update(delta);
    }

    /**
     * Aktualizuje stav hry v každém snímku.
     */
    update(delta) {
        this.logic.updateScore(this.gameState, delta);
        this.ui.updateScore(this.gameState.score);
        this.logic.updatePlayerVerticalPosition(this.gameState, delta, GRAVITY);
        this.logic.updateSkills(delta, () => this.ui.updateSkillUI(this.logic.skills));

        const targetX = (this.gameState.lane - 1) * LANE_WIDTH;
        this.threeD.update(this.gameState, targetX, delta);
    }

    /**
     * Zpracovává kolize detekované v 3D modulu.
     */
    handleCollision(type, index) {
        if (type === 'obstacle') {
            this.gameOver();
        } else if (type === 'powerup') {
            this.logic.collectPowerup(this.gameState, index, this.threeD.gameObjects);
            this.audio.playSound('powerup');
            this.ui.showQuote('powerup');
            this.ui.glowScore();
            this.audio.vibrate(50);
        }
    }

    /**
     * Ukončí hru a zobrazí statistiky.
     */
    gameOver() {
        if (!this.gameState.isPlaying) return;
        this.audio.vibrate([100, 50, 100]);
        this.gameState.isPlaying = false;
        this.audio.playSound('collision');
        this.ui.showQuote('collision');
        
        const finalStats = this.logic.getFinalStats(this.gameState);
        this.logic.saveStats(finalStats);
        this.ui.showGameOverScreen(finalStats);
    }
    
    /**
     * Zpracovává vstupy od hráče (klávesnice, dotyk).
     */
    handleInput(type, event) {
        if (!this.gameState.isPlaying || this.gameState.isPaused) return;

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

    /**
     * Provede skok nebo dvojskok.
     */
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

    /**
     * Provede rychlý pohyb vpřed (dash).
     */
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

    /**
     * Přepne stav pauzy.
     */
    togglePause() {
        if (!this.gameState.isPlaying) return;
        this.gameState.isPaused = !this.gameState.isPaused;
        this.ui.togglePauseButton(this.gameState.isPaused);
    }
}

export { GameCore };

