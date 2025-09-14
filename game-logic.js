class GameLogic {
    constructor() {
        // ZMĚNA: Přidána nová schopnost 'superJump'
        this.skills = {
            doubleJump: { unlocked: true, cooldown: 0, duration: 2000 },
            dash: { unlocked: true, cooldown: 0, duration: 5000 },
            superJump: { unlocked: true, cooldown: 0, duration: 3000 }
        };
    }

    getInitialGameState() {
        return {
            isPlaying: true,
            isPaused: false,
            isDashing: false,
            score: 0,
            speed: 8,
            baseSpeed: 8,
            maxSpeed: 30,
            startTime: Date.now(),
            playerY: -0.6,
            playerVelocityY: 0,
            jumpCount: 0,
            lane: 1,
            lives: 3,
            maxLives: 5,
            invincibilityTimer: 0,
            hasShield: false,
            runStats: {
                jumps: 0,
                dashes: 0,
                powerups: 0,
                obstaclesDodged: 0
            }
        };
    }

    resetSkills() {
        this.skills.doubleJump.cooldown = 0;
        this.skills.dash.cooldown = 0;
        this.skills.superJump.cooldown = 0; // ZMĚNA: Reset cooldownu i pro super skok
    }

    updateSkills(delta, onUpdate) {
        let needsUpdate = false;
        if (this.currentGameState && this.currentGameState.invincibilityTimer > 0) {
            this.currentGameState.invincibilityTimer -= delta * 1000;
        }

        for (const skill of Object.values(this.skills)) {
            if (skill.cooldown > 0) {
                skill.cooldown -= delta * 1000;
                if (skill.cooldown <= 0) {
                    skill.cooldown = 0;
                    needsUpdate = true;
                }
            }
        }
        if (needsUpdate && onUpdate) {
            onUpdate();
        }
    }
    
    activateSkill(skillName) {
        if(this.skills[skillName]) {
            this.skills[skillName].cooldown = this.skills[skillName].duration;
        }
    }

    canJump(gameState) {
        // Nelze skočit, pokud se provádí salto vpřed
        return gameState.jumpCount < 1 && gameState.playerY <= -0.6 && !gameState.isDoingFrontFlip;
    }

    canDoubleJump(gameState) {
        return gameState.jumpCount < 2 && this.skills.doubleJump.cooldown <= 0;
    }

    // ZMĚNA: Nová funkce pro ověření, zda lze provést super skok
    canSuperJump(gameState) {
        return this.skills.superJump.cooldown <= 0;
    }

    canDash(gameState) {
        return !gameState.isDashing && this.skills.dash.cooldown <= 0;
    }

    updateScore(gameState, delta) {
        this.currentGameState = gameState;
        gameState.speed = Math.min(gameState.maxSpeed, gameState.baseSpeed + (Date.now() - gameState.startTime) / 2500);
        gameState.score += Math.floor(gameState.speed * delta * 10);
    }

    updatePlayerVerticalPosition(gameState, delta, gravity) {
        if (gameState.playerY > -0.6 || gameState.playerVelocityY !== 0) {
            gameState.playerVelocityY += gravity * delta;
            gameState.playerY += gameState.playerVelocityY * delta;
            if (gameState.playerY <= -0.6) {
                gameState.playerY = -0.6;
                gameState.playerVelocityY = 0;
                gameState.jumpCount = 0;
            }
        }
    }

    collectPowerup(gameState, index, gameObjects) {
        const obj = gameObjects[index];
        if (!obj || !obj.mesh.visible) return null;

        obj.mesh.visible = false;
        gameState.runStats.powerups++;
        
        const powerupType = obj.powerupType;

        if (powerupType === 'shield') {
            gameState.hasShield = true;
        } else if (powerupType === 'life') {
            if (gameState.lives < gameState.maxLives) {
                gameState.lives++;
            }
        } else { // 'speed' je default
            gameState.score += 500;
            gameState.baseSpeed += 1;
            setTimeout(() => gameState.baseSpeed -= 1, 5000);
        }
        
        setTimeout(() => {
            const realIndex = gameObjects.indexOf(obj);
            if (realIndex > -1) {
                 gameObjects.splice(realIndex, 1);
            }
        }, 100);
        
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
            score: gameState.score, 
            time: ((Date.now() - gameState.startTime) / 1000).toFixed(1), 
            ...gameState.runStats 
        };
        const best = localStorage.getItem('fp3d_bestScore') || 0;
        stats.bestScore = Math.max(best, stats.score);
        return stats;
    }

    saveStats(finalStats) {
        localStorage.setItem('fp3d_bestScore', finalStats.bestScore);
    }
    
    loadStats(elements) {
        elements['best-score'].textContent = localStorage.getItem('fp3d_bestScore') || 0;
    }
}

export { GameLogic };
