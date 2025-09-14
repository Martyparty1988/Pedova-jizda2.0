import { ANALYSIS_QUOTES, HLASKY_JSON } from './game-assets.js';

class GameUI {
    constructor() {
        this.elements = {};
        this.getDOMElements();
        this.quoteTimeout = null;
    }

    getDOMElements() {
        const ids = [
            'loading-screen', 'main-menu', 'game-screen', 'game-over', 'play-btn', 
            'restart-btn', 'menu-btn', 'current-score', 'final-score', 'best-score', 
            'game-time', 'pause-btn', 'skill-doubleJump', 'skill-dash', 'loading-text', 
            'ai-summary-container', 'ai-summary-spinner', 'ai-summary-text', 
            'analyze-run-btn', 'quote-display', 'quote-text', 'game-over-quote', 
            'webgl-fallback', 'game-canvas',
            // ZMĚNA: Přidáno ID pro kontejner životů
            'lives-container'
        ];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                this.elements[id] = el;
            } else {
                console.warn(`UI prvek s ID '${id}' nebyl v HTML nalezen.`);
            }
        });
    }
    
    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        if (this.elements[id]) {
            this.elements[id].classList.add('active');
        }
    }
    
    showLoading(message) {
        this.elements['loading-text'].textContent = message;
        this.showScreen('loading-screen');
    }

    updateScore(score) {
        if (this.elements['current-score']) {
            this.elements['current-score'].textContent = score;
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
        this.elements['final-score'].textContent = stats.score;
        this.elements['best-score'].textContent = stats.bestScore;
        this.elements['game-time'].textContent = stats.time + 's';
        this.elements['game-over-quote'].textContent = this.getRandomQuote('gameover');
        this.elements['ai-summary-container'].style.display = 'none';
        this.elements['analyze-run-btn'].style.display = 'block';
        this.elements['analyze-run-btn'].disabled = false;
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

    // ZMĚNA: Nová funkce pro aktualizaci zobrazení životů
    updateLives(livesCount) {
        const container = this.elements['lives-container'];
        if (!container) return;
        
        container.innerHTML = ''; // Vyčistit předchozí stav
        for (let i = 0; i < livesCount; i++) {
            const lifeIcon = document.createElement('div');
            lifeIcon.classList.add('life-icon');
            // Můžete použít SVG nebo textový symbol, např. '♥' nebo '💀'
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
