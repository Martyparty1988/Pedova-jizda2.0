import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { EffectComposer } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/ShaderPass.js';

// Import nových modulů
import { Player } from './player.js';
import { Environment } from './environment.js';
import { GameObjectFactory } from './gameObjectFactory.js';

const LANE_WIDTH = 4;

/**
 * Hlavní třída pro správu 3D scény a herních objektů.
 */
class Game3D {
    constructor(options) {
        this.canvas = options.canvas;
        this.onCollision = options.onCollision;
        this.gameObjects = [];
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
        // Inicializace pomocných tříd
        this.player = new Player();
        this.environment = new Environment();
        this.objectFactory = new GameObjectFactory();
        
        // Nastavení scény
        this.scene.fog = new THREE.Fog(0x101015, 15, 80);
        this.ambientLight = new THREE.AmbientLight(0x404040, 2.5);
        this.scene.add(this.ambientLight);

        // Přidání objektů do scény
        this.scene.add(this.player.mesh);
        this.scene.add(this.environment.tunnel);
        this.scene.add(this.environment.floor);
        this.scene.add(this.environment.dustParticles);
        
        this.shield = this.objectFactory.createShield();
        this.player.mesh.add(this.shield);

        // Světla
        this.keyLight = new THREE.SpotLight(0xffffff, 2.0, 100, Math.PI / 3.5, 0.8);
        this.scene.add(this.keyLight);
        this.scene.add(this.keyLight.target);
    }
    
    reset() {
        [...this.gameObjects].forEach(o => this.scene.remove(o.mesh));
        this.gameObjects = [];
        this.lastSpawnZ = 0;
        this.player.mesh.position.set(0, -0.6, 0);
        this.player.mesh.visible = true;
        this.camera.position.set(0, 4, 10);
    }
    
    update(gameState, targetX, delta) {
        // Pohyb hráče
        this.player.mesh.position.y = gameState.playerY;
        this.player.mesh.position.x += (targetX - this.player.mesh.position.x) * 0.15;
        this.player.mesh.rotation.y = (this.player.mesh.position.x - targetX) * -0.1;
        this.player.update(); // Aktualizace efektů hráče

        const moveZ = gameState.speed * delta * (gameState.isDashing ? 3 : 1);
        this.player.mesh.position.z -= moveZ;
        
        // Spawn nových objektů
        this.lastSpawnZ += moveZ;
        if (this.lastSpawnZ > (600 / gameState.speed)) {
            this.spawnObject();
            this.lastSpawnZ = 0;
        }
        
        // Update vizuálních stavů (nesmrtelnost, štít)
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

        // Update ostatních součástí
        this.environment.update(moveZ);
        this.updateGameObjects(delta);
        this.checkCollisions(gameState);
        this.cleanupObjects(gameState);
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
        
        this.keyLight.position.set(playerPos.x, playerPos.y + 5, playerPos.z + 5);
        this.keyLight.target.position.set(playerPos.x, playerPos.y, playerPos.z - 50);
        this.keyLight.target.updateMatrixWorld();

        const zone = Math.floor(Math.abs(playerPos.z) / 200) % 3;
        const colors = [0x404040, 0x401010, 0x104010];
        this.ambientLight.color.setHex(colors[zone]);
    }

    triggerShieldBreakEffect() {
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
        const rand = Math.random();
        const zPos = this.player.mesh.position.z - 150;
        let newObject;

        if (rand < 0.75) {
            newObject = this.objectFactory.createObstacle(zPos);
        } else if (rand < 0.9) {
            newObject = this.objectFactory.createPowerup('speed', zPos);
        } else {
            newObject = this.objectFactory.createPowerup('shield', zPos);
        }
        
        this.scene.add(newObject.mesh);
        this.gameObjects.push(newObject);
    }
    
    checkCollisions(gameState) {
        if (!this.player.mesh.visible) return;
        this.playerCollider.setFromObject(this.player.mesh);

        for (let i = this.gameObjects.length - 1; i >= 0; i--) {
            const obj = this.gameObjects[i];
            if (!obj.mesh.visible || Math.abs(obj.mesh.position.z - this.player.mesh.position.z) > 4) continue;
            
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

