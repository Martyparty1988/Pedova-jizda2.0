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
            'menu-loading-container', 'menu-loading-spinner', 'menu-loading-text', 'game-over-quote'
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
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        if (this.elements[id]) {
            this.elements[id].classList.add('active');
        }
    }

    updateScore(score) {
        if (this.elements['current-score']) {
            this.elements['current-score'].textContent = score;
        }
    }
    
    showGameOver(stats) {
        const { 'final-score': finalScoreEl, 'best-score': bestScoreEl, 'game-time': gameTimeEl, 'game-over-quote': quoteEl } = this.elements;

        bestScoreEl.textContent = stats.bestScore;
        gameTimeEl.textContent = stats.time + 's';
        quoteEl.textContent = this.getRandomQuote('gameover');

        this.showScreen('game-over');

        let currentScore = 0;
        const targetScore = stats.score;
        const duration = 1000;
        const increment = targetScore > 0 ? targetScore / (duration / 16) : 0;

        if (this.scoreAnimationInterval) clearInterval(this.scoreAnimationInterval);

        const updateFn = () => {
            currentScore += increment;
            if (currentScore >= targetScore) {
                currentScore = targetScore;
                clearInterval(this.scoreAnimationInterval);
                this.scoreAnimationInterval = null;
            }
            finalScoreEl.textContent = Math.floor(currentScore);
        };

        if (targetScore > 0) {
            this.scoreAnimationInterval = setInterval(updateFn, 16);
        } else {
            finalScoreEl.textContent = 0;
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
        if (this.elements['pause-btn']) {
            this.elements['pause-btn'].innerHTML = isPaused ? '▶' : '||';
        }
    }

    getRandomQuote(category) {
        const quotes = HLASKY_JSON[category];
        return quotes ? quotes[Math.floor(Math.random() * quotes.length)] : '';
    }
}
