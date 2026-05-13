export class GameLogic {
    constructor() {
        this.skills = {
            doubleJump: { unlocked: true, cooldown: 0, duration: 2000 },
            dash: { unlocked: true, cooldown: 0, duration: 5000 },
            superJump: { unlocked: true, cooldown: 0, duration: 3000 }
        };
        this.currentGameState = null;
        this.speedTimeouts = new Set();
    }

    getInitialGameState() {
        return {
            isPlaying: true, isPaused: false, isDashing: false,
            score: 0, speed: 8, baseSpeed: 8, maxSpeed: 30,
            startTime: Date.now(),
            playerY: -0.6, playerVelocityY: 0, jumpCount: 0,
            lane: 1, lives: 3, maxLives: 5,
            invincibilityTimer: 0, hasShield: false,
            runStats: { jumps: 0, dashes: 0, powerups: 0, obstaclesDodged: 0 }
        };
    }

    resetSkills() {
        Object.values(this.skills).forEach(skill => skill.cooldown = 0);
        this.speedTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.speedTimeouts.clear();
    }

    updateSkills(gameState, delta) {
        // Zpětná kompatibilita pro staré volání updateSkills(delta).
        if (typeof gameState === 'number') {
            delta = gameState;
            gameState = this.currentGameState;
        }

        if (!Number.isFinite(delta) || delta <= 0) return;

        if (gameState && gameState.invincibilityTimer > 0) {
            gameState.invincibilityTimer = Math.max(0, gameState.invincibilityTimer - delta * 1000);
        }

        for (const skill of Object.values(this.skills)) {
            if (skill.cooldown > 0) {
                skill.cooldown = Math.max(0, skill.cooldown - delta * 1000);
            }
        }
    }
    
    activateSkill(skillName) {
        if (this.skills[skillName]) {
            this.skills[skillName].cooldown = this.skills[skillName].duration;
        }
    }

    canJump(gameState) {
        return gameState.jumpCount < 1 && gameState.playerY <= -0.6 && !gameState.isDoingFrontFlip;
    }

    canDoubleJump(gameState) {
        return gameState.jumpCount < 2 && this.skills.doubleJump.unlocked && this.skills.doubleJump.cooldown <= 0;
    }

    canSuperJump(gameState) {
        return this.skills.superJump.unlocked && this.skills.superJump.cooldown <= 0;
    }

    canDash(gameState) {
        return !gameState.isDashing && this.skills.dash.unlocked && this.skills.dash.cooldown <= 0;
    }

    updateScore(gameState, delta) {
        this.currentGameState = gameState;
        if (!Number.isFinite(delta) || delta <= 0) return;

        gameState.speed = Math.min(gameState.maxSpeed, gameState.baseSpeed + (Date.now() - gameState.startTime) / 2500);
        gameState.score += Math.floor(gameState.speed * delta * 10);
    }

    updatePlayerVerticalPosition(gameState, delta, gravity) {
        if (!Number.isFinite(delta) || delta <= 0) return;

        if (gameState.playerY > -0.6 || gameState.playerVelocityY !== 0) {
            gameState.playerVelocityY += gravity * delta;
            gameState.playerY += gameState.playerVelocityY * delta;
            if (gameState.playerY <= -0.6) {
                gameState.playerY = -0.6;
                gameState.playerVelocityY = 0;
                gameState.jumpCount = 0;
                gameState.isDoingFrontFlip = false;
            }
        }
    }

    collectPowerup(gameState, index, gameObjects) {
        const obj = gameObjects[index];
        if (!obj || !obj.mesh || !obj.mesh.visible) return null;

        obj.mesh.visible = false;
        gameState.runStats.powerups++;
        
        const { powerupType } = obj;

        if (powerupType === 'shield') {
            gameState.hasShield = true;
        } else if (powerupType === 'life') {
            if (gameState.lives < gameState.maxLives) gameState.lives++;
        } else if (powerupType === 'speed') {
            gameState.score += 500;
            gameState.baseSpeed += 1;
            const timeoutId = setTimeout(() => {
                gameState.baseSpeed = Math.max(1, gameState.baseSpeed - 1);
                this.speedTimeouts.delete(timeoutId);
            }, 5000);
            this.speedTimeouts.add(timeoutId);
        }
        
        return powerupType;
    }
    
    consumeShield(gameState) {
        if (gameState.hasShield) {
            gameState.hasShield = false;
            return true;
        }
        return false;
    }

    handlePlayerHit(gameState) {
        gameState.lives--;
        gameState.invincibilityTimer = 2000;
        return gameState.lives <= 0;
    }

    getFinalStats(gameState) {
        const stats = { 
            score: Math.max(0, Math.floor(gameState.score || 0)), 
            time: ((Date.now() - gameState.startTime) / 1000).toFixed(1), 
            ...gameState.runStats 
        };
        const best = Number(localStorage.getItem('fp3d_bestScore') || 0);
        stats.bestScore = Math.max(best, stats.score);
        return stats;
    }

    saveStats(finalStats) {
        localStorage.setItem('fp3d_bestScore', String(finalStats.bestScore));
    }
    
    loadStats(elements) {
        if (elements && elements['best-score']) {
            elements['best-score'].textContent = localStorage.getItem('fp3d_bestScore') || 0;
        }
    }
}
