import * as THREE from ‘https://cdn.skypack.dev/three@0.132.2’;
import { EffectComposer } from ‘https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/EffectComposer.js’;
import { RenderPass } from ‘https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/RenderPass.js’;
import { UnrealBloomPass } from ‘https://cdn.skypack.dev/three@0.132.2/examples/jsm/postprocessing/UnrealBloomPass.js’;
import { Player } from ‘./player.js’;
import { Environment } from ‘./environment.js’;
import { GameObjectFactory } from ‘./gameObjectFactory.js’;

const LANE_WIDTH = 4;
const MAX_DELTA = 0.05;

export class Game3D {
constructor(options) {
this.canvas = options.canvas;
this.onCollision = options.onCollision;
this.gameObjects = [];
this.lastSpawnZ = 0;
this.currentZone = ‘aurora’;
this.zoneLength = 2000;
this.isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
|| (navigator.platform === ‘MacIntel’ && navigator.maxTouchPoints > 1);
}

```
async init() {
    const { width, height } = this.getViewportSize();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 220);
    this.camera.position.set(0, 4, 10);
    this.clock = new THREE.Clock();
    this.playerCollider = new THREE.Box3();
    this.obstacleCollider = new THREE.Box3();
    this.playerColliderCenter = new THREE.Vector3();
    this.playerColliderSize = new THREE.Vector3(1.05, 2.1, 1.05);

    this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: !this.isMobile,
        alpha: true,
        powerPreference: 'high-performance'
    });
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.setClearColor(0x000000, 0);

    this.setupPostProcessing();
    this.syncRenderResolution();
    this.setupWorld();
    this.setupRuntimeViewportListeners();
}

setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    const { width, height } = this.getViewportSize();
    // ZMĚNA: Silnější bloom pro lepší neonový glow efekt
    const strength = this.isMobile ? 0.85 : 1.1;
    const radius = this.isMobile ? 0.35 : 0.45;
    const threshold = 0.75;
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), strength, radius, threshold);
    this.composer.addPass(this.bloomPass);
}

setupWorld() {
    this.player = new Player();
    this.environment = new Environment({ mobile: this.isMobile });
    this.objectFactory = new GameObjectFactory();
    
    // ZMĚNA: Mlha začíná dál – vidíme více tunelu do hloubky
    this.scene.fog = new THREE.Fog(0x0D0E1B, 80, 180);
    this.ambientLight = new THREE.AmbientLight(0x50609F, 3.4);
    this.scene.add(this.ambientLight);

    this.scene.add(this.player.mesh);
    this.player.mesh.visible = false;
    
    this.scene.add(
        this.environment.tunnel,
        this.environment.floor,
        this.environment.dustParticles,
        this.environment.lightRings,
        this.environment.speedLines,   // NOVÉ: rychlostní pruhy podél tunelu
        this.environment.innerGlow     // NOVÉ: vnitřní atmospherická záře
    );
    
    this.shield = this.objectFactory.createShield();
    this.player.mesh.add(this.shield);

    this.keyLight = new THREE.SpotLight(0xffffff, 2.0, 100, Math.PI / 3.5, 0.8);
    this.scene.add(this.keyLight, this.keyLight.target);
}

reset() {
    this.gameObjects.forEach(o => this.disposeObject(o.mesh));
    this.gameObjects = [];
    this.lastSpawnZ = 0;

    this.player.mesh.position.set(0, -0.6, 0);
    this.player.mesh.visible = true;
    this.player.mesh.rotation.set(0.1, 0, 0);
    this.player.trickRotation = 0;
    this.player.frontFlipRotation = 0;

    this.camera.position.set(0, 4, 10);
    this.camera.rotation.set(0, 0, 0);

    this.currentZone = 'aurora';
    this.environment.setZone(this.currentZone, this.scene, this.ambientLight);
    this.clock.getDelta();
}

updateMenuBackground(delta) {
    const safeDelta = this.getSafeDelta(delta);
    if (!this.environment || !this.camera) return;

    this.camera.position.z -= safeDelta * 2;
    this.camera.rotation.y += safeDelta * 0.05;
    this.camera.position.y = 2 + Math.sin(Date.now() * 0.0002) * 2;
    
    const camPos = this.camera.position;
    this.keyLight.position.set(camPos.x, camPos.y + 3, camPos.z + 5);
    this.keyLight.target.position.set(camPos.x, camPos.y, camPos.z - 50);
    this.keyLight.target.updateMatrixWorld();
    
    this.environment.update(safeDelta * 2, this.camera.position);
    this.render();
}

update(gameState, targetX, delta) {
    const safeDelta = this.getSafeDelta(delta);
    if (!this.player?.mesh || !gameState) return;

    this.player.mesh.position.y = gameState.playerY;
    this.player.mesh.position.x += (targetX - this.player.mesh.position.x) * 0.18;

    if (!gameState.isDoingFrontFlip) {
        this.player.mesh.rotation.x = 0.1;
        this.player.mesh.rotation.y = (this.player.mesh.position.x - targetX) * -0.1;
    }

    this.player.update(safeDelta);

    if (gameState.isDoingTrick) {
        this.player.trickRotation += 15 * safeDelta;
        this.player.mesh.rotation.z = this.player.trickRotation;
        if (this.player.trickRotation >= Math.PI * 2) {
            this.player.trickRotation = 0;
            this.player.mesh.rotation.z = 0;
            gameState.isDoingTrick = false;
        }
    } else {
        this.player.mesh.rotation.z *= 0.85;
    }
    
    if (gameState.isDoingFrontFlip) {
        this.player.frontFlipRotation += 10 * safeDelta;
        this.player.mesh.rotation.x = 0.1 + this.player.frontFlipRotation;
        if (this.player.frontFlipRotation >= Math.PI * 2 && gameState.playerY <= -0.6) {
            this.player.frontFlipRotation = 0;
            this.player.mesh.rotation.x = 0.1;
            gameState.isDoingFrontFlip = false;
        }
    }

    const moveZ = gameState.speed * safeDelta * (gameState.isDashing ? 3 : 1);
    this.player.mesh.position.z -= moveZ;
    
    const distance = Math.abs(this.player.mesh.position.z);
    const zones = ['aurora', 'sunset', 'matrix'];
    const zoneIndex = Math.floor(distance / this.zoneLength) % zones.length;
    const newZone = zones[zoneIndex];

    if (newZone !== this.currentZone) {
        this.currentZone = newZone;
        this.environment.setZone(this.currentZone, this.scene, this.ambientLight);
    }

    const spawnThreshold = Math.max(22, 600 / Math.max(gameState.speed, 1));
    this.lastSpawnZ += moveZ;
    while (this.lastSpawnZ >= spawnThreshold) {
        this.spawnObject();
        this.lastSpawnZ -= spawnThreshold;
    }
    
    if (gameState.invincibilityTimer > 0) {
        this.player.mesh.visible = Math.floor(Date.now() / 100) % 2 === 0;
    } else {
        this.player.mesh.visible = true;
    }

    this.shield.visible = Boolean(gameState.hasShield);
    if (this.shield.visible) {
        this.shield.rotation.y += safeDelta;
        this.shield.rotation.x += safeDelta * 0.5;
    }

    if (gameState.isDashing) this.player.activateBoost();
    else this.player.deactivateBoost();

    this.environment.update(moveZ, this.player.mesh.position);
    this.updateGameObjects(safeDelta);
    this.checkCollisions();
    this.cleanupObjects();
    this.updateCameraAndLights();
    this.render();
}

updateGameObjects(delta) {
    for (const obj of this.gameObjects) {
        if (obj.movement) {
            obj.mesh.position.x += obj.movement.speed * delta * obj.movement.direction;
            if (Math.abs(obj.mesh.position.x) > LANE_WIDTH) {
                obj.movement.direction *= -1;
            }
        }

        if (obj.type?.startsWith('powerup') && obj.mesh.visible) {
            obj.mesh.rotation.y += delta * 2.5;
            obj.mesh.position.y = -0.35 + Math.sin(Date.now() * 0.004 + obj.mesh.position.z) * 0.12;
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
    
    if (newObject?.mesh) {
        this.scene.add(newObject.mesh);
        this.gameObjects.push(newObject);
    }
}

checkCollisions() {
    if (!this.player.mesh.visible) return;

    // Nepoužíváme setFromObject(player.mesh), protože hráč má jako child i štít.
    // I neviditelný velký štít umí zvětšit hitbox a způsobit falešné kolize.
    this.playerColliderCenter.set(
        this.player.mesh.position.x,
        this.player.mesh.position.y + 0.65,
        this.player.mesh.position.z
    );
    this.playerCollider.setFromCenterAndSize(this.playerColliderCenter, this.playerColliderSize);

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
        if (obj.mesh && obj.mesh.position.z > this.camera.position.z + 14) {
            this.disposeObject(obj.mesh);
            this.gameObjects.splice(i, 1);
        }
    }
}

disposeObject(mesh) {
    if (!mesh) return;
    this.scene?.remove(mesh);
    mesh.traverse?.(child => {
        if (!child.isMesh) return;
        child.geometry?.dispose?.();
        // Materiály tady nedisposujeme: část objektů používá sdílené materiály.
        // Jejich dispose by po pár uklizených překážkách rozbil nové překážky.
    });
}

getViewportSize() {
    const viewport = window.visualViewport;
    const fallbackWidth = this.canvas?.clientWidth || window.innerWidth || 1;
    const fallbackHeight = this.canvas?.clientHeight || window.innerHeight || 1;

    return {
        width: Math.max(1, Math.round(viewport?.width || fallbackWidth)),
        height: Math.max(1, Math.round(viewport?.height || fallbackHeight)),
    };
}

getPixelRatio() {
    const viewportScale = window.visualViewport?.scale || 1;
    const baseRatio = (window.devicePixelRatio || 1) * viewportScale;
    const maxPixelRatio = this.isMobile ? 2.2 : 2;
    return Math.max(1, Math.min(baseRatio, maxPixelRatio));
}

syncRenderResolution() {
    const pixelRatio = this.getPixelRatio();
    const { width, height } = this.getViewportSize();

    if (this.canvas) {
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
    }

    if (this.renderer) {
        this.renderer.setPixelRatio(pixelRatio);
        this.renderer.setSize(width, height, false);
    }

    if (this.composer) {
        if (typeof this.composer.setPixelRatio === 'function') this.composer.setPixelRatio(pixelRatio);
        this.composer.setSize(width, height);
    }
}

setupRuntimeViewportListeners() {
    if (this.viewportResizeHandler) return;

    this.viewportResizeHandler = () => {
        if (this.viewportResizeRaf) cancelAnimationFrame(this.viewportResizeRaf);
        this.viewportResizeRaf = requestAnimationFrame(() => this.onWindowResize());
    };

    window.addEventListener('resize', this.viewportResizeHandler);
    window.addEventListener('orientationchange', this.viewportResizeHandler);

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', this.viewportResizeHandler);
        window.visualViewport.addEventListener('scroll', this.viewportResizeHandler);
    }
}

onWindowResize() {
    if (!this.camera || !this.renderer) return;
    const { width, height } = this.getViewportSize();
    if (!width || !height) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.syncRenderResolution();
}

render() {
    if (this.composer) this.composer.render();
    else this.renderer?.render(this.scene, this.camera);
}

getSafeDelta(delta) {
    return Number.isFinite(delta) && delta > 0 ? Math.min(delta, MAX_DELTA) : 1 / 60;
}
```

}