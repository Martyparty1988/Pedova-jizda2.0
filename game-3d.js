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
        this.tunnelDetails = [];
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
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.8, 0.1);
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
        this.ambientLight = new THREE.AmbientLight(0x404040, 2.5);
        this.scene.add(this.ambientLight);

        this.player = this.createPlayer();
        this.scene.add(this.player);

        this.tunnel = this.createTunnel();
        this.scene.add(this.tunnel);

        this.floor = new Reflector(new THREE.PlaneGeometry(30, 200), { clipBias: 0.003, textureWidth: window.innerWidth * window.devicePixelRatio, textureHeight: window.innerHeight * window.devicePixelRatio, color: 0x222222 });
        this.floor.rotation.x = -Math.PI / 2; this.floor.position.y = -1; this.scene.add(this.floor);
        
        this.keyLight = new THREE.SpotLight(0xffffff, 2.0, 100, Math.PI / 3.5, 0.8);
        this.scene.add(this.keyLight);
        this.scene.add(this.keyLight.target);

        this.dustParticles = this.createDustParticles();
        this.scene.add(this.dustParticles);
    }
    
    createPlayer() {
        const playerGroup = new THREE.Group();
        
        // Materiály
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xFF007F, metalness: 0.6, roughness: 0.4 });
        const accentMat = new THREE.MeshStandardMaterial({ color: 0x5a687d, roughness: 0.5 });
        const ventMat = new THREE.MeshStandardMaterial({ color: 0x10B981, emissive: 0x10B981, emissiveIntensity: 1 });
        this.headlightMat = new THREE.MeshPhongMaterial({ color: 0x00BFFF, emissive: 0x00BFFF, emissiveIntensity: 4 });

        // Tvar boardu pomocí THREE.Shape a ExtrudeGeometry
        const boardShape = new THREE.Shape();
        const w = 0.7; const l = 1.4; const indent = 0.2; const r = 0.2;

        boardShape.moveTo(-w + r, l);
        boardShape.lineTo(w - r, l);
        boardShape.quadraticCurveTo(w, l, w, l - r);
        boardShape.lineTo(w, l * 0.4);
        boardShape.quadraticCurveTo(w, l * 0.2, w - indent, l * 0.2);
        boardShape.lineTo(w - indent, -l * 0.2);
        boardShape.quadraticCurveTo(w, -l * 0.2, w, -l * 0.4);
        boardShape.lineTo(w, -l + r);
        boardShape.quadraticCurveTo(w, -l, w - r, -l);
        boardShape.lineTo(-w + r, -l);
        boardShape.quadraticCurveTo(-w, -l, -w, -l + r);
        boardShape.lineTo(-w, -l * 0.4);
        boardShape.quadraticCurveTo(-w, -l * 0.2, -w + indent, -l * 0.2);
        boardShape.lineTo(-w + indent, l * 0.2);
        boardShape.quadraticCurveTo(-w, l * 0.2, -w, l * 0.4);
        boardShape.lineTo(-w, l - r);
        boardShape.quadraticCurveTo(-w, l, -w + r, l);

        const holeShape = new THREE.Path();
        const hw = 0.3; const hl = 0.6;
        holeShape.moveTo(-hw, hl); holeShape.lineTo(hw, hl); holeShape.lineTo(hw, -hl); holeShape.lineTo(-hw, -hl);
        holeShape.closePath();
        boardShape.holes.push(holeShape);
        
        const extrudeSettings = { depth: 0.3, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.05, bevelSegments: 8 };
        const boardGeo = new THREE.ExtrudeGeometry(boardShape, extrudeSettings);
        
        const mainBody = new THREE.Mesh(boardGeo, bodyMat);
        mainBody.rotation.x = -Math.PI / 2;
        mainBody.position.y = 0;

        // Aplikace textury s nálepkami
        const decalTexture = this.createBoardTexture();
        const decalMat = new THREE.MeshStandardMaterial({ map: decalTexture, transparent: true });
        const decalGeo = new THREE.ShapeGeometry(boardShape);
        const decalPlane = new THREE.Mesh(decalGeo, decalMat);
        decalPlane.rotation.x = -Math.PI / 2;
        decalPlane.position.y = 0.26; // Těsně nad povrchem

        // Šedé akcenty vpředu
        const accentShape = new THREE.Shape();
        accentShape.moveTo(-w, -l*0.8);
        accentShape.lineTo(w, -l*0.8);
        accentShape.quadraticCurveTo(w, -l, w*0.8, -l);
        accentShape.lineTo(-w*0.8, -l);
        accentShape.quadraticCurveTo(-w, -l, -w, -l*0.8);
        const accentGeo = new THREE.ShapeGeometry(accentShape);
        const accentMesh = new THREE.Mesh(accentGeo, accentMat);
        accentMesh.rotation.x = -Math.PI / 2;
        accentMesh.position.y = 0.251;

        // Světla a detaily
        this.headlightLeft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), this.headlightMat);
        this.headlightLeft.position.set(-0.45, 0.05, -l + 0.05);
        this.headlightRight = this.headlightLeft.clone();
        this.headlightRight.position.x = 0.45;
        
        const frontVent = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.2), ventMat);
        frontVent.position.set(0, -0.1, -l);
        
        playerGroup.add(mainBody, decalPlane, accentMesh, this.headlightLeft, this.headlightRight, frontVent);
        playerGroup.scale.set(0.8, 0.8, 0.8);
        return playerGroup;
    }

    createBoardTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Nápis "PEDRO"
        ctx.font = 'bold 70px Rajdhani';
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 10;
        ctx.textAlign = 'center';
        ctx.strokeText('PEDRO', 128, 380);
        ctx.fillText('PEDRO', 128, 380);

        // Nálepka stříkačky
        ctx.save();
        ctx.translate(128, 180);
        ctx.rotate(-0.1);
        ctx.scale(1.2, 1.2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-40, -10, 80, 20); // Tělo
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(-35, -5, 50, 10); // Tekutina
        ctx.fillStyle = '#AAAAAA';
        ctx.fillRect(40, -12, 10, 24); // Píst
        ctx.fillRect(50, -5, 15, 10); // Úchyt
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-40, 0);
        ctx.lineTo(-60, 0); // Jehla
        ctx.stroke();
        ctx.restore();

        return new THREE.CanvasTexture(canvas);
    }

    createTunnel() {
        const tubePath = new THREE.LineCurve3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-200));
        const tubeGeo = new THREE.TubeGeometry(tubePath, 12, 8, 8, false);
        const tubeTex = this.createProceduralTunnelTexture();
        tubeTex.wrapS = tubeTex.wrapT = THREE.RepeatWrapping;
        const tubeMat = new THREE.MeshStandardMaterial({ map: tubeTex, side: THREE.BackSide, roughness: 0.8, metalness: 0.2 });
        return new THREE.Mesh(tubeGeo, tubeMat);
    }
    
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
    
    reset() {
        [...this.gameObjects, ...this.tunnelDetails].forEach(o => this.scene.remove(o.mesh));
        this.gameObjects = []; this.tunnelDetails = []; this.lastSpawnZ = 0;
        this.player.position.set(0, -0.6, 0);
        this.camera.position.set(0, 4, 10);
    }
    
    update(gameState, targetX, delta) {
        this.player.position.y = gameState.playerY;
        this.player.position.x += (targetX - this.player.position.x) * 0.15;
        this.player.rotation.y = (this.player.position.x - targetX) * -0.1;
        
        // Pulzující světla
        const pulse = 2 + Math.sin(Date.now() * 0.01) * 1.5;
        this.headlightLeft.material.emissiveIntensity = pulse;
        this.headlightRight.material.emissiveIntensity = pulse;

        const moveZ = gameState.speed * delta * (gameState.isDashing ? 3 : 1);
        this.player.position.z -= moveZ;
        
        if (this.tunnel.material.map) this.tunnel.material.map.offset.y -= moveZ * 0.005;
        
        this.lastSpawnZ += moveZ;
        if (this.lastSpawnZ > (600 / gameState.speed)) { this.spawnObject(); this.lastSpawnZ = 0; }

        this.checkCollisions(gameState);
        this.cleanupObjects(gameState);

        this.camera.position.x += (this.player.position.x * 0.5 - this.camera.position.x) * 0.1;
        this.camera.position.y += (this.player.position.y + 3 - this.camera.position.y) * 0.1;
        this.camera.position.z = this.player.position.z + 10;
        
        this.keyLight.position.set(this.player.position.x, this.player.position.y + 5, this.player.position.z + 5);
        this.keyLight.target.position.set(this.player.position.x, this.player.position.y, this.player.position.z - 50);
        this.keyLight.target.updateMatrixWorld();

        this.dustParticles.position.z -= moveZ * 0.5;
        if (this.dustParticles.position.z < -100) this.dustParticles.position.z += 100;
        
        const zone = Math.floor(Math.abs(this.player.position.z) / 200) % 3;
        const colors = [0x404040, 0x401010, 0x104010];
        this.ambientLight.color.setHex(colors[zone]);
        
        this.composer.render();
    }

    spawnObject() { (Math.random() > 0.25) ? this.spawnObstacle() : this.spawnPowerup(); }

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

