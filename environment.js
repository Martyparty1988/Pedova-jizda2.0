import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { Reflector } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/objects/Reflector.js';

/**
 * Třída pro vytváření a správu herního prostředí.
 */
export class Environment {
    constructor(scene) {
        this.tunnel = this.createTunnel();
        this.dustParticles = this.createDustParticles();
        this.floor = this.createFloor();
    }

    /**
     * Vytvoří mesh tunelu.
     * @returns {THREE.Mesh}
     */
    createTunnel() {
        const tubePath = new THREE.LineCurve3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-200));
        const tubeGeo = new THREE.TubeGeometry(tubePath, 12, 8, 8, false);
        const tubeTex = this.createProceduralTunnelTexture();
        tubeTex.wrapS = THREE.RepeatWrapping;
        tubeTex.wrapT = THREE.RepeatWrapping;
        const tubeMat = new THREE.MeshStandardMaterial({ map: tubeTex, side: THREE.BackSide, roughness: 0.8, metalness: 0.2 });
        return new THREE.Mesh(tubeGeo, tubeMat);
    }
    
    /**
     * Vytvoří částicový systém prachu.
     * @returns {THREE.Points}
     */
    createDustParticles() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        for (let i = 0; i < 200; i++) {
            vertices.push(
                Math.random() * 20 - 10,
                Math.random() * 10,
                Math.random() * -200
            );
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({ size: 0.05, color: 0x666666 });
        return new THREE.Points(geometry, material);
    }
    
    /**
     * Vytvoří reflexní podlahu.
     * @returns {Reflector}
     */
    createFloor() {
        const floor = new Reflector(new THREE.PlaneGeometry(30, 200), {
            clipBias: 0.003,
            textureWidth: window.innerWidth * window.devicePixelRatio,
            textureHeight: window.innerHeight * window.devicePixelRatio,
            color: 0x222222
        });
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1;
        return floor;
    }

    /**
     * Vytvoří procedurální texturu pro stěny tunelu.
     * @returns {THREE.CanvasTexture}
     */
    createProceduralTunnelTexture() {
        const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 4096;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#3a3a3a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < 40000; i++) {
            const x = Math.random() * canvas.width; const y = Math.random() * canvas.height; const c = Math.floor(Math.random() * 25) + 45;
            ctx.fillStyle = `rgb(${c},${c},${c})`; ctx.fillRect(x, y, 3, 3);
        }
        ctx.strokeStyle = '#282828'; ctx.lineWidth = 30;
        for (let y = 0; y < canvas.height; y += 512) {
            ctx.beginPath(); ctx.moveTo(0, y + (Math.random() - 0.5) * 20); ctx.lineTo(canvas.width, y + (Math.random() - 0.5) * 20); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(10, 50, 10, 0.25)';
        for(let i=0; i<15; i++) { ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 200, 400); }
        ctx.fillStyle = '#aaa'; ctx.font = '60px Teko'; ctx.globalAlpha = 0.05;
        ctx.fillText("PEDRO ŽIJE", Math.random() * (canvas.width - 200), Math.random() * canvas.height);
        ctx.fillText("KDE JE DALŠÍ?", Math.random() * (canvas.width - 200), Math.random() * canvas.height);
        ctx.globalAlpha = 1.0;
        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Aktualizuje prostředí (např. pohyb textury tunelu, prach).
     * @param {number} moveZ - Vzdálenost, o kterou se hráč posunul.
     */
    update(moveZ) {
        if (this.tunnel.material.map) {
            this.tunnel.material.map.offset.y -= moveZ * 0.005;
        }
        this.dustParticles.position.z -= moveZ * 0.5;
        if (this.dustParticles.position.z < -100) {
            this.dustParticles.position.z += 100;
        }
    }
}
