import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { Reflector } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/objects/Reflector.js';
import { EffectComposer } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/ShaderPass.js';

class Game3D {
    constructor(options) {
        this.canvas = options.canvas;
        this.onCollision = options.onCollision;
        this.gameObjects = [];
        this.tunnelDetails = []; // Pro potrubí a světla
        this.lastSpawnZ = 0;
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
        const composer = new EffectComposer(this.renderer);
        composer.addPass(new RenderPass(this.scene, this.camera));
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.8, 0.2);
        composer.addPass(bloomPass);

        const customShader = {
            uniforms: { "tDiffuse": { value: null }, "vignette": { value: 0.9 } },
            vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
            fragmentShader: `uniform sampler2D tDiffuse; uniform float vignette; varying vec2 vUv; void main() { vec4 color = texture2D( tDiffuse, vUv ); float vig = 1.0 - smoothstep(0.0, vignette, length(vUv - 0.5)); gl_FragColor = color * vig; }`
        };
        const shaderPass = new ShaderPass(customShader);
        composer.addPass(shaderPass);
        this.composer = composer;
    }

    setupWorld() {
        this.scene.fog = new THREE.Fog(0x101015, 15, 80);
        this.scene.add(new THREE.AmbientLight(0x404040, 2.5));

        this.player = this.createPlayer();
        this.scene.add(this.player);

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
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 8), new THREE.MeshPhongMaterial({color: 0xffffff, emissive: 0x00BFFF, emissiveIntensity: 3}));
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 2.2), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95, roughness: 0.4, emissive: 0xaaaaaa, emissiveIntensity: 0.1 }));
        board.position.y = -0.1;
        playerGroup.add(core, board);
        return playerGroup;
    }

    createTunnel() {
        const tubePath = new THREE.LineCurve3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-200));
        const tubeGeo = new THREE.TubeGeometry(tubePath, 12, 8, 8, false);
        const tubeTex = this.createProceduralTunnelTexture(); // Změna: Použití procedurální textury
        tubeTex.wrapS = tubeTex.wrapT = THREE.RepeatWrapping;
        const tubeMat = new THREE.MeshStandardMaterial({ map: tubeTex, side: THREE.BackSide, roughness: 0.8, metalness: 0.2 });
        return new THREE.Mesh(tubeGeo, tubeMat);
    }

    createProceduralTunnelTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 4096;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Šum
        for (let i = 0; i < 40000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const c = Math.floor(Math.random() * 25) + 45;
            ctx.fillStyle = `rgb(${c},${c},${c})`;
            ctx.fillRect(x, y, 3, 3);
        }
        
        // Spáry
        ctx.strokeStyle = '#282828';
        ctx.lineWidth = 30;
        for (let y = 0; y < canvas.height; y += 512) {
            ctx.beginPath();
            ctx.moveTo(0, y + (Math.random() - 0.5) * 20);
            ctx.lineTo(canvas.width, y + (Math.random() - 0.5) * 20);
            ctx.stroke();
        }
        
        // Špína a vlhkost
        ctx.fillStyle = 'rgba(10, 50, 10, 0.25)';
        for(let i=0; i<15; i++) {
            ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 200, 400);
        }
        
        // Graffiti
        ctx.fillStyle = '#aaa';
        ctx.font = '60px Teko';
        ctx.globalAlpha = 0.05;
        ctx.fillText("PEDRO ŽIJE", Math.random() * (canvas.width - 200), Math.random() * canvas.height);
        ctx.fillText("KDE JE DALŠÍ?", Math.random() * (canvas.width - 200), Math.random() * canvas.height);
        ctx.globalAlpha = 1.0;
        
        return new THREE.CanvasTexture(canvas);
    }
    
    reset() {
        [...this.gameObjects, ...this.tunnelDetails].forEach(o => this.scene.remove(o.mesh));
        this.gameObjects = [];
        this.tunnelDetails = [];
        this.lastSpawnZ = 0;
        this.player.position.set(0, -0.6, 0);
        this.camera.position.set(0, 4, 10);
    }
    
    render() {
        this.composer.render();
    }
    
    update(gameState, targetX, delta) {
        this.player.position.y = gameState.playerY;
        this.player.position.x += (targetX - this.player.position.x) * 0.15;
        this.player.rotation.y = (this.player.position.x - targetX) * -0.1;
        
        const moveZ = gameState.speed * delta * (gameState.isDashing ? 3 : 1);
        this.player.position.z -= moveZ;
        
        if (this.tunnel.material.map) {
            this.tunnel.material.map.offset.y -= moveZ * 0.005;
        }
        
        this.lastSpawnZ += moveZ;
        if (this.lastSpawnZ > (600 / gameState.speed)) {
            this.spawnObject();
            this.lastSpawnZ = 0;
        }

        this.checkCollisions(gameState);
        this.cleanupObjects(gameState);

        this.camera.position.x += (this.player.position.x * 0.5 - this.camera.position.x) * 0.1;
        this.camera.position.y += (this.player.position.y + 3 - this.camera.position.y) * 0.1;
        this.camera.position.z = this.player.position.z + 10;
        
        this.keyLight.position.set(this.player.position.x, this.player.position.y + 5, this.player.position.z + 5);
        this.keyLight.target.position.set(this.player.position.x, this.player.position.y, this.player.position.z - 50);
        this.keyLight.target.updateMatrixWorld();
        
        this.render();
    }

    spawnObject() {
        (Math.random() > 0.25) ? this.spawnObstacle() : this.spawnPowerup();
    }

    spawnObstacle() {
        const type = Math.random(); let mesh;
        const zPos = this.player.position.z - 150;
        if (type < 0.6) {
            const lane = Math.floor(Math.random() * 3);
            const geo = new THREE.BoxGeometry(4 - 1, 8, 2);
            const mat = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9, emissive: 0xFFD700, emissiveIntensity: 0.3 });
            mesh = new THREE.Mesh(geo, mat);
            mesh.position.set((lane - 1) * 4, 3, zPos);
        } else {
            const geo = new THREE.CylinderGeometry(0.5, 0.5, 4 * 3.2, 16);
            const mat = new THREE.MeshStandardMaterial({ color: 0x8B4513, metalness: 0.8, roughness: 0.6, emissive: 0xFF0000, emissiveIntensity: 0.5 });
            mesh = new THREE.Mesh(geo, mat);
            mesh.rotation.z = Math.PI / 2;
            mesh.position.set(0, 0, zPos);
        }
        this.scene.add(mesh);
        this.gameObjects.push({ mesh, type: 'obstacle' });
    }

    spawnPowerup() {
        const lane = Math.floor(Math.random() * 3);
        const zPos = this.player.position.z - 150;
        const geo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
        const mat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x39FF14, emissiveIntensity: 2 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = Math.PI/2;
        mesh.position.set((lane - 1) * 4, -0.4, zPos);
        this.scene.add(mesh);
        this.gameObjects.push({ mesh, type: 'powerup' });
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
        const cleanup = (arr) => {
            for (let i = arr.length - 1; i >= 0; i--) {
                const obj = arr[i];
                if (obj.mesh.position.z > this.camera.position.z + 10) {
                    this.scene.remove(obj.mesh);
                    if (obj.mesh.geometry) obj.mesh.geometry.dispose();
                    if (obj.mesh.material) obj.mesh.material.dispose();
                    if (obj.type === 'obstacle') gameState.runStats.obstaclesDodged++;
                    arr.splice(i, 1);
                }
            }
        };
        cleanup(this.gameObjects);
        cleanup(this.tunnelDetails);
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
