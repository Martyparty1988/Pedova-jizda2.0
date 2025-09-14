// game-3d.js

import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { Reflector } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/objects/Reflector.js';
import { EffectComposer } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/ShaderPass.js';
// Tento soubor sice neexistuje, ale pro jednoduchost si třídu definujeme přímo zde
// import { TrailRenderer } from './TrailRenderer.js'; 

// --- Definice TrailRendereru (normálně by byla v samostatném souboru) ---
class TrailRenderer {
    constructor(scene, options) {
        this.scene = scene;
        this.options = options || {};
        this.trailLength = this.options.trailLength || 100;
        this.trailWidth = this.options.trailWidth || 0.2;
        this.material = this.options.material || new THREE.MeshBasicMaterial({ color: 0xff007f });
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.trailLength * 3 * 2);
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.frustumCulled = false;
        this.scene.add(this.mesh);
        this.trailPoints = [];
    }

    update(targetPosition) {
        this.trailPoints.push(targetPosition.clone());
        if (this.trailPoints.length > this.trailLength) {
            this.trailPoints.shift();
        }

        for (let i = 0; i < this.trailPoints.length; i++) {
            const point = this.trailPoints[i];
            const nextPoint = this.trailPoints[i + 1] || point;
            const direction = new THREE.Vector3().subVectors(nextPoint, point).normalize();
            const perpendicular = new THREE.Vector3(direction.z, 0, -direction.x).normalize().multiplyScalar(this.trailWidth / 2);

            const p1 = new THREE.Vector3().addVectors(point, perpendicular);
            const p2 = new THREE.Vector3().subVectors(point, perpendicular);

            this.positions[i * 6] = p1.x;
            this.positions[i * 6 + 1] = p1.y;
            this.positions[i * 6 + 2] = p1.z;
            this.positions[i * 6 + 3] = p2.x;
            this.positions[i * 6 + 4] = p2.y;
            this.positions[i * 6 + 5] = p2.z;
        }

        this.geometry.attributes.position.needsUpdate = true;
    }
}


class Game3D {
    constructor(options) {
        this.canvas = options.canvas;
        this.onCollision = options.onCollision;
        this.gameObjects = [];
        this.tunnelDetails = [];
        this.lastSpawnZ = 0;
        this.activeTunnelMaterial = null;
    }

    async init() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
        this.camera.position.set(0, 4, 10);
        this.clock = new THREE.Clock();
        this.playerCollider = new THREE.Box3();
        this.obstacleCollider = new THREE.Box3();

