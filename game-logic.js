export class GameLogic {
constructor() {
this.skills = {
doubleJump: { unlocked: true, cooldown: 0, duration: 1500 },
dash:       { unlocked: true, cooldown: 0, duration: 3500 },
superJump:  { unlocked: true, cooldown: 0, duration: 3000 }
};
this.currentGameState = null;
this.speedTimeouts = new Set();
}

```
getInitialGameState() {
    return {
        isPlaying: true, isPaused: false, isDashing: false,
        score: 0, speed: 7, baseSpeed: 7, maxSpeed: 32,
        startTime: Date.now(),
        playerY: -0.6, playerVelocityY: 0, jumpCount: 0,
        lane: 1, lives: 3, maxLives: 5,
        invincibilityTimer: 0, hasShield: false,
        // Combo systém
        combo: 1, maxCombo: 1, comboTimer: 0,
        obstaclesSinceLastHit: 0,
        runStats: { jumps: 0, dashes: 0, powerups: 0, nearMisses: 0, maxCombo: 1 }
    };
}

resetSkills() {
    Object.values(this.skills).forEach(s => s.cooldown = 0);
    this.speedTimeouts.forEach(id => clearTimeout(id));
    this.speedTimeouts.clear();
}

updateSkills(gameState, delta) {
    if (typeof gameState === 'number') { delta = gameState; gameState = this.currentGameState; }
    if (!Number.isFinite(delta) || delta <= 0) return;

    if (gameState?.invincibilityTimer > 0)
        gameState.invincibilityTimer = Math.max(0, gameState.invincibilityTimer - delta * 1000);

    for (const skill of Object.values(this.skills))
        if (skill.cooldown > 0) skill.cooldown = Math.max(0, skill.cooldown - delta * 1000);

    // Combo timer – combo vyprší za 4s bez akce
    if (gameState?.combo > 1) {
        gameState.comboTimer = Math.max(0, (gameState.comboTimer || 0) - delta * 1000);
        if (gameState.comboTimer <= 0) {
            gameState.combo = 1;
        }
    }
}

activateSkill(skillName) {
    if (this.skills[skillName])
        this.skills[skillName].cooldown = this.skills[skillName].duration;
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

getDashCooldownPercent() {
    const skill = this.skills.dash;
    if (skill.cooldown <= 0) return 1;
    return 1 - skill.cooldown / skill.duration;
}

updateScore(gameState, delta) {
    this.currentGameState = gameState;
    if (!Number.isFinite(delta) || delta <= 0) return;

    // Nelineární speed curve – každých 30s přidá více
    const elapsed = (Date.now() - gameState.startTime) / 1000;
    const ramp = Math.pow(elapsed / 25, 1.15); // mírně exponenciální
    gameState.speed = Math.min(gameState.maxSpeed, gameState.baseSpeed + ramp);

    // Skóre se násobí combo multiplikátorem
    gameState.score += Math.floor(gameState.speed * delta * 10 * gameState.combo);
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

// Hráč minul překážku – zvýší combo
dodgedObstacle(gameState) {
    gameState.obstaclesSinceLastHit++;
    gameState.runStats.obstaclesDodged = (gameState.runStats.obstaclesDodged || 0) + 1;
    // Combo roste každých 5 úspěšně přejitých překážek
    const newCombo = Math.min(8, 1 + Math.floor(gameState.obstaclesSinceLastHit / 5));
    if (newCombo > gameState.combo) {
        gameState.combo = newCombo;
        gameState.comboTimer = 4000; // reset timer
    }
    if (gameState.combo > gameState.maxCombo) {
        gameState.maxCombo = gameState.combo;
        gameState.runStats.maxCombo = gameState.combo;
    }
    return gameState.combo;
}

// Near-miss bonus
nearMissBonus(gameState) {
    gameState.runStats.nearMisses++;
    const bonus = Math.floor(50 * gameState.combo);
    gameState.score += bonus;
    return bonus;
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
        gameState.score += 500 * gameState.combo;
        gameState.baseSpeed = Math.min(gameState.baseSpeed + 1.5, 20);
        const timeoutId = setTimeout(() => {
            gameState.baseSpeed = Math.max(7, gameState.baseSpeed - 1.5);
            this.speedTimeouts.delete(timeoutId);
        }, 6000);
        this.speedTimeouts.add(timeoutId);
    }
    return powerupType;
}

consumeShield(gameState) {
    if (gameState.hasShield) { gameState.hasShield = false; return true; }
    return false;
}

handlePlayerHit(gameState) {
    gameState.lives--;
    gameState.invincibilityTimer = 2000;
    // Reset combo při zásahu
    gameState.combo = 1;
    gameState.comboTimer = 0;
    gameState.obstaclesSinceLastHit = 0;
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
    if (elements?.['best-score'])
        elements['best-score'].textContent = localStorage.getItem('fp3d_bestScore') || 0;
}
```

}