import { ANALYSIS_QUOTES, HLASKY_JSON } from './game-assets.js';

class GameUI {
    constructor() {
        this.elements = {};
        this.quoteTimeout = null;
        this.getDOMElements();
    }

    getDOMElements() {
        const ids = ['loading-screen', 'main-menu', 'game-screen', 'game-over', 'play-btn', 'restart-btn', 'menu-btn', 'game-canvas', 'current-score', 'final-score', 'best-score', 'game-time', 'pause-btn', 'skill-doubleJump', 'skill-dash', 'loading-text', 'ai-summary-container', 'ai-summary-spinner', 'ai-summary-text', 'analyze-run-btn', 'quote-display', 'quote-text', 'game-over-quote', 'webgl-fallback'];
        ids.forEach(id => this.elements[id] = document.getElementById(id));
    }

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        this.elements[id].classList.add('active');
    }
    
    showWebGLFallback() {
        this.showScreen('webgl-fallback');
    }

    prepareForGame(skills) {
        this.updateSkillUI(skills);
        this.elements['ai-summary-container'].style.display = 'none';
        this.elements['analyze-run-btn'].style.display = 'block';
        this.elements['analyze-run-btn'].disabled = false;
        this.showScreen('game-screen');
        this.showQuote('start');
    }
    
    updateScore(score) {
        this.elements['current-score'].textContent = score;
    }

    glowScore() {
        const scoreEl = this.elements['current-score'];
        scoreEl.classList.add('glowing');
        setTimeout(() => scoreEl.classList.remove('glowing'), 500);
    }
    
    showGameOverScreen(finalStats) {
        this.elements['final-score'].textContent = finalStats.score;
        this.elements['game-time'].textContent = finalStats.time + 's';
        this.elements['best-score'].textContent = finalStats.bestScore;
        this.elements['game-over-quote'].textContent = this.getRandomQuote('gameover');
        this.showScreen('game-over');
    }

    updateSkillUI(skills) {
        for (const [skillName, skillData] of Object.entries(skills)) {
            const el = this.elements[`skill-${skillName}`];
            if (!el) continue;
            el.classList.toggle('unlocked', skillData.unlocked);
            el.classList.toggle('cooldown', skillData.cooldown > 0);
        }
    }

    togglePauseButton(isPaused) {
        this.elements['pause-btn'].innerHTML = isPaused ? '▶' : '||';
    }
    
    getRandomQuote(category) {
        const quotes = HLASKY_JSON[category];
        return quotes ? quotes[Math.floor(Math.random() * quotes.length)] : '';
    }

    showQuote(category) {
        const text = this.getRandomQuote(category);
        if (!text) return;
        const qd = this.elements['quote-display'];
        const qt = this.elements['quote-text'];
        qt.textContent = text;
        qd.classList.add('active');
        if (this.quoteTimeout) clearTimeout(this.quoteTimeout);
        this.quoteTimeout = setTimeout(() => {
            qd.classList.remove('active');
        }, 3500);
    }

    analyzeRun() {
        const btn = this.elements['analyze-run-btn'];
        btn.disabled = true;
        btn.style.display = 'none';
        this.elements['ai-summary-container'].style.display = 'block';
        this.elements['ai-summary-spinner'].style.display = 'block';
        this.elements['ai-summary-text'].textContent = '';

        setTimeout(() => {
            const quote = ANALYSIS_QUOTES[Math.floor(Math.random() * ANALYSIS_QUOTES.length)];
            this.elements['ai-summary-text'].textContent = quote;
            this.elements['ai-summary-spinner'].style.display = 'none';
        }, 1000);
    }
}

export { GameUI };

    getRandomQuote(category) {
        const quotes = HLASKY_JSON[category];
        return quotes ? quotes[Math.floor(Math.random() * quotes.length)] : '';
    }

    showQuote(category) {
        const text = this.getRandomQuote(category);
        if (!text) return;
        const qd = this.elements['quote-display'];
        const qt = this.elements['quote-text'];
        qt.textContent = text;
        qd.classList.add('active');
        if (this.quoteTimeout) clearTimeout(this.quoteTimeout);
        this.quoteTimeout = setTimeout(() => {
            qd.classList.remove('active');
        }, 3500);
    }

    analyzeRun() {
        const btn = this.elements['analyze-run-btn'];
        btn.disabled = true;
        btn.style.display = 'none';
        this.elements['ai-summary-container'].style.display = 'block';
        this.elements['ai-summary-spinner'].style.display = 'block';
        this.elements['ai-summary-text'].textContent = '';

        setTimeout(() => {
            const quote = ANALYSIS_QUOTES[Math.floor(Math.random() * ANALYSIS_QUOTES.length)];
            this.elements['ai-summary-text'].textContent = quote;
            this.elements['ai-summary-spinner'].style.display = 'none';
        }, 1000);
    }
}

export { GameUI };

