import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { Player } from './player.js';
import { Environment } from './environment.js';
import { GameObjectFactory } from './gameObjectFactory.js';

export class Game3D {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.scene = new THREE.Scene();
        // OPRAVA: Zvětšení "dohledu" kamery, aby podlaha nezmizela
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.gameObjectFactory = new GameObjectFactory();
        this.activeGameObjects = [];
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        this.setupWorld();

        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    setupWorld() {
        this.environment = new Environment();
        
        this.scene.add(this.environment.tunnel);
        this.scene.add(this.environment.tunnelWireframe);
        this.scene.add(this.environment.floor);
        this.scene.add(this.environment.dustParticles);
        this.scene.add(this.environment.lightRings);

        this.player = new Player();
        this.scene.add(this.player.mesh);
        
        this.ambientLight = new THREE.AmbientLight(0x404040, 2);
        this.scene.add(this.ambientLight);
        
        this.pointLight = new THREE.PointLight(0xffffff, 1, 100);
        this.scene.add(this.pointLight);

        // OPRAVA: Posunutí mlhy dál, aby neodřezávala podlahu
        this.scene.fog = new THREE.Fog(0x000000, 10, 60);
        this.environment.setZone('aurora', this.scene, this.ambientLight);

        this.camera.position.set(0, 1.5, 5);
        this.camera.lookAt(this.player.mesh.position);
    }

    update(delta, gameLogic) {
        const moveZ = gameLogic.speed * delta;
        
        this.player.update(delta, gameLogic);
        this.environment.update(moveZ, this.player.mesh.position, this.gameCore.totalTime);

        this.camera.position.z = this.player.mesh.position.z + 5;
        this.pointLight.position.copy(this.player.mesh.position).y += 2;

        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    startIntroAnimation(callback) {
        const startPos = new THREE.Vector3(0, 5, 10);
        const endPos = new THREE.Vector3(0, 1.5, 5);
        let t = 0;
        const duration = 1.5;

        const animate = () => {
            t += 0.016 / duration; 
            if (t > 1) {
                t = 1;
                this.camera.position.copy(endPos);
                this.camera.lookAt(this.player.mesh.position);
                callback();
                return;
            }
            
            this.camera.position.lerpVectors(startPos, endPos, t * t * (3 - 2 * t)); // Smoothstep
            this.camera.lookAt(this.player.mesh.position);
            
            this.renderer.render(this.scene, this.camera);
            requestAnimationFrame(animate);
        }
        animate();
    }
}

