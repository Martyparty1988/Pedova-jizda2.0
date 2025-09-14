import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { EffectComposer } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/ShaderPass.js';

import { Player } from './player.js';
import { Environment } from './environment.js';
import { GameObjectFactory } from './gameObjectFactory.js';

const LANE_WIDTH = 4;

class Game3D {
    constructor(options) {
        this.canvas = options.canvas;
        this.onCollision = options.onCollision;
        this.gameObjects = [];
        this.lastSpawnZ = 0;
        this.currentZone = 'aurora';
        this.zoneLength = 2000;
        this.effects = {
            dashParticles: [],
            flipTrail: []
        };
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
        // ... (beze změny)
// ... existing code ...
        const composer = new EffectComposer(this.renderer);
        composer.addPass(new RenderPass(this.scene, this.camera));
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.8, 0.1);
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
        this.player = new Player();
        this.environment = new Environment();
        this.objectFactory = new GameObjectFactory();
        
        this.scene.fog = new THREE.Fog(0x050810, 15, 80);
        this.ambientLight = new THREE.AmbientLight(0x080820, 2.5);
        this.scene.add(this.ambientLight);

        this.scene.add(this.player.mesh);
        this.player.mesh.visible = false;
        
        this.scene.add(this.environment.tunnel);
        this.scene.add(this.environment.floor);
        this.scene.add(this.environment.dustParticles);
        this.scene.add(this.environment.lightRings);
        
        this.shield = this.objectFactory.createShield();
        this.player.mesh.add(this.shield);

