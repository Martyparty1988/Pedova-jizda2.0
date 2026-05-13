export class GameAudio {
    constructor() {
        this.context = null;
    }

    init() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.context = AudioCtx ? new AudioCtx() : null;
        } catch (e) {
            console.warn('Web Audio API is not supported.', e);
            this.context = null;
        }
    }
    
    resumeContext() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume().catch(() => {});
        }
    }

    playSound(type) {
        if (!this.context) return;

        const t = this.context.currentTime;
        const output = this.context.destination;
        const g = this.context.createGain();
        g.connect(output);

        let stopDelay = 0.35;
        g.gain.setValueAtTime(0.001, t);
        g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);

        if (type === 'shield_break') {
            this.playNoise(g, t);
            return;
        }

        const o = this.context.createOscillator();
        o.connect(g);

        switch (type) {
            case 'jump': 
                o.type = 'sine';
                o.frequency.setValueAtTime(300, t); 
                o.frequency.exponentialRampToValueAtTime(600, t + 0.1); 
                stopDelay = 0.22;
                break;
            case 'super_jump': 
                o.type = 'sine'; 
                o.frequency.setValueAtTime(200, t); 
                o.frequency.exponentialRampToValueAtTime(1000, t + 0.2); 
                g.gain.exponentialRampToValueAtTime(0.28, t + 0.01);
                stopDelay = 0.38;
                break;
            case 'dash': 
                o.type = 'sawtooth'; 
                o.frequency.setValueAtTime(600, t); 
                o.frequency.exponentialRampToValueAtTime(100, t + 0.2); 
                stopDelay = 0.28;
                break;
            case 'collision': 
                o.type = 'square'; 
                o.frequency.setValueAtTime(150, t); 
                o.frequency.exponentialRampToValueAtTime(45, t + 0.28); 
                stopDelay = 0.42;
                break;
            case 'powerup': 
                o.type = 'triangle';
                o.frequency.setValueAtTime(600, t); 
                o.frequency.exponentialRampToValueAtTime(1200, t + 0.05); 
                o.frequency.exponentialRampToValueAtTime(800, t + 0.2); 
                stopDelay = 0.3;
                break;
            case 'powerup_shield': 
                o.type = 'sine'; 
                o.frequency.setValueAtTime(800, t); 
                o.frequency.exponentialRampToValueAtTime(1600, t + 0.2); 
                stopDelay = 0.35;
                break;
            default:
                o.type = 'sine';
                o.frequency.setValueAtTime(440, t);
        }
        
        g.gain.exponentialRampToValueAtTime(0.001, t + stopDelay);
        o.start(t);
        o.stop(t + stopDelay + 0.05);
    }

    playNoise(gainNode, startTime) {
        const bufferSize = Math.floor(this.context.sampleRate * 0.22);
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.context.createBufferSource();
        const filter = this.context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(900, startTime);
        filter.frequency.exponentialRampToValueAtTime(160, startTime + 0.22);

        noise.buffer = buffer;
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.gain.setValueAtTime(0.26, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.24);
        noise.start(startTime);
        noise.stop(startTime + 0.25);
    }

    vibrate(pattern) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }
}
