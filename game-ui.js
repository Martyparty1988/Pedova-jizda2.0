import { HLASKY_JSON } from './game-assets.js';

export class GameUI {
    constructor() {
        this.elements = {};
        this.getDOMElements();
        this.scoreAnimationInterval = null;
    }

    getDOMElements() {
        const ids = [
            'main-menu', 'game-screen', 'game-over', 'play-btn',
            'restart-btn', 'menu-btn', 'current-score', 'final-score', 'best-score',
            'game-time', 'pause-btn', 'webgl-fallback', 'game-canvas', 'lives-container',
            'menu-loading-container', 'menu-loading-spinner', 'menu-loading-text', 'game-over-quote',
            'combo-display', 'dash-cooldown-bar', 'near-miss-popup',
            'stat-jumps', 'stat-dashes', 'stat-nearMisses', 'stat-maxCombo'
        ];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) this.elements[id] = el;
        });
    }

    showScreen(id) {
        if (this.scoreAnimationInterval) {
            clearInterval(this.scoreAnimationInterval);
            this.scoreAnimationInterval = null;
        }
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        if (this.elements[id]) this.elements[id].classList.add('active');
    }

    updateScore(score) {
        if (this.elements['current-score']) this.elements['current-score'].textContent = String(score);
    }

    updateCombo(combo) {
        const el = this.elements['combo-display'];
        if (!el) return;
        if (combo > 1) {
            el.textContent = 'x' + combo;
            el.classList.add('active');
        } else {
            el.textContent = '';
            el.classList.remove('active');
        }
    }

    updateDashCooldown(percent) {
        const bar = this.elements['dash-cooldown-bar'];
        if (!bar) return;
        const safePercent = Math.max(0, Math.min(1, Number(percent) || 0));
        bar.style.width = Math.round(safePercent * 100) + '%';
        bar.classList.toggle('ready', safePercent >= 1);
    }

    showNearMiss(bonus) {
        const el = this.elements['near-miss-popup'];
        if (!el) return;
        el.textContent = '+' + bonus;
        el.classList.remove('show');
        void el.offsetWidth;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 900);
    }

    showGameOver(stats) {
        const finalScoreEl = this.elements['final-score'];
        const bestScoreEl = this.elements['best-score'];
        const gameTimeEl = this.elements['game-time'];
        const quoteEl = this.elements['game-over-quote'];

        if (bestScoreEl) bestScoreEl.textContent = String(stats.bestScore || 0);
        if (gameTimeEl) gameTimeEl.textContent = String(stats.time || 0) + 's';
        if (quoteEl) quoteEl.textContent = this.getRandomQuote('gameover');
        if (this.elements['stat-jumps']) this.elements['stat-jumps'].textContent = String(stats.jumps || 0);
        if (this.elements['stat-dashes']) this.elements['stat-dashes'].textContent = String(stats.dashes || 0);
        if (this.elements['stat-nearMisses']) this.elements['stat-nearMisses'].textContent = String(stats.nearMisses || 0);
        if (this.elements['stat-maxCombo']) this.elements['stat-maxCombo'].textContent = 'x' + (stats.maxCombo || 1);

        this.showScreen('game-over');

        let currentScore = 0;
        const targetScore = Number(stats.score || 0);
        const increment = targetScore > 0 ? targetScore / (1000 / 16) : 0;
        if (this.scoreAnimationInterval) clearInterval(this.scoreAnimationInterval);

        if (targetScore > 0) {
            this.scoreAnimationInterval = setInterval(() => {
                currentScore += increment;
                if (currentScore >= targetScore) {
                    currentScore = targetScore;
                    clearInterval(this.scoreAnimationInterval);
                    this.scoreAnimationInterval = null;
                }
                if (finalScoreEl) finalScoreEl.textContent = String(Math.floor(currentScore));
            }, 16);
        } else if (finalScoreEl) {
            finalScoreEl.textContent = '0';
        }
    }

    updateLives(livesCount) {
        const container = this.elements['lives-container'];
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < livesCount; i++) {
            const lifeIcon = document.createElement('div');
            lifeIcon.classList.add('life-icon');
            lifeIcon.textContent = '●';
            container.appendChild(lifeIcon);
        }
    }

    togglePause(isPaused) {
        if (this.elements['pause-btn']) this.elements['pause-btn'].textContent = isPaused ? '▶' : '||';
    }

    getRandomQuote(category) {
        const quotes = HLASKY_JSON[category];
        return quotes ? quotes[Math.floor(Math.random() * quotes.length)] : '';
    }
}
