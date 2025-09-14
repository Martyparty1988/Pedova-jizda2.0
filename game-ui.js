import { ANALYSIS_QUOTES, HLASKY_JSON } from './game-assets.js';

class GameUI {
    constructor() {
        this.elements = {};
        this.getDOMElements();
        this.quoteTimeout = null;
        this.scoreAnimationInterval = null;
    }

    getDOMElements() {
        const ids = [
            'loading-screen', 'main-menu', 'game-screen', 'game-over', 'play-btn', 
            'restart-btn', 'menu-btn', 'current-score', 'final-score', 'best-score', 
            'game-time', 'pause-btn', 'skill-dash', 'loading-text', 
            'ai-summary-container', 'ai-summary-spinner', 'ai-summary-text', 
            'analyze-run-btn', 'quote-display', 'quote-text', 'game-over-quote', 
            'webgl-fallback', 'game-canvas', 'lives-container',
            'menu-loading-container', 'menu-loading-spinner', 'menu-loading-text',
            // Přidáno pro počítadlo předmětů
            'collectible-count'
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
    
    // Nová funkce pro aktualizaci počítadla předmětů
    updateCollectibleCount(count) {
        if (this.elements['collectible-count']) {
            this.elements['collectible-count'].textContent = count;
        }
    }

    triggerScoreGlow() {
        const scoreEl = this.elements['current-score'];
        if (scoreEl) {
            scoreEl.classList.add('glowing');
            setTimeout(() => scoreEl.classList.remove('glowing'), 400);
        }
    }
    
    showGameOver(stats) {
        const finalScoreEl = this.elements['final-score'];
        const bestScoreEl = this.elements['best-score'];
        const gameTimeEl = this.elements['game-time'];
        const quoteEl = this.elements['game-over-quote'];
        const aiContainer = this.elements['ai-summary-container'];
        const analyzeBtn = this.elements['analyze-run-btn'];

        if (!finalScoreEl || !bestScoreEl || !gameTimeEl || !quoteEl) return;

        bestScoreEl.textContent = stats.bestScore;
        gameTimeEl.textContent = stats.time + 's';
        quoteEl.textContent = this.getRandomQuote('gameover');
        
        aiContainer.style.display = 'none';
        aiContainer.classList.remove('active');
        analyzeBtn.style.display = 'block';
        analyzeBtn.disabled = false;

        this.showScreen('game-over');

        let currentScore = 0;
        const targetScore = stats.score;
        const duration = 1000;
        const increment = targetScore / (duration / 16);

        if (this.scoreAnimationInterval) clearInterval(this.scoreAnimationInterval);

        this.scoreAnimationInterval = setInterval(() => {
            currentScore += increment;
            if (currentScore >= targetScore) {
                currentScore = targetScore;
                clearInterval(this.scoreAnimationInterval);
            }
            finalScoreEl.textContent = Math.floor(currentScore);
        }, 16);
    }
    
    updateSkillUI(skills) {
        for (const [skillName, skillData] of Object.entries(skills)) {
            const el = document.getElementById(`skill-${skillName}`);
            if (!el) continue;
            el.classList.toggle('unlocked', skillData.unlocked);
            el.classList.toggle('cooldown', skillData.cooldown > 0);
        }
    }

    updateLives(livesCount) {
        const container = this.elements['lives-container'];
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < livesCount; i++) {
            const lifeIcon = document.createElement('div');
            lifeIcon.classList.add('life-icon');
            lifeIcon.textContent = '♥'; 
            container.appendChild(lifeIcon);
        }
    }

    togglePause(isPaused) {
        if (this.elements['pause-btn']) {
            this.elements['pause-btn'].innerHTML = isPaused ? '▶' : '||';
        }
    }

    showQuote(category) { 
        const text = this.getRandomQuote(category);
        if (!text) return;
        const quoteDisplay = this.elements['quote-display'];
        const quoteText = this.elements['quote-text'];
        if (quoteDisplay && quoteText) {
            quoteText.textContent = text; 
            quoteDisplay.classList.add('active'); 
            if (this.quoteTimeout) clearTimeout(this.quoteTimeout); 
            this.quoteTimeout = setTimeout(() => { quoteDisplay.classList.remove('active'); }, 3500); 
        }
    }

    getRandomQuote(category) {
        const quotes = HLASKY_JSON[category];
        return quotes ? quotes[Math.floor(Math.random() * quotes.length)] : '';
    }

    analyzeRun() {
        const btn = this.elements['analyze-run-btn'];
        const container = this.elements['ai-summary-container'];
        const spinner = this.elements['ai-summary-spinner'];
        const textEl = this.elements['ai-summary-text'];
        
        btn.disabled = true;
        btn.style.display = 'none';
        container.style.display = 'block';
        container.classList.add('active');
        spinner.style.display = 'block';
        textEl.textContent = '';
        
        setTimeout(() => {
            const quote = ANALYSIS_QUOTES[Math.floor(Math.random() * ANALYSIS_QUOTES.length)];
            textEl.textContent = quote;
            spinner.style.display = 'none';
        }, 1000);
    }
}

export { GameUI };
