import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { EffectComposer } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/ShaderPass.js';
import { Player } from './player.js';
import { Environment } from './environment.js';
import { GameObjectFactory } from './gameObjectFactory.js';

const LANE_WIDTH = 4;

export class Game3D {
    constructor(options) {
        this.canvas = options.canvas;
        this.onCollision = options.onCollision;
        this.gameObjects = [];
        this.lastSpawnZ = 0;
        this.currentZone = 'aurora';
        this.zoneLength = 2000;
        this.trailPoints = [];
    }

    async init() {
        this.scene = new THREE.Scene();
        
        // OPRAVA: Vylepšené nastavení kamery s lepším near/far plane
        this.camera = new THREE.PerspectiveCamera(
            75,                                    // FOV
            window.innerWidth / window.innerHeight, // aspect
            0.5,                                   // near plane (blíž k objektům)
            500                                    // far plane (dále pro lepší vykreslování)
        );
        
        this.clock = new THREE.Clock();
        this.playerCollider = new THREE.Box3();
        this.obstacleCollider = new THREE.Box3();

        try {
            this.renderer = new THREE.WebGLRenderer({ 
                canvas: this.canvas, 
                antialias: true, 
                alpha: true, 
                powerPreference: "high-performance" 
            });
            if (this.renderer.getContext() === null) throw new Error("Nepodařilo se získat WebGL kontext.");
        } catch (e) {
            throw new Error(`Selhání inicializace WebGL Rendereru: ${e.message}`);
        }

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
        
        // OPRAVA: Zapnout depth testing pro správné vykreslování
        this.renderer.sortObjects = true;

        this.setupPostProcessing();
        this.setupWorld();
        this.setupSuperJumpTrail();
    }
    