        this.keyLight = new THREE.SpotLight(0xffffff, 2.0, 100, Math.PI / 3.5, 0.8);
        this.scene.add(this.keyLight);
        this.scene.add(this.keyLight.target);
    }
    
    reset() {
        // ... (beze změny)
// ... existing code ...
        [...this.gameObjects].forEach(o => this.scene.remove(o.mesh));
        this.gameObjects = [];
        this.lastSpawnZ = 0;
        this.player.mesh.position.set(0, 0, 0);
        this.player.mesh.visible = true;
        this.camera.position.set(0, 4, 10);
        this.player.mesh.rotation.set(0, 0, 0);
        this.player.trickRotation = 0;
        this.player.frontFlipRotation = 0;
        this.currentZone = 'aurora';
        this.environment.setZone(this.currentZone, this.scene, this.ambientLight);
    }
    
    updateMenuBackground(delta) {
        // ... (beze změny)
// ... existing code ...
        this.camera.position.z -= delta * 5;
        this.camera.position.x = Math.sin(Date.now() * 0.0001) * 5;
        this.camera.position.y = 2 + Math.cos(Date.now() * 0.0002) * 2;
        this.camera.rotation.y = Math.sin(Date.now() * 0.0001) * 0.1;
        
        this.environment.update(delta * 5, this.camera.position);
        this.composer.render();
    }
    
    update(gameState, targetX, delta) {
        this.player.mesh.position.y = gameState.playerY;
        this.player.mesh.position.x += (targetX - this.player.mesh.position.x) * 0.15;
        
        if (!gameState.isDoingFrontFlip) {
            this.player.mesh.rotation.z = (this.player.mesh.position.x - targetX) * 0.1;
        }
        this.player.update(delta, gameState.isDashing);

        // Animace triku (barrel roll)
        if (gameState.isDoingTrick) {
            const rotationSpeed = 15;
            this.player.trickRotation += rotationSpeed * delta;
            this.player.mesh.rotation.y = this.player.trickRotation; // Změna na Y osu pro boční postoj
            if (this.player.trickRotation >= Math.PI * 2) {
                this.player.trickRotation = 0;
                this.player.mesh.rotation.y = 0;
                gameState.isDoingTrick = false;
            }
        }
        
        // VYLEPŠENÍ: Animace salta se světelnou stopou
        if (gameState.isDoingFrontFlip) {
            const rotationSpeed = 10;
            this.player.frontFlipRotation += rotationSpeed * delta;
            this.player.mesh.rotation.z = -this.player.frontFlipRotation; // Změna na Z osu
            
            // Přidání části stopy
            this.spawnFlipTrailPart();

            if (this.player.frontFlipRotation >= Math.PI * 2 && gameState.playerY <= 0.1) {
                this.player.frontFlipRotation = 0;
                this.player.mesh.rotation.z = 0;
                gameState.isDoingFrontFlip = false;
            }
        }

        const moveZ = gameState.speed * delta * (gameState.isDashing ? 2.5 : 1);
        this.player.mesh.position.z -= moveZ;
        
        // ... (zbytek logiky zón beze změny)
// ... existing code ...
        const distance = Math.abs(this.player.mesh.position.z);
        const zoneIndex = Math.floor(distance / this.zoneLength) % 3;
        const zones = ['aurora', 'sunset', 'matrix'];
        const newZone = zones[zoneIndex];

        if (newZone !== this.currentZone) {
            this.currentZone = newZone;
            this.environment.setZone(this.currentZone, this.scene, this.ambientLight);
        }

        this.lastSpawnZ += moveZ;
        if (this.lastSpawnZ > (600 / gameState.speed)) {
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
            this.shield.rotation.y += delta;
            this.shield.rotation.x += delta * 0.5;
        }

        // VYLEPŠENÍ: Efekt jisker při skluzu
        if (gameState.isDashing) {
            this.spawnDashParticles();
        }

        this.environment.update(moveZ, this.player.mesh.position);
        this.updateGameObjects(delta);
        this.updateEffects(delta);
        this.checkCollisions(gameState);
        this.cleanupObjects(gameState);
        this.updateCameraAndLights();
        
        this.composer.render();
    }
    
    // VYLEPŠENÍ: Nové funkce pro správu efektů
    spawnDashParticles() {
        const particleCount = 2;
        const wheelPositions = [-0.5, 0.5]; // Z pozice kol

        for (let i = 0; i < particleCount; i++) {
            const geo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
            const mat = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
            const particle = new THREE.Mesh(geo, mat);
            
            const playerPos = this.player.mesh.position;
            const wheelZ = wheelPositions[i % 2];
            
            particle.position.set(
                playerPos.x,
                playerPos.y + 0.1, // Lehce nad zemí
                playerPos.z + wheelZ
            );
            
            particle.userData.life = 0.3; // Doba života v sekundách
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                Math.random() * 3 + 2 // Směrem dozadu
            );
            
            this.scene.add(particle);
            this.effects.dashParticles.push(particle);
        }
    }

    spawnFlipTrailPart() {
        const geo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const mat = new THREE.MeshBasicMaterial({ 
            color: 0x8A2BE2, 
            transparent: true, 
            opacity: 0.8,
            blending: THREE.AdditiveBlending 
        });
        const part = new THREE.Mesh(geo, mat);
        part.position.copy(this.player.mesh.position);
        part.userData.life = 0.5;
        this.scene.add(part);
        this.effects.flipTrail.push(part);
    }
    
    updateEffects(delta) {
        // Aktualizace jisker
        for (let i = this.effects.dashParticles.length - 1; i >= 0; i--) {
            const p = this.effects.dashParticles[i];
            p.userData.life -= delta;
            if (p.userData.life <= 0) {
                this.scene.remove(p);
                this.effects.dashParticles.splice(i, 1);
            } else {
                p.position.add(p.userData.velocity.clone().multiplyScalar(delta));
                p.scale.multiplyScalar(1 - delta * 3);
            }
        }
        // Aktualizace stopy salta
        for (let i = this.effects.flipTrail.length - 1; i >= 0; i--) {
            const p = this.effects.flipTrail[i];
            p.userData.life -= delta;
            if (p.userData.life <= 0) {
                this.scene.remove(p);
                this.effects.flipTrail.splice(i, 1);
            } else {
                p.material.opacity = p.userData.life / 0.5;
            }
        }
    }

    updateGameObjects(delta) {
        // ... (beze změny)
// ... existing code ...
        for (const obj of this.gameObjects) {
            if (obj.movement) {
                obj.mesh.position.x += obj.movement.speed * delta * obj.movement.direction;
                if (Math.abs(obj.mesh.position.x) > LANE_WIDTH) {
                    obj.movement.direction *= -1;
                }
            }
        }
    }

    updateCameraAndLights() {
        // ... (beze změny)
// ... existing code ...
        const playerPos = this.player.mesh.position;
        this.camera.position.x += (playerPos.x * 0.5 - this.camera.position.x) * 0.1;
        this.camera.position.y += (playerPos.y + 3 - this.camera.position.y) * 0.1;
        this.camera.position.z = playerPos.z + 10;
        
        this.keyLight.position.set(playerPos.x, playerPos.y + 5, playerPos.z + 5);
        this.keyLight.target.position.set(playerPos.x, playerPos.y, playerPos.z - 50);
        this.keyLight.target.updateMatrixWorld();
    }

    triggerShieldBreakEffect() {
        // ... (beze změny)
// ... existing code ...
        if (!this.shield) return;
        const initialScale = 1;
        this.shield.scale.set(initialScale, initialScale, initialScale);
        let scale = initialScale;
        const animate = () => {
            scale += 0.5;
            this.shield.scale.set(scale, scale, scale);
            this.shield.material.opacity -= 0.1;
            if (this.shield.material.opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                this.shield.scale.set(initialScale, initialScale, initialScale);
                this.shield.material.opacity = 0.3;
            }
        };
        animate();
    }

    spawnObject() { 
        // ... (beze změny)
// ... existing code ...
        const rand = Math.random();
        const zPos = this.player.mesh.position.z - 150;
        let newObject;

        if (rand < 0.70) {
            newObject = this.objectFactory.createObstacle(zPos);
        } else if (rand < 0.85) {
            newObject = this.objectFactory.createPowerup('speed', zPos);
        } else if (rand < 0.95) {
            newObject = this.objectFactory.createPowerup('shield', zPos);
        } else {
            newObject = this.objectFactory.createPowerup('life', zPos);
        }
        
        if (newObject.mesh) {
            this.scene.add(newObject.mesh);
            this.gameObjects.push(newObject);
        }
    }
    
    checkCollisions(gameState) {
        // ... (beze změny)
// ... existing code ...
        if (!this.player.mesh.visible) return;
        this.playerCollider.setFromObject(this.player.mesh);

        for (let i = this.gameObjects.length - 1; i >= 0; i--) {
            const obj = this.gameObjects[i];
            if (!obj.mesh || !obj.mesh.visible || Math.abs(obj.mesh.position.z - this.player.mesh.position.z) > 4) continue;
            
            this.obstacleCollider.setFromObject(obj.mesh);
            if (this.playerCollider.intersectsBox(this.obstacleCollider)) {
                this.onCollision(obj.type, i);
            }
        }
    }
    
    cleanupObjects(gameState) {
        // ... (beze změny)
// ... existing code ...
        for (let i = this.gameObjects.length - 1; i >= 0; i--) {
            const obj = this.gameObjects[i];
            if (obj.mesh && obj.mesh.position.z > this.camera.position.z + 10) {
                this.scene.remove(obj.mesh);
                obj.mesh.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
                if (obj.type === 'obstacle') gameState.runStats.obstaclesDodged++;
                this.gameObjects.splice(i, 1);
            }
        }
    }

    onWindowResize() {
        // ... (beze změny)
// ... existing code ...
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }
}

export { Game3D };
