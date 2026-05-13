(() => {
    'use strict';

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const lerp = (a, b, t) => a + (b - a) * t;
    const rand = (min, max) => min + Math.random() * (max - min);

    class PedroGame {
        constructor() {
            this.canvas = document.getElementById('game-canvas');
            this.ctx = this.canvas.getContext('2d', { alpha: false });
            this.dpr = 1;
            this.w = 0;
            this.h = 0;
            this.lastTime = performance.now();
            this.running = false;
            this.paused = false;
            this.state = 'menu';
            this.touchStart = null;
            this.keys = new Set();
            this.bestScore = Number(localStorage.getItem('pedro_best_score') || 0);

            this.ui = {
                mainMenu: document.getElementById('main-menu'),
                gameScreen: document.getElementById('game-screen'),
                gameOver: document.getElementById('game-over'),
                playBtn: document.getElementById('play-btn'),
                restartBtn: document.getElementById('restart-btn'),
                menuBtn: document.getElementById('menu-btn'),
                pauseBtn: document.getElementById('pause-btn'),
                score: document.getElementById('current-score'),
                finalScore: document.getElementById('final-score'),
                bestScore: document.getElementById('best-score'),
                gameTime: document.getElementById('game-time'),
                lives: document.getElementById('lives-container'),
                combo: document.getElementById('combo-display'),
                nearMiss: document.getElementById('near-miss-popup'),
                dashBar: document.getElementById('dash-cooldown-bar'),
                jumps: document.getElementById('stat-jumps'),
                dashes: document.getElementById('stat-dashes'),
                nearMisses: document.getElementById('stat-nearMisses'),
                maxCombo: document.getElementById('stat-maxCombo'),
                flash: document.getElementById('flash')
            };

            this.resize();
            this.bindEvents();
            this.resetWorld();
            this.showScreen('main-menu');
            this.loop(performance.now());
        }

        bindEvents() {
            window.addEventListener('resize', () => this.resize(), { passive: true });
            window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200), { passive: true });
            window.addEventListener('keydown', event => this.handleKey(event));
            window.addEventListener('blur', () => {
                if (this.state === 'playing') this.togglePause(true);
            });

            this.ui.playBtn.addEventListener('click', () => this.startGame());
            this.ui.restartBtn.addEventListener('click', () => this.startGame());
            this.ui.menuBtn.addEventListener('click', () => this.toMenu());
            this.ui.pauseBtn.addEventListener('click', () => this.togglePause());

            this.canvas.addEventListener('touchstart', event => this.onTouchStart(event), { passive: false });
            this.canvas.addEventListener('touchend', event => this.onTouchEnd(event), { passive: false });
            this.canvas.addEventListener('pointerdown', event => this.onPointerTap(event));

            this.bindButton('ctrl-left', () => this.moveLane(-1));
            this.bindButton('ctrl-right', () => this.moveLane(1));
            this.bindButton('ctrl-jump', () => this.jump());
            this.bindButton('ctrl-dash', () => this.dash());
        }

        bindButton(id, action) {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.addEventListener('touchstart', event => {
                event.preventDefault();
                action();
            }, { passive: false });
            btn.addEventListener('click', action);
        }

        resize() {
            const viewport = window.visualViewport;
            this.w = Math.max(1, Math.round(viewport ? viewport.width : window.innerWidth));
            this.h = Math.max(1, Math.round(viewport ? viewport.height : window.innerHeight));
            this.dpr = clamp(window.devicePixelRatio || 1, 1, 2.2);
            this.canvas.width = Math.round(this.w * this.dpr);
            this.canvas.height = Math.round(this.h * this.dpr);
            this.canvas.style.width = this.w + 'px';
            this.canvas.style.height = this.h + 'px';
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        }

        resetWorld() {
            this.player = {
                lane: 1,
                x: 0,
                y: 0,
                vy: 0,
                air: 0,
                invincible: 0,
                shield: false,
                dash: 0,
                dashCooldown: 0
            };
            this.objects = [];
            this.particles = [];
            this.rings = [];
            this.score = 0;
            this.lives = 3;
            this.combo = 1;
            this.comboTimer = 0;
            this.maxCombo = 1;
            this.speed = 0.42;
            this.spawnTimer = 0;
            this.distance = 0;
            this.startTime = performance.now();
            this.stats = { jumps: 0, dashes: 0, nearMisses: 0 };

            for (let i = 0; i < 60; i++) {
                this.particles.push({ x: rand(0, this.w), y: rand(0, this.h), z: rand(0.2, 1), s: rand(0.4, 1.4) });
            }
            for (let i = 0; i < 22; i++) {
                this.rings.push({ z: i / 22, twist: rand(-1, 1) });
            }
            this.updateHud();
        }

        startGame() {
            this.resetWorld();
            this.running = true;
            this.paused = false;
            this.state = 'playing';
            this.showScreen('game-screen');
            this.ui.pauseBtn.textContent = 'Ⅱ';
            this.lastTime = performance.now();
        }

        toMenu() {
            this.state = 'menu';
            this.running = false;
            this.paused = false;
            this.showScreen('main-menu');
        }

        togglePause(forcePause = null) {
            if (this.state !== 'playing') return;
            this.paused = forcePause === null ? !this.paused : forcePause;
            this.ui.pauseBtn.textContent = this.paused ? '▶' : 'Ⅱ';
            this.lastTime = performance.now();
        }

        showScreen(id) {
            [this.ui.mainMenu, this.ui.gameScreen, this.ui.gameOver].forEach(el => el.classList.remove('active'));
            document.getElementById(id).classList.add('active');
        }

        loop(now) {
            const dt = clamp((now - this.lastTime) / 1000, 0, 0.033);
            this.lastTime = now;
            if (this.state === 'playing' && !this.paused) this.update(dt);
            this.render(now / 1000);
            requestAnimationFrame(time => this.loop(time));
        }

        update(dt) {
            this.distance += dt * this.speed;
            this.speed = clamp(this.speed + dt * 0.006, 0.42, 0.95);
            this.score += dt * 110 * this.combo * (this.player.dash > 0 ? 1.6 : 1);
            this.spawnTimer -= dt;

            if (this.spawnTimer <= 0) {
                this.spawnObject();
                this.spawnTimer = clamp(1.18 - this.speed * 0.62, 0.48, 0.95);
            }

            this.player.x = lerp(this.player.x, this.laneX(this.player.lane, 1), 0.18);
            this.player.vy -= 2.35 * dt;
            this.player.air += this.player.vy * dt;
            if (this.player.air <= 0) {
                this.player.air = 0;
                this.player.vy = 0;
            }
            this.player.invincible = Math.max(0, this.player.invincible - dt);
            this.player.dash = Math.max(0, this.player.dash - dt);
            this.player.dashCooldown = Math.max(0, this.player.dashCooldown - dt);
            this.comboTimer = Math.max(0, this.comboTimer - dt);
            if (this.comboTimer === 0) this.combo = 1;

            const travel = dt * this.speed * (this.player.dash > 0 ? 2.2 : 1);
            for (const obj of this.objects) obj.z -= travel;
            for (const ring of this.rings) {
                ring.z -= travel * 0.45;
                if (ring.z < 0) ring.z += 1;
            }
            for (const p of this.particles) {
                p.y += travel * 180 * p.z;
                if (p.y > this.h + 20) {
                    p.y = -20;
                    p.x = rand(0, this.w);
                    p.z = rand(0.2, 1);
                }
            }

            this.checkObjects();
            this.updateHud();
        }

        spawnObject() {
            const lane = Math.floor(rand(0, 3));
            const roll = Math.random();
            let type = 'barrier';
            if (roll > 0.82) type = 'orb';
            else if (roll > 0.66) type = 'gate';
            this.objects.push({ lane, z: 1.05, type, hit: false, passed: false, phase: rand(0, 10) });
        }

        checkObjects() {
            for (const obj of this.objects) {
                if (obj.z < 0.14 && !obj.hit) {
                    const sameLane = obj.lane === this.player.lane;
                    const safeJump = this.player.air > 0.42;
                    const safeDash = this.player.dash > 0;
                    if (sameLane && obj.type === 'orb') {
                        obj.hit = true;
                        this.collectOrb();
                    } else if (sameLane && !safeJump && !safeDash) {
                        obj.hit = true;
                        this.hitPlayer();
                    }
                }
                if (obj.z < 0.02 && !obj.passed && obj.type !== 'orb') {
                    obj.passed = true;
                    const close = Math.abs(obj.lane - this.player.lane) <= 1;
                    this.addCombo(close && obj.lane !== this.player.lane);
                }
            }
            this.objects = this.objects.filter(obj => obj.z > -0.12 && !obj.hit);
        }

        collectOrb() {
            this.score += 420 * this.combo;
            if (Math.random() > 0.55) this.player.shield = true;
            else this.player.dashCooldown = 0;
            this.addCombo(false);
            this.pulseNearMiss('Bonus +420');
            this.vibrate(30);
        }

        addCombo(nearMiss) {
            this.combo = clamp(this.combo + 1, 1, 8);
            this.comboTimer = 3.2;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            if (nearMiss) {
                this.stats.nearMisses += 1;
                this.score += 160 * this.combo;
                this.pulseNearMiss('Near miss +' + Math.round(160 * this.combo));
            }
        }

        hitPlayer() {
            if (this.player.invincible > 0) return;
            if (this.player.shield) {
                this.player.shield = false;
                this.player.invincible = 1.0;
                this.pulseNearMiss('Štít zachránil jízdu');
                this.flash('shield');
                return;
            }
            this.lives -= 1;
            this.combo = 1;
            this.comboTimer = 0;
            this.player.invincible = 1.35;
            this.flash('hit');
            this.vibrate([80, 40, 80]);
            if (this.lives <= 0) this.gameOver();
        }

        gameOver() {
            this.state = 'over';
            this.running = false;
            const finalScore = Math.floor(this.score);
            this.bestScore = Math.max(this.bestScore, finalScore);
            localStorage.setItem('pedro_best_score', String(this.bestScore));
            this.ui.finalScore.textContent = finalScore.toLocaleString('cs-CZ');
            this.ui.bestScore.textContent = this.bestScore.toLocaleString('cs-CZ');
            this.ui.gameTime.textContent = Math.floor((performance.now() - this.startTime) / 1000) + 's';
            this.ui.jumps.textContent = this.stats.jumps;
            this.ui.dashes.textContent = this.stats.dashes;
            this.ui.nearMisses.textContent = this.stats.nearMisses;
            this.ui.maxCombo.textContent = 'x' + this.maxCombo;
            this.showScreen('game-over');
        }

        updateHud() {
            this.ui.score.textContent = Math.floor(this.score).toLocaleString('cs-CZ');
            this.ui.combo.textContent = 'x' + this.combo;
            this.ui.combo.classList.toggle('active', this.combo > 1);
            this.ui.dashBar.style.width = Math.round((1 - this.player.dashCooldown / 1.8) * 100) + '%';
            this.ui.dashBar.classList.toggle('ready', this.player.dashCooldown <= 0);
            this.ui.lives.innerHTML = '';
            for (let i = 0; i < this.lives; i++) {
                const dot = document.createElement('span');
                dot.textContent = '●';
                this.ui.lives.appendChild(dot);
            }
        }

        render(t) {
            const ctx = this.ctx;
            const w = this.w;
            const h = this.h;
            const horizon = h * 0.36;
            const roadBottom = h * 0.95;

            const bg = ctx.createLinearGradient(0, 0, 0, h);
            bg.addColorStop(0, '#070812');
            bg.addColorStop(0.42, '#0b1022');
            bg.addColorStop(1, '#170720');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, w, h);

            this.drawAurora(ctx, t, w, h);
            this.drawTunnel(ctx, t, horizon, roadBottom);
            this.drawObjects(ctx, t, horizon, roadBottom);
            if (this.state !== 'menu') this.drawPlayer(ctx, t);
            this.drawVignette(ctx, w, h);

            if (this.paused) this.drawPauseOverlay(ctx, w, h);
        }

        drawAurora(ctx, t, w, h) {
            const g1 = ctx.createRadialGradient(w * 0.15, h * 0.2, 0, w * 0.15, h * 0.2, w * 0.7);
            g1.addColorStop(0, 'rgba(0,220,255,0.22)');
            g1.addColorStop(1, 'rgba(0,220,255,0)');
            ctx.fillStyle = g1;
            ctx.fillRect(0, 0, w, h);
            const g2 = ctx.createRadialGradient(w * 0.92, h * 0.82, 0, w * 0.92, h * 0.82, w * 0.78);
            g2.addColorStop(0, 'rgba(255,0,200,0.2)');
            g2.addColorStop(1, 'rgba(255,0,200,0)');
            ctx.fillStyle = g2;
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = 'rgba(255,255,255,0.42)';
            for (const p of this.particles) {
                ctx.globalAlpha = 0.25 + p.z * 0.45;
                ctx.beginPath();
                ctx.arc(p.x + Math.sin(t + p.y) * 12, p.y, p.s * p.z, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        drawTunnel(ctx, t, horizon, roadBottom) {
            const w = this.w;
            const center = w / 2;
            for (const ring of this.rings.slice().sort((a, b) => b.z - a.z)) {
                const z = ring.z;
                const p = 1 - z;
                const y = lerp(horizon, roadBottom, Math.pow(p, 1.45));
                const halfW = lerp(w * 0.11, w * 0.78, p);
                const halfH = lerp(18, this.h * 0.2, p);
                ctx.save();
                ctx.translate(center, y);
                ctx.rotate(Math.sin(t * 0.9 + z * 7) * 0.02 + ring.twist * 0.015);
                ctx.strokeStyle = p > 0.78 ? 'rgba(0,220,255,0.34)' : 'rgba(0,220,255,0.2)';
                ctx.lineWidth = lerp(1, 5, p);
                ctx.shadowBlur = 18;
                ctx.shadowColor = '#00ddff';
                ctx.beginPath();
                ctx.ellipse(0, 0, halfW, halfH, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            ctx.shadowBlur = 0;
            ctx.lineWidth = 2;
            for (let lane = 0; lane < 4; lane++) {
                const xTop = center + (lane - 1.5) * this.laneGap(0.08);
                const xBottom = center + (lane - 1.5) * this.laneGap(1);
                const grad = ctx.createLinearGradient(xTop, horizon, xBottom, roadBottom);
                grad.addColorStop(0, 'rgba(0,220,255,0.05)');
                grad.addColorStop(1, 'rgba(0,220,255,0.42)');
                ctx.strokeStyle = grad;
                ctx.beginPath();
                ctx.moveTo(xTop, horizon);
                ctx.lineTo(xBottom, roadBottom);
                ctx.stroke();
            }

            ctx.fillStyle = 'rgba(0,220,255,0.055)';
            ctx.beginPath();
            ctx.moveTo(center - this.laneGap(1) * 1.55, roadBottom);
            ctx.lineTo(center - this.laneGap(0.08) * 1.55, horizon);
            ctx.lineTo(center + this.laneGap(0.08) * 1.55, horizon);
            ctx.lineTo(center + this.laneGap(1) * 1.55, roadBottom);
            ctx.closePath();
            ctx.fill();
        }

        drawObjects(ctx, t, horizon, roadBottom) {
            const sorted = this.objects.slice().sort((a, b) => b.z - a.z);
            for (const obj of sorted) {
                const p = 1 - obj.z;
                const y = lerp(horizon, roadBottom, Math.pow(p, 1.45));
                const x = this.laneX(obj.lane, p);
                const scale = lerp(0.35, 1.55, p);
                ctx.save();
                ctx.translate(x, y);
                if (obj.type === 'orb') this.drawOrb(ctx, t, scale);
                else this.drawBarrier(ctx, t, scale, obj.type === 'gate');
                ctx.restore();
            }
        }

        drawBarrier(ctx, t, scale, gate) {
            const size = 42 * scale;
            ctx.shadowBlur = 24 * scale;
            ctx.shadowColor = gate ? '#ff00c8' : '#ffb000';
            const grad = ctx.createLinearGradient(-size, -size, size, size);
            grad.addColorStop(0, gate ? '#ff00c8' : '#ffb000');
            grad.addColorStop(1, gate ? '#6611ff' : '#ff3d00');
            ctx.fillStyle = grad;
            ctx.strokeStyle = 'rgba(255,255,255,0.75)';
            ctx.lineWidth = 2 * scale;
            ctx.beginPath();
            ctx.roundRect(-size * 0.58, -size * 0.72, size * 1.16, size * 1.16, 10 * scale);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillRect(-size * 0.36, -size * 0.1, size * 0.72, size * 0.12);
        }

        drawOrb(ctx, t, scale) {
            const r = 18 * scale;
            const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, 0, 0, 0, r * 1.3);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.2, '#00ffff');
            grad.addColorStop(1, '#7b1fff');
            ctx.shadowBlur = 28 * scale;
            ctx.shadowColor = '#00ffff';
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, Math.sin(t * 5) * 4 * scale, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        drawPlayer(ctx, t) {
            const baseY = this.h * 0.78 - this.player.air * this.h * 0.22;
            const x = this.player.x || this.laneX(this.player.lane, 1);
            const bob = Math.sin(t * 10) * 3;
            const boost = this.player.dash > 0;

            if (this.player.invincible > 0 && Math.floor(t * 18) % 2 === 0) return;

            ctx.save();
            ctx.translate(x, baseY + bob);
            ctx.shadowBlur = boost ? 42 : 24;
            ctx.shadowColor = boost ? '#ff00c8' : '#00ddff';

            ctx.fillStyle = boost ? 'rgba(255,0,200,0.24)' : 'rgba(0,221,255,0.22)';
            ctx.beginPath();
            ctx.ellipse(0, 20, 58, 13, 0, 0, Math.PI * 2);
            ctx.fill();

            const board = ctx.createLinearGradient(-44, 0, 44, 0);
            board.addColorStop(0, '#00ddff');
            board.addColorStop(0.5, '#101726');
            board.addColorStop(1, '#ff00c8');
            ctx.fillStyle = board;
            ctx.beginPath();
            ctx.roundRect(-48, 8, 96, 15, 9);
            ctx.fill();

            ctx.fillStyle = '#f0f2ff';
            ctx.beginPath();
            ctx.roundRect(-16, -48, 32, 48, 10);
            ctx.fill();
            ctx.fillStyle = '#14172a';
            ctx.beginPath();
            ctx.roundRect(-20, -83, 40, 34, 11);
            ctx.fill();
            ctx.fillStyle = '#00ddff';
            ctx.fillRect(-13, -71, 26, 5);

            ctx.strokeStyle = this.player.shield ? '#00ffb0' : 'rgba(0,221,255,0.45)';
            ctx.lineWidth = this.player.shield ? 4 : 2;
            ctx.beginPath();
            ctx.ellipse(0, -31, 44, 66, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        drawVignette(ctx, w, h) {
            const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.12, w / 2, h / 2, w * 0.72);
            vg.addColorStop(0, 'rgba(0,0,0,0)');
            vg.addColorStop(1, 'rgba(0,0,0,0.58)');
            ctx.fillStyle = vg;
            ctx.fillRect(0, 0, w, h);
        }

        drawPauseOverlay(ctx, w, h) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#ffffff';
            ctx.font = '800 42px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('PAUZA', w / 2, h / 2);
        }

        laneGap(p) {
            return lerp(this.w * 0.11, this.w * 0.26, p);
        }

        laneX(lane, p) {
            return this.w / 2 + (lane - 1) * this.laneGap(p);
        }

        jump() {
            if (this.state !== 'playing' || this.paused) return;
            if (this.player.air <= 0.02) {
                this.player.vy = 1.18;
                this.stats.jumps += 1;
                this.vibrate(20);
            }
        }

        dash() {
            if (this.state !== 'playing' || this.paused) return;
            if (this.player.dashCooldown <= 0) {
                this.player.dash = 0.42;
                this.player.dashCooldown = 1.8;
                this.stats.dashes += 1;
                this.vibrate(50);
            }
        }

        moveLane(dir) {
            if (this.state !== 'playing' || this.paused) return;
            this.player.lane = clamp(this.player.lane + dir, 0, 2);
            this.vibrate(12);
        }

        handleKey(event) {
            if (event.code === 'Space' || event.code === 'ArrowUp') {
                event.preventDefault();
                this.jump();
            }
            if (event.code === 'ArrowDown' || event.code === 'ShiftLeft') this.dash();
            if (event.code === 'ArrowLeft' || event.code === 'KeyA') this.moveLane(-1);
            if (event.code === 'ArrowRight' || event.code === 'KeyD') this.moveLane(1);
            if (event.code === 'Escape') this.togglePause();
        }

        onTouchStart(event) {
            if (this.state !== 'playing') return;
            const t = event.touches[0];
            this.touchStart = { x: t.clientX, y: t.clientY, time: performance.now() };
        }

        onTouchEnd(event) {
            if (this.state !== 'playing' || !this.touchStart) return;
            event.preventDefault();
            const t = event.changedTouches[0];
            const dx = t.clientX - this.touchStart.x;
            const dy = t.clientY - this.touchStart.y;
            const ax = Math.abs(dx);
            const ay = Math.abs(dy);
            if (ax < 20 && ay < 20) this.jump();
            else if (ax > ay && ax > 32) this.moveLane(dx > 0 ? 1 : -1);
            else if (dy < -32) this.jump();
            else if (dy > 58) this.dash();
            this.touchStart = null;
        }

        onPointerTap(event) {
            if (event.pointerType !== 'mouse') return;
            if (this.state === 'playing') this.jump();
        }

        pulseNearMiss(text) {
            this.ui.nearMiss.textContent = text;
            this.ui.nearMiss.classList.remove('show');
            void this.ui.nearMiss.offsetWidth;
            this.ui.nearMiss.classList.add('show');
        }

        flash(type) {
            this.ui.flash.className = type === 'shield' ? 'shield' : 'hit';
            setTimeout(() => { this.ui.flash.className = ''; }, 240);
        }

        vibrate(pattern) {
            if (navigator.vibrate) navigator.vibrate(pattern);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new PedroGame());
    } else {
        new PedroGame();
    }
})();
