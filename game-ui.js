import { HLASKY_JSON } from ‘./game-assets.js’;

export class GameUI {
constructor() {
this.elements = {};
this.getDOMElements();
this.scoreAnimationInterval = null;
this._comboTimeout = null;
}

```
getDOMElements() {
    const ids = [
        'main-menu', 'game-screen', 'game-over', 'play-btn',
        'restart-btn', 'menu-btn', 'current-score', 'final-score', 'best-score',
        'game-time', 'pause-btn', 'webgl-fallback', 'game-canvas', 'lives-container',
        'menu-loading-container', 'menu-loading-spinner', 'menu-loading-text', 'game-over-quote',
        // Nové elementy
        'combo-display', 'dash-cooldown-bar', 'near-miss-popup',
        'stat-jumps', 'stat-dashes', 'stat-nearMisses', 'stat-maxCombo'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) this.elements[id] = el;
    });
}

showScreen(id) {
    if (this.scoreAnimationInterval) { clearInterval(this.scoreAnimationInterval); this.scoreAnimationInterval = null; }
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    if (this.elements[id]) this.elements[id].classList.add('active');
}

updateScore(score) {
    if (this.elements['current-score']) this.elements['current-score'].textContent = score;
}

// Zobrazí combo multiplikátor
updateCombo(combo) {
    const el = this.elements['combo-display'];
    if (!el) return;
    if (combo > 1) {
        el.textContent = `x${combo}`;
        el.classList.add('active');
        el.style.setProperty('--combo-color', combo >= 6 ? '#ff4444' : combo >= 4 ? '#ffaa00' : combo >= 2 ? '#00ffaa' : '#ffffff');
    } else {
        el.classList.remove('active');
    }
}

// Cooldown bar pro dash (0–1)
updateDashCooldown(percent) {
    const bar = this.elements['dash-cooldown-bar'];
    if (!bar) return;
    bar.style.width = `${Math.round(percent * 100)}%`;
    bar.classList.toggle('ready', percent >= 1);
}

// Near-miss popup
showNearMiss(bonus) {
    const el = this.elements['near-miss-popup'];
    if (!el) return;
    el.textContent = `NEAR MISS! +${bonus}`;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 900);
}

showGameOver(stats) {
    const { 'final-score': fs, 'best-score': bs, 'game-time': gt, 'game-over-quote': q } = this.elements;

    if (bs) bs.textContent = stats.bestScore;
    if (gt) gt.textContent = stats.time + 's';
    if (q)  q.textContent = this.getRandomQuote('gameover');

    // Detailní statistiky
    if (this.elements['stat-jumps'])     this.elements['stat-jumps'].textContent     = stats.jumps || 0;
    if (this.elements['stat-dashes'])    this.elements['stat-dashes'].textContent    = stats.dashes || 0;
    if (this.elements['stat-nearMisses'])this.elements['stat-nearMisses'].textContent= stats.nearMisses || 0;
    if (this.elements['stat-maxCombo'])  this.elements['stat-maxCombo'].textContent  = `x${stats.maxCombo || 1}`;

    this.showScreen('game-over');

    let cur = 0;
    const target = stats.score;
    const inc = target > 0 ? target / (1000 / 16) : 0;
    if (this.scoreAnimationInterval) clearInterval(this.scoreAnimationInterval);
    if (target > 0) {
        this.scoreAnimationInterval = setInterval(() => {
            cur = Math.min(cur + inc, target);
            if (fs) fs.textContent = Math.floor(cur);
            if (cur >= target) { clearInterval(this.scoreAnimationInterval); this.scoreAnimationInterval = null; }
        }, 16);
    } else {
        if (fs) fs.textContent = 0;
    }
}

updateLives(livesCount) {
    const container = this.elements['lives-container'];
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < livesCount; i++) {
        const d = document.createElement('div');
        d.classList.add('life-icon');
        d.textContent = '●';
        container.appendChild(d);
    }
}

togglePause(isPaused) {
    if (this.elements['pause-btn']) this.elements['pause-btn'].innerHTML = isPaused ? '▶' : '||';
}

getRandomQuote(category) {
    const quotes = HLASKY_JSON[category];
    return quotes ? quotes[Math.floor(Math.random() * quotes.length)] : '';
}
```

}