    setupPostProcessing() {
        const composer = new EffectComposer(this.renderer);
        composer.addPass(new RenderPass(this.scene, this.camera));

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight), 
            1.0,  // strength
            0.6,  // radius  
            0.1   // threshold
        );
        composer.addPass(bloomPass);

        const customShader = {
            uniforms: { "tDiffuse": { value: null }, "vignette": { value: 0.85 } },
            vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
            fragmentShader: `uniform sampler2D tDiffuse; uniform float vignette; varying vec2 vUv; void main() { vec4 color = texture2D( tDiffuse, vUv ); float vig = 1.0 - smoothstep(0.0, vignette, length(vUv - 0.5)); gl_FragColor = color * vig; }`
        };

        const shaderPass = new ShaderPass(customShader);
        composer.addPass(shaderPass);
        this.composer = composer;
    }

    setupWorld() {
        this.player = new Player();
        this.player.mesh.frustumCulled = false;
        
        this.environment = new Environment();
        this.objectFactory = new GameObjectFactory();
        
        // OPRAVA: Upravené osvětlení a mlha
        this.scene.fog = new THREE.Fog(0x050810, 20, 120);
        this.ambientLight = new THREE.AmbientLight(0x081030, 2.0);
        this.scene.add(this.ambientLight);
        
        // OPRAVA: Hráč na Y=0 (střed tunelu)
        this.player.mesh.position.set(0, 0, 0);
        this.scene.add(this.player.mesh);
        this.player.mesh.visible = false;
        
        this.scene.add(this.environment.tunnel);
        this.scene.add(this.environment.tunnelWireframe);
        this.scene.add(this.environment.floor);
        this.scene.add(this.environment.dustParticles);
        this.scene.add(this.environment.lightRings);
        
        this.shield = this.objectFactory.createShield();
        this.player.mesh.add(this.shield);

        // OPRAVA: Vylepšené osvětlení
        this.keyLight = new THREE.SpotLight(0x88aaff, 1.5, 80, Math.PI / 4, 0.6);
        this.scene.add(this.keyLight);
        this.scene.add(this.keyLight.target);

        // Přidat ještě fill light
        this.fillLight = new THREE.DirectionalLight(0x4466aa, 0.3);
        this.fillLight.position.set(-10, 5, 10);
        this.scene.add(this.fillLight);
    }

    setupSuperJumpTrail() {
        const trailMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00BFFF, 
            transparent: true, 
            opacity: 0.6, 
            side: THREE.DoubleSide, 
            blending: THREE.AdditiveBlending 
        });
        const trailGeometry = new THREE.BufferGeometry();
        this.trail = new THREE.Mesh(trailGeometry, trailMaterial);
        this.trail.frustumCulled = false;
        this.trail.visible = false;
        this.scene.add(this.trail);
    }
    
    reset() {
        [...this.gameObjects].forEach(o => this.scene.remove(o.mesh));
        this.gameObjects = [];
        this.lastSpawnZ = 0;
        
        // OPRAVA: Hráč přesně na střed tunelu (Y=0)
        this.player.mesh.position.set(0, 0, 0);
        this.player.mesh.visible = true;
        this.player.mesh.rotation.set(0, 0, 0);
        this.currentZone = 'aurora';
        this.environment.setZone(this.currentZone, this.scene, this.ambientLight);

        this.trail.geometry.setIndex([]);
        this.trail.geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));

        // OPRAVA: Kamera na správné pozici - sleduje střed tunelu
        this.camera.position.set(0, 2, 12);  // Mírně nad středem tunelu
        this.camera.lookAt(0, 0, 0);
    }
    
    updateMenuBackground(delta) {
        this.camera.position.z -= delta * 5;
        this.camera.position.x = Math.sin(Date.now() * 0.0001) * 3;
        this.camera.position.y = 1 + Math.cos(Date.now() * 0.0002) * 1.5; // Menší výkyvy
        this.camera.rotation.y = Math.sin(Date.now() * 0.0001) * 0.05;
        
        this.environment.update(delta * 5, this.camera.position, this.clock.getElapsedTime());
        this.composer.render();
    }
    
    update(gameState, targetX, delta) {
        const totalTime = this.clock.getElapsedTime();

        // OPRAVA: Y pozice hráče omezena na střed tunelu (-8 až +8)
        let clampedY = Math.max(-8, Math.min(8, gameState.playerY));
        this.player.mesh.position.y = clampedY;
        
        this.player.mesh.position.x += (targetX - this.player.mesh.position.x) * 0.15;
        this.player.update(delta);

        if (gameState.isDoingSuperJump) {
            this.updateSuperJumpEffect(delta);
        } else {
            this.player.mesh.scale.y += (1 - this.player.mesh.scale.y) * 0.2;
            this.trail.visible = false;
            this.trailPoints = [];
        }

        const moveZ = gameState.speed * delta * (gameState.isDashing ? 3 : 1);
        this.player.mesh.position.z -= moveZ;
        
        const distance = Math.abs(this.player.mesh.position.z);
        const zoneIndex = Math.floor(distance / this.zoneLength) % 3;
        const zones = ['aurora', 'sunset', 'matrix'];
        const newZone = zones[zoneIndex];

        if (newZone !== this.currentZone) {
            this.currentZone = newZone;
            this.environment.setZone(this.currentZone, this.scene, this.ambientLight);
        }

        this.lastSpawnZ += moveZ;
        if (this.lastSpawnZ > (350 / gameState.speed)) {
            this.spawnObject();
            this.lastSpawnZ = 0;
        }
        
        if (gameState.invincibilityTimer > 0) {
            this.player.mesh.visible = Math.floor(Date.now() / 100) % 2 === 0;
        } else {
            this.player.mesh.visible = true;
        }

        this.shield.visible = gameState.hasShield;
        if (this.shield.visible) {
            this.shield.rotation.y += delta * 2;
            this.shield.rotation.x += delta;
        }
        
        this.environment.update(moveZ, this.player.mesh.position, totalTime);
        this.updateGameObjects(delta);
        this.checkCollisions();
        this.cleanupObjects(gameState);
        this.updateCameraAndLights(delta);
        
        this.composer.render();
    }

    updateSuperJumpEffect() {
        this.player.mesh.scale.y += (2.2 - this.player.mesh.scale.y) * 0.1;
        this.trail.visible = true;

        const trailLength = 15;
        this.trailPoints.push(this.player.mesh.position.clone());
        if (this.trailPoints.length > trailLength) this.trailPoints.shift();
        if (this.trailPoints.length < 2) return;

        const vertices = [];
        const indices = [];
        const width = 0.4;

        for (let i = 0; i < this.trailPoints.length; i++) {
            const p = this.trailPoints[i];
            const p1 = p.clone().add(new THREE.Vector3(width / 2, 0, 0));
            const p2 = p.clone().add(new THREE.Vector3(-width / 2, 0, 0));
            vertices.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
        }
        
        for (let i = 0; i < this.trailPoints.length - 1; i++) {
            const i2 = i * 2;
            indices.push(i2, i2 + 1, i2 + 2, i2 + 1, i2 + 3, i2 + 2);
        }

        this.trail.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        this.trail.geometry.setIndex(indices);
    }
    
    updateGameObjects(delta) {
        for (const obj of this.gameObjects) {
            if (obj.movement) {
                obj.mesh.position.x += obj.movement.speed * delta * obj.movement.direction;
                if (Math.abs(obj.mesh.position.x) > LANE_WIDTH) {
                    obj.movement.direction *= -1;
                }
            }

            if (obj.type === 'collectible' && obj.mesh.userData.rotationSpeed) {
                obj.mesh.rotation.y += obj.mesh.userData.rotationSpeed * delta;
            }
        }
    }

    // OPRAVA: Kamera přesně sleduje střed tunelu
    updateCameraAndLights(delta) {
        const playerPos = this.player.mesh.position;
        
        // Kamera sleduje hráče, ale zůstává ve středu tunelu (Y kolem 0-3)
        this.camera.position.x += (playerPos.x * 0.3 - this.camera.position.x) * 0.08;
        this.camera.position.y += ((playerPos.y * 0.2 + 2) - this.camera.position.y) * 0.08;
        this.camera.position.z = playerPos.z + 12;
        
        // Kamera se dívá mírně před hráče
        this.camera.lookAt(playerPos.x * 0.2, playerPos.y * 0.1, playerPos.z - 5);
        
        // Osvětlení sleduje hráče
        this.keyLight.position.set(playerPos.x + 3, playerPos.y + 8, playerPos.z + 8);
        this.keyLight.target.position.copy(playerPos);
        this.keyLight.target.updateMatrixWorld();
        
        // Fill light
        this.fillLight.position.set(playerPos.x - 5, playerPos.y + 3, playerPos.z + 15);
    }

    triggerShieldBreakEffect() {
        if (!this.shield) return;

        const initialScale = 1;
        this.shield.scale.set(initialScale, initialScale, initialScale);
        let scale = initialScale;

        const animate = () => {
            scale += 0.4;
            this.shield.scale.set(scale, scale, scale);
            this.shield.material.opacity -= 0.08;

            if (this.shield.material.opacity > 0) requestAnimationFrame(animate);
            else {
                this.shield.scale.set(initialScale, initialScale, initialScale);
                this.shield.material.opacity = 0.4;
            }
        };

        animate();
    }

    spawnObject() { 
        const rand = Math.random();
        const zPos = this.player.mesh.position.z - 160;
        let newObject;

        if (rand < 0.50) {
            newObject = this.objectFactory.createObstacle(zPos);
        } else if (rand < 0.80) {
            newObject = this.objectFactory.createCollectible(zPos);
        } else if (rand < 0.90) {
            newObject = this.objectFactory.createPowerup('speed', zPos);
        } else if (rand < 0.97) {
            newObject = this.objectFactory.createPowerup('shield', zPos);
        } else {
            newObject = this.objectFactory.createPowerup('life', zPos);
        }
        
        if (newObject.mesh) {
            this.scene.add(newObject.mesh);
            this.gameObjects.push(newObject);
        }
    }
    
    checkCollisions() {
        if (!this.player.mesh.visible) return;

        const colliderSize = new THREE.Vector3(0.8, 0.8, 0.8);
        this.playerCollider.setFromCenterAndSize(this.player.mesh.position, colliderSize);

        for (let i = this.gameObjects.length - 1; i >= 0; i--) {
            const obj = this.gameObjects[i];
            if (!obj.mesh || !obj.mesh.visible || Math.abs(obj.mesh.position.z - this.player.mesh.position.z) > 5) continue;
            
            this.obstacleCollider.setFromObject(obj.mesh);
            if (this.playerCollider.intersectsBox(this.obstacleCollider)) {
                this.onCollision(obj.type, i);
            }
        }
    }
    
    cleanupObjects(gameState) {
        for (let i = this.gameObjects.length - 1; i >= 0; i--) {
            const obj = this.gameObjects[i];
            if (obj.mesh && obj.mesh.position.z > this.camera.position.z + 15) {
                this.scene.remove(obj.mesh);

                obj.mesh.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) child.material.forEach(mat => mat.dispose());
                        else child.material.dispose();
                    }
                });

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
