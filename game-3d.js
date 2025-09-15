import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { EffectComposer } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/UnrealBloomPass.js';
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
    }

    async init() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
        this.camera.position.set(0, 4, 10);
        this.clock = new THREE.Clock();
        this.playerCollider = new THREE.Box3();
        this.obstacleCollider = new THREE.Box3();
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
        this.setupPostProcessing();
        this.setupWorld();
    }
    
    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        // ZMĚNA: Upraveny parametry Bloom efektu pro ostřejší a čistší vzhled
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.2, 0.6, 0.85);
        this.composer.addPass(bloomPass);
    }

    setupWorld() {
        this.player = new Player();
        this.environment = new Environment();
        this.objectFactory = new GameObjectFactory();
        
        this.scene.fog = new THREE.Fog(0x0D0E1B, 15, 80);
        this.ambientLight = new THREE.AmbientLight(0x10122B, 2.5);
        this.scene.add(this.ambientLight);

        this.scene.add(this.player.mesh);
        this.player.mesh.visible = false;
        
        this.scene.add(this.environment.tunnel, this.environment.floor, this.environment.dustParticles, this.environment.lightRings);
        
        this.shield = this.objectFactory.createShield();
        this.player.mesh.add(this.shield);

        this.keyLight = new THREE.SpotLight(0xffffff, 2.0, 100, Math.PI / 3.5, 0.8);
        this.scene.add(this.keyLight, this.keyLight.target);
    }
    
    reset() {
        this.gameObjects.forEach(o => this.scene.remove(o.mesh));
        this.gameObjects = [];
        this.lastSpawnZ = 0;
        this.player.mesh.position.set(0, 0, 0);
        this.player.mesh.visible = true;
        this.camera.position.set(0, 4, 10);
        this.camera.rotation.set(0, 0, 0);
        this.player.mesh.rotation.set(0, 0, 0);
        this.player.trickRotation = 0;
        this.player.frontFlipRotation = 0;
        this.currentZone = 'aurora';
        this.environment.setZone(this.currentZone, this.scene, this.ambientLight);
    }
    
    // ZMĚNA: Přepracovaná funkce pro plynulejší pohyb a přidání osvětlení
    updateMenuBackground(delta) {
        this.camera.position.z -= delta * 2;
        this.camera.rotation.y += delta * 0.05;
        this.camera.position.y = 2 + Math.sin(Date.now() * 0.0002) * 2;
        
        // ZMĚNA: Hlavní světlo nyní sleduje kameru i v menu
        const camPos = this.camera.position;
        this.keyLight.position.set(camPos.x, camPos.y + 3, camPos.z + 5);
        this.keyLight.target.position.set(camPos.x, camPos.y, camPos.z - 50);
        this.keyLight.target.updateMatrixWorld();
        
        this.environment.update(delta * 2, this.camera.position);
        this.composer.render();
    }
    
    update(gameState, targetX, delta) {
        this.player.mesh.position.y = gameState.playerY;
        this.player.mesh.position.x += (targetX - this.player.mesh.position.x) * 0.15;
        if (!gameState.isDoingFrontFlip) {
            this.player.mesh.rotation.y = (this.player.mesh.position.x - targetX) * -0.1;
        }
        this.player.update();

        if (gameState.isDoingTrick) {
            this.player.trickRotation += 15 * delta;
            this.player.mesh.rotation.z = this.player.trickRotation;
            if (this.player.trickRotation >= Math.PI * 2) {
                this.player.trickRotation = 0;
                this.player.mesh.rotation.z = 0;
                gameState.isDoingTrick = false;
            }
        }
        
        if (gameState.isDoingFrontFlip) {
            this.player.frontFlipRotation += 10 * delta;
            this.player.mesh.rotation.x = this.player.frontFlipRotation;
            if (this.player.frontFlipRotation >= Math.PI * 2 && gameState.playerY <= -0.6) {
                this.player.frontFlipRotation = 0;
                this.player.mesh.rotation.x = 0;
                gameState.isDoingFrontFlip = false;
            }
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

        if (gameState.isDashing) this.player.activateBoost();
        else this.player.deactivateBoost();

        this.environment.update(moveZ, this.player.mesh.position);
        this.updateGameObjects(delta);
        this.checkCollisions(gameState);
        this.cleanupObjects();
        this.updateCameraAndLights();
        
        this.composer.render();
    }
    
    updateGameObjects(delta) {
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
        const playerPos = this.player.mesh.position;
        this.camera.position.x += (playerPos.x * 0.5 - this.camera.position.x) * 0.1;
        this.camera.position.y += (playerPos.y + 3 - this.camera.position.y) * 0.1;
        this.camera.position.z = playerPos.z + 10;
        
        this.camera.lookAt(playerPos.x, playerPos.y, playerPos.z - 20);

        this.keyLight.position.set(playerPos.x, playerPos.y + 5, playerPos.z + 5);
        this.keyLight.target.position.set(playerPos.x, playerPos.y, playerPos.z - 50);
        this.keyLight.target.updateMatrixWorld();
    }

    triggerShieldBreakEffect() {
        if (!this.shield) return;
        let scale = 1;
        const animate = () => {
            scale += 0.5;
            this.shield.scale.set(scale, scale, scale);
            this.shield.material.opacity -= 0.1;
            if (this.shield.material.opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                this.shield.scale.set(1, 1, 1);
                this.shield.material.opacity = 0.3;
            }
        };
        animate();
    }

    spawnObject() { 
        const rand = Math.random();
        const zPos = this.player.mesh.position.z - 150;
        let newObject;

        if (rand < 0.70) newObject = this.objectFactory.createObstacle(zPos);
        else if (rand < 0.85) newObject = this.objectFactory.createPowerup('speed', zPos);
        else if (rand < 0.95) newObject = this.objectFactory.createPowerup('shield', zPos);
        else newObject = this.objectFactory.createPowerup('life', zPos);
        
        if (newObject.mesh) {
            this.scene.add(newObject.mesh);
            this.gameObjects.push(newObject);
        }
    }
    
    checkCollisions(gameState) {
        if (!this.player.mesh.visible) return;
        this.playerCollider.setFromObject(this.player.mesh);

        for (let i = this.gameObjects.length - 1; i >= 0; i--) {
            const obj = this.gameObjects[i];
            if (!obj.mesh || !obj.mesh.visible) continue;
            
            this.obstacleCollider.setFromObject(obj.mesh);
            if (this.playerCollider.intersectsBox(this.obstacleCollider)) {
                this.onCollision(obj.type, i);
                break;
            }
        }
    }
    
    cleanupObjects() {
        for (let i = this.gameObjects.length - 1; i >= 0; i--) {
            const obj = this.gameObjects[i];
            if (obj.mesh && obj.mesh.position.z > this.camera.position.z + 10) {
                this.scene.remove(obj.mesh);
                obj.mesh.traverse(child => {
                    if (child.isMesh) {
                        child.geometry.dispose();
                        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                        else if(child.material) child.material.dispose();
                    }
                });
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
