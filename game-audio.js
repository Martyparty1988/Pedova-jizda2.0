class GameAudio {
    constructor() {
        this.context = null;
        this.sfxEnabled = true;
    }

    init() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.sfxEnabled = false;
            console.warn("Web Audio API is not supported.");
        }
    }
    
    resumeContext() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    playSound(type) {
        if (!this.sfxEnabled || !this.context) return;
        const t = this.context.currentTime;
        const o = this.context.createOscillator();
        const g = this.context.createGain();
        o.connect(g);
g.connect(this.context.destination);
        g.gain.setValueAtTime(0.2, t);
        switch (type) {
            case 'jump': o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(600, t + 0.1); break;
            // ZMĚNA: Nový zvuk pro super skok
            case 'super_jump': o.type = 'sine'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(1000, t + 0.2); g.gain.setValueAtTime(0.3, t); break;
            case 'dash': o.type = 'sawtooth'; o.frequency.setValueAtTime(600, t); o.frequency.exponentialRampToValueAtTime(100, t + 0.2); break;
            case 'collision': o.type = 'square'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.4); break;
            case 'powerup': o.frequency.setValueAtTime(600, t); o.frequency.exponentialRampToValueAtTime(1200, t + 0.05); o.frequency.exponentialRampToValueAtTime(800, t + 0.2); break;
            case 'powerup_shield': o.type = 'sine'; o.frequency.setValueAtTime(800, t); o.frequency.exponentialRampToValueAtTime(1600, t + 0.2); break;
            case 'shield_break': o.type = 'noise'; g.gain.setValueAtTime(0.3, t); o.frequency.setValueAtTime(1000, t); break;
        }
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.start(t);
        o.stop(t + 0.4);
    }

    vibrate(pattern) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }
}

export { GameAudio };