        try {
            this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
            if (this.renderer.getContext() === null) throw new Error("Nepodařilo se získat WebGL kontext.");
        } catch (e) {
            throw new Error(`Selhání inicializace WebGL Rendereru: ${e.message}`);
        }

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);

        this.setupPostProcessing();
        this.setupWorld();
    }
    
    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        
        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.8, 0.1);
        this.composer.addPass(this.bloomPass);

        // Shader pro chromatickou aberaci (efekt při Dashi)
        const chromaticAberrationShader = {
            uniforms: {
                "tDiffuse": { value: null },
                "amount": { value: 0.0 }
            },
            vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float amount;
                varying vec2 vUv;
                void main() {
                    vec2 offset = amount * (vUv - 0.5);
                    vec4 r = texture2D(tDiffuse, vUv + offset);
                    vec4 g = texture2D(tDiffuse, vUv);
                    vec4 b = texture2D(tDiffuse, vUv - offset);
                    gl_FragColor = vec4(r.r, g.g, b.b, g.a);
                }`
        };
        this.chromaticAberrationPass = new ShaderPass(chromaticAberrationShader);
        this.composer.addPass(this.chromaticAberrationPass);
    }

    setupWorld() {
        this.scene.fog = new THREE.Fog(0x101015, 15, 80);
        this.ambientLight = new THREE.AmbientLight(0x404040, 2.5);
        this.scene.add(this.ambientLight);

        this.player = this.createPlayer();
        this.scene.add(this.player);

        this.playerTrail = new TrailRenderer(this.scene, {
            trailLength: 50,
            trailWidth: 0.3,
            material: new THREE.MeshBasicMaterial({ 
                color: 0xff007f, 
                blending: THREE.AdditiveBlending, 
                transparent: true,
                opacity: 0.5
            })
        });

        this.createTunnelMaterials();
        this.tunnel = this.createTunnel();
        this.scene.add(this.tunnel);

        this.floor = new Reflector(new THREE.PlaneGeometry(30, 200), { clipBias: 0.003, textureWidth: window.innerWidth * window.devicePixelRatio, textureHeight: window.innerHeight * window.devicePixelRatio, color: 0x222222 });
        this.floor.rotation.x = -Math.PI / 2; this.floor.position.y = -1; this.scene.add(this.floor);
        
        this.keyLight = new THREE.SpotLight(0xffffff, 2.0, 100, Math.PI / 3.5, 0.8);
        this.scene.add(this.keyLight);
        this.scene.add(this.keyLight.target);
    }
    
    createPlayer() {
        const playerGroup = new THREE.Group();
        const boardMat = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            metalness: 0.9,
            roughness: 0.4,
            emissive: 0x00BFFF,
            emissiveIntensity: 1
        });
        const boardGeo = new THREE.BoxGeometry(1.2, 0.1, 2.5);
        const board = new THREE.Mesh(boardGeo, boardMat);
        
        const coreGeo = new THREE.SphereGeometry(0.3, 16, 8);
        const coreMat = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            emissive: 0xff007f,
            emissiveIntensity: 4
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.y = 0.3;

        playerGroup.add(board, core);
        return playerGroup;
    }

    createTunnelMaterials() {
        const concreteTex = this.createProceduralTunnelTexture('concrete');
        concreteTex.wrapS = concreteTex.wrapT = THREE.RepeatWrapping;
        this.concreteMaterial = new THREE.MeshStandardMaterial({ map: concreteTex, side: THREE.BackSide, roughness: 0.8, metalness: 0.2 });

        const brickTex = this.createProceduralTunnelTexture('brick');
        brickTex.wrapS = brickTex.wrapT = THREE.RepeatWrapping;
        this.brickMaterial = new THREE.MeshStandardMaterial({ map: brickTex, side: THREE.BackSide, roughness: 0.9, metalness: 0.1 });
    }

    createTunnel() {
        const tubePath = new THREE.LineCurve3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-200));
        const tubeGeo = new THREE.TubeGeometry(tubePath, 12, 8, 8, false);
        this.activeTunnelMaterial = this.concreteMaterial;
        return new THREE.Mesh(tubeGeo, this.activeTunnelMaterial);
    }

    createProceduralTunnelTexture(type) {
        const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 4096;
        const ctx = canvas.getContext('2d');
        if (type === 'brick') {
            ctx.fillStyle = '#5a3a3a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#4a2a2a'; ctx.lineWidth = 10;
            for (let y = 0; y < canvas.height; y += 128) {
                for (let x = (y % 256 === 0 ? 0 : -256); x < canvas.width; x += 512) {
                     ctx.strokeRect(x, y, 512, 128);
                }
            }
        } else { // concrete
            ctx.fillStyle = '#3a3a3a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < 40000; i++) {
                const x = Math.random() * canvas.width; const y = Math.random() * canvas.height; const c = Math.floor(Math.random() * 25) + 45;
                ctx.fillStyle = `rgb(${c},${c},${c})`; ctx.fillRect(x, y, 3, 3);
            }
            ctx.strokeStyle = '#282828'; ctx.lineWidth = 30;
            for (let y = 0; y < canvas.height; y += 512) {
                ctx.beginPath(); ctx.moveTo(0, y + (Math.random() - 0.5) * 20); ctx.lineTo(canvas.width, y + (Math.random() - 0.5) * 20); ctx.stroke();
            }
        }
        return new THREE.CanvasTexture(canvas);
    }
    
    reset() {
        this.gameObjects.forEach(o => this.scene.remove(o.mesh));
        this.gameObjects = []; 
        this.lastSpawnZ = 0;
        this.player.position.set(0, -0.6, 0);
        this.camera.position.set(0, 4, 10);
    }
    
    update(gameState, targetX, delta) {
        this.player.position.y = gameState.playerY;
        this.player.position.x += (targetX - this.player.position.x) * 0.15;
        this.player.rotation.y = (this.player.position.x - targetX) * -0.1;
        
        const moveZ = gameState.speed * delta * (gameState.isDashing ? 3 : 1);
        this.player.position.z -= moveZ;
        
        if (this.tunnel.material.map) this.tunnel.material.map.offset.y -= moveZ * 0.005;
        
        this.lastSpawnZ += moveZ;
        if (this.lastSpawnZ > (600 / gameState.speed)) { this.spawnObject(this.activeTunnelMaterial); this.lastSpawnZ = 0; }

        this.checkCollisions(gameState);
        this.cleanupObjects(gameState);

        this.camera.position.x += (this.player.position.x * 0.5 - this.camera.position.x) * 0.1;
        this.camera.position.y += (this.player.position.y + 3 - this.camera.position.y) * 0.1;
        this.camera.position.z = this.player.position.z + 10;
        
        this.keyLight.position.set(this.player.position.x, this.player.position.y + 5, this.player.position.z + 5);
        this.keyLight.target.position.set(this.player.position.x, this.player.position.y, this.player.position.z - 50);
        this.keyLight.target.updateMatrixWorld();

        this.playerTrail.update(this.player.position);

        // Efekt při Dashi
        const dashEffectAmount = this.chromaticAberrationPass.uniforms.amount.value;
        const targetDashEffect = gameState.isDashing ? 0.015 : 0.0;
        this.chromaticAberrationPass.uniforms.amount.value += (targetDashEffect - dashEffectAmount) * 0.1;

        // Dynamická změna tunelu
        const zone = Math.floor(Math.abs(this.player.position.z) / 400);
        const newMaterial = (zone % 2 === 0) ? this.concreteMaterial : this.brickMaterial;
        if (this.tunnel.material !== newMaterial) {
            this.tunnel.material = newMaterial;
            this.activeTunnelMaterial = newMaterial;
        }
        
        this.composer.render();
    }

    spawnObject(materialType) { (Math.random() > 0.3) ? this.spawnObstacle(materialType) : this.spawnPowerup(); }

    spawnObstacle(materialType) {
        let mesh;
        const zPos = this.player.position.z - 150;
        const type = Math.random();

        if (type < 0.5) { // Bariéra
            const lane = Math.floor(Math.random() * 3);
            const geo = new THREE.BoxGeometry(4, 2, 0.5);
            const mat = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9, metalness: 0.5, emissive: 0xFFD700, emissiveIntensity: 0.2 });
            mesh = new THREE.Mesh(geo, mat);
            mesh.position.set((lane - 1) * 4, 0, zPos);
        } else if (type < 0.8) { // Trubka napříč
            const geo = new THREE.CylinderGeometry(0.5, 0.5, 4 * 3.2, 16);
            const mat = new THREE.MeshStandardMaterial({ color: 0x8B4513, metalness: 0.8, roughness: 0.6, emissive: 0xFF0000, emissiveIntensity: 0.5 });
            mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.z = Math.PI / 2;
            mesh.position.set(0, 0, zPos);
        } else { // Barely
            const lane = Math.floor(Math.random() * 3) -1;
            const geo = new THREE.CylinderGeometry(0.8, 0.8, 2, 16);
            const mat = new THREE.MeshStandardMaterial({ color: 0x556B2F, roughness: 0.8 });
            mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(lane * 4, -0.6, zPos);
        }
        this.scene.add(mesh);
        this.gameObjects.push({ mesh, type: 'obstacle' });
    }

    spawnPowerup() {
        const lane = Math.floor(Math.random() * 3);
        const zPos = this.player.position.z - 150;
        const geo = new THREE.IcosahedronGeometry(0.4, 0);
        const mat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x39FF14, emissiveIntensity: 3 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set((lane - 1) * 4, 0, zPos);
        this.scene.add(mesh);
        this.gameObjects.push({ mesh, type: 'powerup' });
    }
    
    triggerPowerupEffect(position) {
        const particleCount = 50;
        const particles = new THREE.BufferGeometry();
        const posArray = new Float32Array(particleCount * 3);
        for(let i = 0; i < particleCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 0.5;
        }
        particles.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.1,
            color: 0x39FF14,
            blending: THREE.AdditiveBlending,
            transparent: true
        });
        const particleSystem = new THREE.Points(particles, particleMaterial);
        particleSystem.position.copy(position);
        this.scene.add(particleSystem);

        // Animace a odstranění efektu
        let scale = 1;
        const animate = () => {
            scale += 0.5;
            particleSystem.scale.set(scale, scale, scale);
            particleMaterial.opacity -= 0.02;
            if (particleMaterial.opacity <= 0) {
                this.scene.remove(particleSystem);
                particles.dispose();
                particleMaterial.dispose();
            } else {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }
    
    checkCollisions() {
        this.playerCollider.setFromObject(this.player);
        for (let i = this.gameObjects.length - 1; i >= 0; i--) {
            const obj = this.gameObjects[i];
            if (Math.abs(obj.mesh.position.z - this.player.position.z) > 3) continue;
            this.obstacleCollider.setFromObject(obj.mesh);
            if (this.playerCollider.intersectsBox(this.obstacleCollider)) {
                this.onCollision(obj.type, i);
            }
        }
    }
    
    cleanupObjects(gameState) {
        for (let i = this.gameObjects.length - 1; i >= 0; i--) {
            const obj = this.gameObjects[i];
            if (obj.mesh.position.z > this.camera.position.z + 10) {
                this.scene.remove(obj.mesh);
                if (obj.mesh.geometry) obj.mesh.geometry.dispose();
                if (obj.mesh.material) obj.mesh.material.dispose();
                if (obj.type === 'obstacle') gameState.runStats.obstaclesDodged++;
                this.gameObjects.splice(i, 1);
            }
        }
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }
}

export { Game3D };
